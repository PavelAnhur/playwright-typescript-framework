#!/usr/bin/env bash
# Finish a task after merge: verify, watch gate, cleanup.
# ASCII only on purpose: no em-dashes, no smart quotes.
# Usage:
#   ./scripts/finish-task.sh <pr-number>
#   pr-number must be a positive integer.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

usage() {
  printf 'Usage: %s <pr-number>\n' "$0" >&2
  printf 'pr-number must be a positive integer.\n' >&2
}

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

if [ "$#" -ne 1 ]; then
  usage
  exit 1
fi

PR="$1"
case "$PR" in
  ''|*[!0-9]*)
    usage
    exit 1
    ;;
esac
if [ "$PR" -le 0 ]; then
  usage
  exit 1
fi

HEAD_Q='[.headRefOid, .headRefName] | @tsv'
PR_INFO_LINE="$(gh pr view "$PR" --json headRefOid,headRefName -q "$HEAD_Q" 2>/dev/null)"
IFS=$'\t' read -r HEAD_SHA HEAD_REF <<< "$PR_INFO_LINE"

if [ -z "$HEAD_SHA" ]; then
  die "Could not read PR head SHA (empty gh output)"
fi
if [ -z "$HEAD_REF" ]; then
  die "Could not read PR head ref (empty gh output)"
fi

case "$HEAD_SHA" in
  ''|*[!0-9a-fA-F]*)
    die "PR head SHA is not hexadecimal"
    ;;
esac

gh pr merge "$PR" --merge --admin || true

STATE_Q='[.state, .mergeCommit.oid // ""] | @tsv'
STATE_LINE="$(gh pr view "$PR" --json state,mergeCommit -q "$STATE_Q" 2>/dev/null)"
FALLBACK_LINE=""
STATE=""
MERGE_SHA=""

if [ -n "$STATE_LINE" ]; then
  IFS=$'\t' read -r STATE MERGE_SHA <<< "$STATE_LINE"
else
  FALLBACK_Q=".[] | select(.number == $PR) | [.state, .mergeCommit.oid // \"\"] | @tsv"
  FALLBACK_LINE="$(gh pr list --head "$HEAD_REF" --state all --json number,state,mergeCommit --jq "$FALLBACK_Q" 2>&1)"
  if [ -z "$FALLBACK_LINE" ]; then
    die "Could not verify PR state (empty fallback output)"
  fi
  IFS=$'\t' read -r STATE MERGE_SHA <<< "$FALLBACK_LINE"
fi

if [ "$STATE" != "MERGED" ] || [ -z "$MERGE_SHA" ]; then
  printf 'PR view output: %s\n' "$STATE_LINE" >&2
  printf 'Fallback output: %s\n' "$FALLBACK_LINE" >&2
  die "PR not merged or merge commit missing"
fi

case "$MERGE_SHA" in
  ''|*[!0-9a-fA-F]*)
    die "Merge commit SHA is not hexadecimal"
    ;;
esac

RUN_Q=".[] | select(.headSha == \"$MERGE_SHA\") | [.databaseId, .status, .conclusion] | @tsv"
RUN_LIST_OUT=""
RUN_RC=0
ATTEMPT=0
START_TS=$(date +%s)
DEADLINE=$((START_TS + 60))
while :; do
  ATTEMPT=$((ATTEMPT + 1))
  RUN_LIST_OUT="$(gh run list --branch main --limit 100 --json databaseId,headSha,status,conclusion --jq "$RUN_Q" 2>&1)"
  RUN_RC=$?
  if [ "$RUN_RC" -ne 0 ]; then
    printf 'Run list output:\n%s\n' "$RUN_LIST_OUT" >&2
    die "gh run list failed for merge commit $MERGE_SHA"
  fi
  if [ -n "$RUN_LIST_OUT" ]; then
    break
  fi
  printf 'Waiting for gate run for merge commit %s (attempt %s)\n' "$MERGE_SHA" "$ATTEMPT" >&2
  NOW=$(date +%s)
  if [ "$NOW" -ge "$DEADLINE" ]; then
    break
  fi
  sleep 5
done

if [ -z "$RUN_LIST_OUT" ]; then
  printf 'Run list output:\n%s\n' "$RUN_LIST_OUT" >&2
  die "No gate run found for merge commit $MERGE_SHA yet"
fi

IFS=$'\t' read -r RUN_ID RUN_STATUS RUN_CONCLUSION <<< "$RUN_LIST_OUT"
case "$RUN_ID" in
  ''|*[!0-9]*)
    printf 'Run list output:\n%s\n' "$RUN_LIST_OUT" >&2
    die "Gate run id is not an integer"
    ;;
esac

./scripts/gate-watch.sh "$RUN_ID"
GATE_RC=$?
if [ "$GATE_RC" -ne 0 ]; then
  printf 'ERROR: gate-watch.sh failed for run %s (exit %s). Pull log with: gh run view %s --log\n' "$RUN_ID" "$GATE_RC" "$RUN_ID" >&2
  exit "$GATE_RC"
fi

if ! git switch main; then
  die "git switch main failed"
fi
if ! git pull; then
  die "git pull failed"
fi
if ! gh poi; then
  die "gh poi failed"
fi

printf '--- origin/main head ---\n'
git log --oneline -1 origin/main || true
printf '--- remote heads ---\n'
git ls-remote --heads origin | sed -E 's#.*refs/heads/##' || true
printf '--- git status ---\n'
git status -sb || true

printf 'PR %s merged at %s; run %s gate PASS; cleanup done.\n' "$PR" "$MERGE_SHA" "$RUN_ID"
exit 0
