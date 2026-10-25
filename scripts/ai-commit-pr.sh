#!/usr/bin/env bash
# shellcheck shell=bash
# Thin wrapper: commit staged changes, then push and open a PR.
# Usage:
#   ./scripts/ai-commit-pr.sh [--yes] [--intent "..."] [pr-title]
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

# Arguments are passed through to commit.sh and open-pr.sh.
scripts/commit.sh "$@" || exit $?
exec scripts/open-pr.sh "$@"
