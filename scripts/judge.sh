#!/usr/bin/env bash
# shellcheck shell=bash
# Build a review prompt from the REAL diff and send it to the judge model.
# Usage:
#   ./scripts/judge.sh                 # working tree vs HEAD (incl. staged)
#   ./scripts/judge.sh --staged        # staged only
#   ./scripts/judge.sh --range A..B    # commit range
# Writes .judge/prompt-<ts>.md and .judge/review-<ts>.md
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

MODE="worktree"; RANGE=""
case "${1:-}" in
  --range) RANGE="${2:?need A..B}"; MODE="range" ;;
  --staged) MODE="staged" ;;
  "") ;;
  *) echo "usage: $0 [--range A..B | --staged]" >&2; exit 2 ;;
esac

TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p .judge
PROMPT=".judge/prompt-$TS.md"
REVIEW=".judge/review-$TS.md"
ERRLOG=".judge/err-$TS.log"
FILE_CAP="${JUDGE_FILE_CAP:-400}"

case "$MODE" in
  range)  DIFF="$(git diff "$RANGE")";    STAT="$(git diff --stat "$RANGE")";    DESC="$RANGE" ;;
  staged) DIFF="$(git diff --cached)";    STAT="$(git diff --cached --stat)";    DESC="staged changes" ;;
  *)      DIFF="$(git diff HEAD)";        STAT="$(git diff HEAD --stat)";        DESC="working tree vs HEAD" ;;
esac

if [ -z "$DIFF" ]; then
  echo "judge: empty diff ($DESC) - nothing to review" >&2
  exit 2
fi

case "$MODE" in
  range)  NS="$(git diff --name-status "$RANGE")" ;;
  staged) NS="$(git diff --cached --name-status)" ;;
  *)      NS="$(git diff HEAD --name-status)" ;;
esac
# name-status rows: "M\tpath" or "R100\told\tnew" or "D\tpath"
FILES="$(printf '%s\n' "$NS" | awk -F'\t' '{ if ($1 ~ /^R/) print $3; else if (NF >= 2) print $2 }' | sort -u)"

