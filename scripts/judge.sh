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

node scripts/judge.mjs "$PROMPT" > "$REVIEW" 2> "$ERRLOG"
RC=$?
if [ "$RC" -ne 0 ]; then
  printf 'judge: model call failed (exit %s); see %s\n' "$RC" "$ERRLOG" >&2
  cat "$ERRLOG" >&2
  exit "$RC"
fi
printf 'judge: review %s\n\n' "$REVIEW"
cat "$REVIEW"
