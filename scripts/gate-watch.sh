#!/usr/bin/env bash
# Wait for a GitHub run to finish, then report PASS/FAIL. Never guesses.
# usage: ./scripts/gate-watch.sh [run-id] [timeout-seconds]
# With no run-id, watches the latest run on main. The timeout can only be
# set when a run-id is also given (it is the second positional argument).
set -uo pipefail
ID="${1:-$(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId')}"
LIMIT="${2:-900}"
START="$(date +%s)"

while :; do
  LINE="$(gh run view "$ID" --json status,conclusion,headSha -q '[.status, .conclusion, .headSha[0:8]] | @tsv' 2> /dev/null)"
  STATUS=""; CONCL=""; SHA=""
  IFS=$'\t' read -r STATUS CONCL SHA <<< "$LINE"
  printf '%s  %-12s %-10s %s\n' "$(date +%H:%M:%S)" "${STATUS:-unknown}" "${CONCL:-}" "$SHA"

  if [ "$STATUS" = "completed" ]; then
    if [ "$CONCL" = "success" ]; then
      echo "GATE: PASS"
      exit 0
    fi
    echo "GATE: FAIL (${CONCL:-no conclusion})"
    echo "next: gh api /repos/{owner}/{repo}/actions/runs/$ID/logs > /tmp/run-$ID.zip && unzip -l /tmp/run-$ID.zip"
    exit 1
  fi

  NOW="$(date +%s)"
  if [ $((NOW - START)) -ge "$LIMIT" ]; then
    echo "GATE: TIMEOUT after ${LIMIT}s (still $STATUS)"
    exit 3
  fi
  sleep 15
done
