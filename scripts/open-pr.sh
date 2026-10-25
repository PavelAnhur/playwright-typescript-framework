#!/usr/bin/env bash
# shellcheck shell=bash
# Push the current branch and open a PR for committed changes.
# Usage:
#   ./scripts/open-pr.sh [--yes] [--intent "..."] [pr-title]
# Note: --yes is accepted for wrapper compatibility and has no effect.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

usage() {
  echo "usage: $0 [--yes] [--intent \"...\"] [pr-title]" >&2
}

die() {
  printf 'ai-commit-pr: %s\n' "$*" >&2
  exit 1
}

TMP_DIR=""
cleanup() {
  if [ -n "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR" 2>/dev/null || true
  fi
  return 0
}
trap cleanup EXIT

INTENT=""
PR_TITLE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --yes)
      shift
      ;;
    --intent)
      if [ $# -lt 2 ] || [[ "$2" == -* ]]; then
        usage
        die "missing value for --intent"
      fi
      INTENT="$2"
      shift 2
      ;;
    --intent=*)
      INTENT="${1#--intent=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      if [ $# -gt 0 ]; then
        if [ -n "$PR_TITLE" ]; then
          usage
          die "too many arguments"
        fi
        PR_TITLE="$1"
        shift
      fi
      break
      ;;
    *)
      if [ -n "$PR_TITLE" ]; then
        usage
        die "too many arguments"
      fi
      PR_TITLE="$1"
      shift
      ;;
  esac
done

if [ $# -gt 0 ]; then
  usage
  die "too many arguments"
fi

if ! command -v node >/dev/null 2>&1; then
  die "preflight failed: node is not available"
fi

if ! command -v gh >/dev/null 2>&1; then
  die "preflight failed: gh CLI is not available"
fi

BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
if [ -z "$BRANCH" ]; then
  die "preflight failed: detached HEAD"
fi

if [ "$BRANCH" = "main" ]; then
  die "preflight failed: refuse to run on main"
fi

if ! git fetch origin; then
  die "preflight failed: git fetch origin"
fi

if ! git merge-base --is-ancestor origin/main HEAD; then
  die "preflight failed: current branch does not contain origin/main"
fi

if ! gh auth status >/dev/null 2>&1; then
  die "preflight failed: gh is not authenticated"
fi

if ! git diff --cached --quiet; then
  die "preflight failed: worktree is not clean: staged changes present"
fi

# Option (b): require nothing staged, but only warn on unstaged changes.
if ! git diff --quiet; then
  printf 'ai-commit-pr: warning: unstaged changes present; PR will include only committed changes\n' >&2
fi

AHEAD_COUNT="$(git rev-list --count origin/main..HEAD 2>/dev/null)"
if [ -z "$AHEAD_COUNT" ]; then
  die "PR create step failed: cannot count commits ahead of origin/main"
fi

case "$AHEAD_COUNT" in
  ''|*[!0-9]*)
    die "PR create step failed: cannot count commits ahead of origin/main"
    ;;
esac

if [ "$AHEAD_COUNT" -eq 0 ]; then
  die "PR create step failed: branch has no commits ahead of origin/main"
fi

FIRST_SUBJECT="$(git log --reverse --format=%s origin/main..HEAD | head -n1)"
if [ -z "$PR_TITLE" ]; then
  PR_TITLE="$FIRST_SUBJECT"
fi

if [ -z "$PR_TITLE" ]; then
  die "PR create step failed: empty PR title"
fi

TMP_DIR="$(mktemp -d 2>/dev/null)" || die "preflight failed: cannot create temp dir"
BODY_FILE="$TMP_DIR/pr-body"
SUBJECTS_FILE="$TMP_DIR/subjects"
ERR_OUT="$TMP_DIR/err"

if ! git log --reverse --format='Commit: %s' origin/main..HEAD > "$SUBJECTS_FILE"; then
  die "PR create step failed: cannot list commit subjects"
fi

if [ ! -s "$SUBJECTS_FILE" ]; then
  die "PR create step failed: refusing to open PR with an empty body"
fi

CHANGED_NS="$(git diff --name-status origin/main...HEAD)"

{
  cat "$SUBJECTS_FILE"
  if [ -n "$INTENT" ]; then
    printf 'Intent: %s\n' "$INTENT"
  fi
  printf 'Commits ahead of origin/main: %s\n' "$AHEAD_COUNT"
  printf '\nChanged files:\n%s\n' "$CHANGED_NS"
} > "$BODY_FILE"

# Reachable if the write to BODY_FILE fails.
if [ ! -s "$BODY_FILE" ]; then
  die "PR create step failed: refusing to open PR with an empty body"
fi

if ! git push -u origin "$BRANCH"; then
  die "push step failed"
fi

PR_CREATE_ARGS=(--base main --head "$BRANCH" --title "$PR_TITLE" --body-file "$BODY_FILE")

