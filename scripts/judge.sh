#!/usr/bin/env bash
# shellcheck shell=bash
# Build a review prompt from the REAL diff and send it to the judge model.
# Usage:
#   ./scripts/judge.sh                 # working tree vs HEAD (incl. staged)
#   ./scripts/judge.sh --staged        # staged only
#   ./scripts/judge.sh --range A..B    # commit range
# Writes .judge/prompt-<ts>-<n>.md and .judge/review-<ts>.md
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
CONTEXT=".judge/context-$TS.md"
REVIEW=".judge/review-$TS.md"
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
  printf 'Repo: %s\n' "$(pwd)"
  printf 'Scope: %s\n\n' "$DESC"

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
  printf '```diff\n'
  printf '%s\n' "$DIFF"
  printf '```\n'
} > "$CONTEXT"

printf 'judge: scope %s\n' "$DESC"
printf 'judge: %s\n' "$STAT"
printf 'judge: context %s\n' "$CONTEXT"

# Four questions, one per model call. Each prompt is the shared context plus
# the question. The typecheck and commit-message questions are intentionally
# not asked.
Q1='Answer this question narrowly. Label your answer CONFIRMED-BY-READING / UNVERIFIED / DISPROVEN
and cite line numbers.

1. Does the diff do what it claims, and only that? Name any unrelated edit,
   reformatting, or scope creep.

Do not claim tests pass. Do not propose edits. If the question cannot be answered
from the files, say UNVERIFIED rather than inferring.
Return only the labelled answer — no XML tags, no wrapper elements.'

Q2='Answer this question narrowly. Label your answer CONFIRMED-BY-READING / UNVERIFIED / DISPROVEN
and cite line numbers.

2. Are assertions, testids and selectors still correct, and unchanged where
   they should be? Any assertion silently narrowed or weakened?

Do not claim tests pass. Do not propose edits. If the question cannot be answered
from the files, say UNVERIFIED rather than inferring.
Return only the labelled answer — no XML tags, no wrapper elements.'

Q3='Answer this question narrowly. Label your answer CONFIRMED-BY-READING / UNVERIFIED / DISPROVEN
and cite line numbers.

3. Any dead code introduced? Any public API added with no call site? Any helper
   duplicating an existing one?

Do not claim tests pass. Do not propose edits. If the question cannot be answered
from the files, say UNVERIFIED rather than inferring.
Return only the labelled answer — no XML tags, no wrapper elements.'

Q4='Answer this question narrowly. Label your answer CONFIRMED-BY-READING / UNVERIFIED / DISPROVEN
and cite line numbers.

4. What is the single most likely way this change fails? Name the falsifying case.

Do not claim tests pass. Do not propose edits. If the question cannot be answered
from the files, say UNVERIFIED rather than inferring.
Return only the labelled answer — no XML tags, no wrapper elements.'

SECTIONS=()
i=0
for q in "$Q1" "$Q2" "$Q3" "$Q4"; do
  i=$((i + 1))
  PF=".judge/prompt-$TS-$i.md"
  EF=".judge/err-$TS-q$i.log"
  { cat "$CONTEXT"; printf '\n%s\n' "$q"; } > "$PF"
  printf 'judge: prompt %s\n' "$PF"
  OUT="$(node scripts/judge.mjs "$PF" --section 2>"$EF")"
  RC=$?
  if [ "$RC" -ne 0 ]; then
    printf 'judge: section %s call failed (exit %s)\n' "$i" "$RC" >&2
    if [ -s "$EF" ]; then cat "$EF" >&2; fi
    exit "$RC"
  fi
  if [ ! -s "$EF" ]; then rm -f "$EF"; fi
  # Per-section check: the answer must be non-empty and at least 20 chars
  # after trimming, and must carry one of the required verdict labels. A blank,
  # stub, or unlabeled answer means the section is unusable, so stop before
  # assembling or writing anything.
  TRIMMED="$(printf '%s' "$OUT" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  if [ "${#TRIMMED}" -lt 20 ]; then
    printf 'judge: section %s output is empty or too short (%s chars after trim); no review file written\n' "$i" "${#TRIMMED}" >&2
    exit 1
  fi
  case "$TRIMMED" in
    *CONFIRMED-BY-READING*|*UNVERIFIED*|*DISPROVEN*) ;;
    *)
      printf 'judge: section %s output is missing a verdict label (CONFIRMED-BY-READING / UNVERIFIED / DISPROVEN); no review file written\n' "$i" >&2
      exit 1
      ;;
  esac
  SECTIONS+=("$OUT")
done

REVIEW_TEXT="$(printf '## 1.\n\n%s\n\n## 2.\n\n%s\n\n## 3.\n\n%s\n\n## 4.\n\n%s\n' \
  "${SECTIONS[0]}" "${SECTIONS[1]}" "${SECTIONS[2]}" "${SECTIONS[3]}")"

# Validate the assembled review exactly once, before writing anything. The
# floor is 100 chars: four sections that each passed the per-section check
# (>=20 chars each) can never be rejected here.
if [ "${#REVIEW_TEXT}" -lt 100 ]; then
  printf 'judge: assembled review is too short (%s chars); no review file written\n' "${#REVIEW_TEXT}" >&2
  exit 1
fi
for m in '## 1.' '## 2.' '## 3.' '## 4.'; do
  case "$REVIEW_TEXT" in
    *"$m"*) ;;
    *)
      printf 'judge: assembled review is missing heading %s; no review file written\n' "$m" >&2
      exit 1
      ;;
  esac
done

printf '%s\n' "$REVIEW_TEXT" > "$REVIEW"
printf 'judge: review %s\n\n' "$REVIEW"
printf '%s\n' "$REVIEW_TEXT"
