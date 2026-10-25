#!/usr/bin/env bash
# shellcheck shell=bash
# Generate a Conventional Commit message from staged changes and commit only.
# Usage:
#   ./scripts/commit.sh [--yes] [--intent "..."] [pr-title]
# Note: pr-title is accepted for ai-commit-pr.sh compatibility and ignored.
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

YES=0
INTENT=""
IGNORED_TITLE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --yes)
      YES=1
      shift
      ;;
    --intent)
      if [ $# -lt 2 ]; then
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
        IGNORED_TITLE="$1"
        shift
      fi
      ;;
    *)
      if [ -n "$IGNORED_TITLE" ]; then
        usage
        die "too many arguments"
      fi
      IGNORED_TITLE="$1"
      shift
      ;;
  esac
done

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

STAGED_NS="$(git diff --cached --name-status)"
if [ -z "$STAGED_NS" ]; then
  die "preflight failed: nothing is staged"
fi

if ! gh auth status >/dev/null 2>&1; then
  die "preflight failed: gh is not authenticated"
fi

DIFF="$(git diff --cached)"

TMP_DIR="$(mktemp -d 2>/dev/null)" || die "preflight failed: cannot create temp dir"
PROMPT="$TMP_DIR/prompt"
MSG_OUT="$TMP_DIR/msg"
ERR_OUT="$TMP_DIR/err"
FILE_CAP="${COMMIT_FILE_CAP:-20000}"

{
  printf 'You are a commit message generator.\n'
  printf 'Infer the developer intent from the staged diff and the staged contents of every staged file.\n'
  if [ -n "$INTENT" ]; then
    printf 'Developer stated intent: %s\n' "$INTENT"
  fi
  printf 'Choose the Conventional Commit type that fits.\n'
  printf 'Output one line only, in the form type(scope): subject, imperative, <= 72 chars, no body, no quotes, no code fences.\n\n'
  printf 'Staged name-status:\n%s\n\n' "$STAGED_NS"
  printf 'Staged diff:\n```diff\n%s\n```\n\n' "$DIFF"
  printf 'Staged contents of files (cap: %s bytes per file). Files longer than the cap are truncated and marked [truncated].\n' "$FILE_CAP"

  printf '%s\n' "$STAGED_NS" | while IFS=$'\t' read -r st p1 p2; do
    fp=""
    case "$st" in
      D*)
        printf '### FILE: %s (deleted)\n\n' "$p1"
        ;;
      R*|C*)
        fp="$p2"
        ;;
      *)
        fp="$p1"
        ;;
    esac

    case "$st" in
      D*)
        :
        ;;
      *)
        if size=$(git cat-file -s ":$fp" 2>/dev/null); then
          size=${size//[[:space:]]/}
          printf '### FILE: %s (%s bytes)\n````\n' "$fp" "$size"
          if [ "$size" -gt "$FILE_CAP" ]; then
            git show ":$fp" | head -c "$FILE_CAP"
            printf '\n````\n[truncated: file > %s bytes; showing first %s of %s bytes]\n\n' "$FILE_CAP" "$FILE_CAP" "$size"
          else
            git show ":$fp"
            printf '\n````\n\n'
          fi
        else
          printf '### FILE: %s (missing from index)\n\n' "$fp"
        fi
        ;;
    esac
  done
} > "$PROMPT"

if ! node scripts/commit-msg.mjs < "$PROMPT" > "$MSG_OUT" 2>"$ERR_OUT"; then
  printf 'ai-commit-pr: commit message generation failed\n' >&2
  cat "$ERR_OUT" >&2
  die "commit message generation step failed"
fi

RAW_MSG="$(cat "$MSG_OUT")"
MSG="$(printf '%s\n' "$RAW_MSG" | awk 'NF { sub(/^[[:space:]]+/, ""); sub(/[[:space:]]+$/, ""); print; exit }')"

CC_RE='^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .+$'

if [[ ! "$MSG" =~ $CC_RE ]]; then
  printf 'ai-commit-pr: model message failed validation:\n%s\n' "$MSG" >&2

  if [ "$YES" -eq 1 ]; then
    die "commit message validation step failed"
  fi

  printf 'Enter replacement commit message (empty to abort): ' >&2
  read -r MSG
  MSG="$(printf '%s\n' "$MSG" | sed -e 's/\r$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  if [ -z "$MSG" ]; then
    die "aborted: empty replacement message"
  fi

  if [[ ! "$MSG" =~ $CC_RE ]]; then
    die "commit message validation step failed: replacement message is invalid"
  fi
fi

printf 'ai-commit-pr: staged files:\n%s\n' "$STAGED_NS"
printf 'ai-commit-pr: proposed commit message:\n%s\n' "$MSG"

if [ "$YES" -ne 1 ]; then
  printf 'Proceed? [y/N] '
  read -r ANSWER
  if [ "$ANSWER" != "y" ]; then
    die "aborted by user"
  fi
fi

CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  die "commit aborted: branch changed from $BRANCH to ${CURRENT_BRANCH:-detached HEAD}"
fi

if [ -z "$(git diff --cached --name-status)" ]; then
  die "commit aborted: nothing is staged"
fi

if ! git commit -m "$MSG"; then
  die "commit step failed"
fi