{
  printf 'You are the Reviewer. Inspection only: do not edit, execute, or assume.\n'
  printf 'Follow the operating rules in src/ai/REVIEWER_OPERATING_RULES.md.\n\n'
  printf 'Repo: %s\n' "$(pwd)"
  printf 'Scope: %s\n\n' "$DESC"

  # Commit message section
  case "$MODE" in
    range)
      printf 'Commit message(s) for the range:\n'
      COMMIT_MSGS=$(git log --format='%nSubject: %s%nBody:%n%b' "$RANGE" 2>/dev/null || true)
      if [ -n "$COMMIT_MSGS" ]; then
        printf '%s\n\n' "$COMMIT_MSGS"
      else
        printf '(no commits in range or error retrieving commit messages)\n\n'
      fi
      ;;
    *)
      # worktree or staged mode: no commit exists yet
      printf 'Commit message: not available in %s mode.\n\n' "$DESC"
      ;;
  esac

  # PR body section. Every failure path below is non-fatal: the prompt is
  # still built and the review still runs. The branch is resolved explicitly
  # and passed to gh, because gh's implicit current-branch resolution is wrong
  # on this machine (it reports "no pull requests found for branch \"main\""
  # even when the current branch is not main).
  PR_STATUS=""
  PR_BODY=""
  PR_BRANCH=""
  if ! command -v gh >/dev/null 2>&1; then
    PR_STATUS="gh CLI not available"
  elif ! git remote -v 2>/dev/null | grep -qi github; then
    PR_STATUS="no GitHub remote configured"
  else
    PR_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
    if [ -z "$PR_BRANCH" ]; then
      PR_STATUS="detached HEAD, no current branch"
    elif ! timeout 1 true >/dev/null 2>&1; then
      PR_STATUS="timeout command not available or unsupported"
    else
      # gh writes "no pull requests found for branch" to stderr and exits 1.
      # That is the normal no-PR case, not a gh failure, so capture stderr and
      # decide the reason from the message before looking at the exit status.
      GH_ERR_FILE=".judge/gh-err-$TS.log"
      PR_BODY_RAW="$(timeout 15 gh pr view "$PR_BRANCH" --json body -q .body 2>"$GH_ERR_FILE")"
      GH_RC=$?
      GH_ERR="$(tr '\n\r' '  ' < "$GH_ERR_FILE" 2>/dev/null || true)"
      rm -f "$GH_ERR_FILE" 2>/dev/null || true
      if printf '%s' "$GH_ERR" | grep -qi 'no pull request'; then
        PR_STATUS="no PR for branch $PR_BRANCH"
      elif [ "$GH_RC" -ne 0 ]; then
        if [ -n "$GH_ERR" ]; then
          PR_STATUS="gh call failed or timed out (exit $GH_RC): $GH_ERR"
        else
          PR_STATUS="gh call failed or timed out (exit $GH_RC)"
        fi
      elif [ -z "$PR_BODY_RAW" ]; then
        PR_STATUS="PR body is empty for branch $PR_BRANCH"
      else
        PR_BODY="$PR_BODY_RAW"
        PR_STATUS="ok"
      fi
    fi
  fi
  if [ "$PR_STATUS" = "ok" ]; then
    printf 'PR body (branch %s):\n````\n%s\n````\n\n' "$PR_BRANCH" "$PR_BODY"
  else
    printf 'PR body: not available (%s).\n\n' "$PR_STATUS"
  fi

  printf 'The diff below is the complete change under review. The files on disk are the\n'
  printf 'authority: read them in full before answering. Do not trust the diff alone.\n\n'
  printf 'Files touched:\n%s\n\n' "$FILES"
  printf 'Full contents of touched files (cap: %s lines per file). Deleted files are\n' "$FILE_CAP"
  printf 'listed as (deleted) with no contents. A file longer than the cap is marked\n'
  printf '[truncated] and the Judge must treat questions about the omitted part as\n'
  printf 'UNVERIFIED.\n\n'
  printf '%s\n' "$NS" | while IFS=$'\t' read -r st p1 p2; do
    case "$st" in
      D*) printf '### FILE: %s (deleted)\n\n' "$p1" ;;
      R*) fp="$p2" ;;
      *)  fp="$p1" ;;
    esac
    case "$st" in
      D*) : ;;
      *)
        if [ -f "$fp" ]; then
          n=$(wc -l < "$fp")
          printf '### FILE: %s (%s lines)\n```\n' "$fp" "$n"
          if [ "$n" -gt "$FILE_CAP" ]; then
            head -n "$FILE_CAP" "$fp"
            printf '```\n[truncated: file > %s lines; showing first %s of %s]\n\n' "$FILE_CAP" "$FILE_CAP" "$n"
          else
            cat "$fp"
            printf '```\n\n'
          fi
        else
          printf '### FILE: %s (missing on disk)\n\n' "$fp"
        fi
        ;;
    esac
  done
  printf 'Answer these, narrowly. Label each CONFIRMED-BY-READING / UNVERIFIED / DISPROVEN\n'
  printf 'and cite line numbers.\n\n'
  printf '1. Does the diff do what it claims, and only that? Name any unrelated edit,\n'
  printf '   reformatting, or scope creep.\n'
  printf '2. Will it typecheck? Name any type mismatch visible in the text.\n'
  printf '3. Are assertions, testids and selectors still correct, and unchanged where\n'
  printf '   they should be? Any assertion silently narrowed or weakened?\n'
  printf '4. Any dead code introduced? Any public API added with no call site? Any helper\n'
  printf '   duplicating an existing one?\n'
  printf '5. Is there any claim in the commit message, comment or PR body that the code\n'
  printf '   does not support?\n'
  printf '6. What is the single most likely way this change fails? Name the falsifying case.\n\n'
  printf 'Do not claim tests pass. Do not propose edits. If a question cannot be answered\n'
  printf 'from the files, say UNVERIFIED rather than inferring.\n\n'
  printf '```diff\n'
  printf '%s\n' "$DIFF"
  printf '```\n'
} > "$PROMPT"

printf 'judge: scope %s\n' "$DESC"
printf 'judge: %s\n' "$STAT"
printf 'judge: prompt %s\n' "$PROMPT"

# Capture stdout in a variable and stderr in the err file so that neither
# review-*.md nor err-*.log is left behind unless it has real content. The
# err file is removed when empty; the review file is written only when the
# model call succeeded and produced text.
REVIEW_TEXT="$(node scripts/judge.mjs "$PROMPT" 2>"$ERRLOG")"
RC=$?
if [ ! -s "$ERRLOG" ]; then
  rm -f "$ERRLOG"
fi
if [ "$RC" -ne 0 ]; then
  if [ -s "$ERRLOG" ]; then
    printf 'judge: model call failed (exit %s); see %s\n' "$RC" "$ERRLOG" >&2
    cat "$ERRLOG" >&2
  else
    printf 'judge: model call failed (exit %s)\n' "$RC" >&2
  fi
  exit "$RC"
fi
if [ -z "$REVIEW_TEXT" ]; then
  printf 'judge: model call returned no review text; no review file written\n' >&2
  exit 1
fi
printf '%s\n' "$REVIEW_TEXT" > "$REVIEW"
printf 'judge: review %s\n\n' "$REVIEW"
printf '%s\n' "$REVIEW_TEXT"