if ! PR_OUT="$(gh pr create "${PR_CREATE_ARGS[@]}" 2>"$ERR_OUT")"; then
  printf 'ai-commit-pr: gh pr create failed\n' >&2
  cat "$ERR_OUT" >&2
  die "PR create step failed"
fi

PR_URL="$(printf '%s\n' "$PR_OUT" | grep -Eo 'https://github\.com/[^[:space:]]+/pull/[0-9]+' | head -n1)"
if [ -z "$PR_URL" ]; then
  PR_NUM=""
  PR_LIST_ATTEMPTS=12
  PR_LIST_SLEEP_SECONDS=5
  PR_ATTEMPT=1

  while :; do
    if ! PR_LIST_JSON="$(gh pr list --head "$BRANCH" --json number,url 2>"$ERR_OUT")"; then
      printf 'ai-commit-pr: gh pr create output:\n%s\n' "$PR_OUT" >&2
      cat "$ERR_OUT" >&2
      die "PR create step failed: could not list PRs for branch $BRANCH"
    fi

    # node exit contract: 0 exactly one PR, 1 parse/shape error, 2 wrong count.
    PR_RECOVERED="$(printf '%s' "$PR_LIST_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const a=JSON.parse(d);if(!Array.isArray(a))process.exit(1);if(a.length!==1){console.log(a.length);process.exit(2);}console.log(a[0].number);console.log(a[0].url);}catch(e){process.exit(1);}});')"
    PR_RECOVER_RC=$?

    if [ "$PR_RECOVER_RC" -eq 0 ]; then
      PR_NUM="$(printf '%s\n' "$PR_RECOVERED" | head -n1)"
      PR_URL="$(printf '%s\n' "$PR_RECOVERED" | tail -n1)"
      if [ -z "$PR_NUM" ] || [ -z "$PR_URL" ]; then
        printf 'ai-commit-pr: gh pr create output:\n%s\n' "$PR_OUT" >&2
        printf 'ai-commit-pr: gh pr list output:\n%s\n' "$PR_LIST_JSON" >&2
        die "PR create step failed: could not recover PR number for branch $BRANCH"
      fi
      case "$PR_NUM" in
        ''|*[!0-9]*)
          printf 'ai-commit-pr: gh pr create output:\n%s\n' "$PR_OUT" >&2
          printf 'ai-commit-pr: gh pr list output:\n%s\n' "$PR_LIST_JSON" >&2
          die "PR create step failed: recovered PR number is not numeric for branch $BRANCH"
          ;;
      esac
      break
    elif [ "$PR_RECOVER_RC" -eq 2 ]; then
      PR_COUNT="$PR_RECOVERED"
      case "$PR_COUNT" in
        ''|*[!0-9]*)
          printf 'ai-commit-pr: gh pr create output:\n%s\n' "$PR_OUT" >&2
          printf 'ai-commit-pr: gh pr list output:\n%s\n' "$PR_LIST_JSON" >&2
          die "PR create step failed: could not parse PR list for branch $BRANCH"
          ;;
      esac

      if [ "$PR_COUNT" -eq 0 ]; then
        printf 'ai-commit-pr: zero PRs listed for branch %s (attempt %s/%s)\n' "$BRANCH" "$PR_ATTEMPT" "$PR_LIST_ATTEMPTS" >&2
        if [ "$PR_ATTEMPT" -ge "$PR_LIST_ATTEMPTS" ]; then
          printf 'ai-commit-pr: gh pr create output:\n%s\n' "$PR_OUT" >&2
          die "PR create step failed: zero PRs found for branch $BRANCH"
        fi
        sleep "$PR_LIST_SLEEP_SECONDS"
        PR_ATTEMPT=$((PR_ATTEMPT + 1))
        continue
      fi

      printf 'ai-commit-pr: gh pr create output:\n%s\n' "$PR_OUT" >&2
      die "PR create step failed: $PR_COUNT PRs found for branch $BRANCH"
    else
      printf 'ai-commit-pr: gh pr create output:\n%s\n' "$PR_OUT" >&2
      printf 'ai-commit-pr: gh pr list output:\n%s\n' "$PR_LIST_JSON" >&2
      die "PR create step failed: could not parse PR list for branch $BRANCH"
    fi
  done
else
  PR_NUM="${PR_URL##*/}"
fi

if [ -z "$PR_NUM" ]; then
  die "PR create step failed: could not determine PR number"
fi

case "$PR_NUM" in
  ''|*[!0-9]*)
    die "PR create step failed: PR number is not numeric"
    ;;
esac

if ! PR_BODY="$(gh pr view "$PR_NUM" --json body -q .body 2>"$ERR_OUT")"; then
  printf 'ai-commit-pr: gh pr view failed\n' >&2
  cat "$ERR_OUT" >&2
  die "PR body read step failed"
fi

printf 'PR URL: %s\n' "$PR_URL"
printf 'PR body:\n%s\n' "$PR_BODY"
