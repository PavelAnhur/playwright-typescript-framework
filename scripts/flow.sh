#!/usr/bin/env bash
# One command per turn: gate first, then Judge review of the worktree vs HEAD
# (staged and unstaged); with --range the Judge reviews that commit range instead.
# Stops if the gate fails - a review of code that does not pass the gate is noise.
# Usage: ./scripts/flow.sh [--range A..B]
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

./scripts/verify.sh
GATE_RC=$?
if [ "$GATE_RC" -ne 0 ]; then
  echo "flow: gate FAILED (exit $GATE_RC) - not running the Judge"
  exit "$GATE_RC"
fi

echo "flow: gate passed - running the Judge"
if [ "$#" -gt 0 ]; then
  exec ./scripts/judge.sh "$@"
fi
exec ./scripts/judge.sh
