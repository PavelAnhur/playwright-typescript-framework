#!/usr/bin/env bash
# Start a task branch from main or continue an existing task branch.
# ASCII only on purpose: no em-dashes, no smart quotes.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

VALID_PREFIXES="feat fix docs chore test refactor perf build ci"

usage() {
  printf 'Usage: %s <branch>\n' "$0" >&2
  printf 'Branch prefix must be one of: %s\n' "$VALID_PREFIXES" >&2
  printf 'Example: docs/backlog-audit-split\n' >&2
}

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

print_summary() {
  local branch log status
  branch="$(git branch --show-current)"
  log="$(git log --oneline -1)"
  status="$(git status --short | tr '\n' ' ')"
  printf 'branch: %s\n' "$branch"
  printf 'log: %s\n' "$log"
  printf 'status: %s\n' "${status% }"
}

finish_success() {
  local branch
  print_summary
  branch="$(git branch --show-current)"
  if [ "$branch" = "main" ]; then
    die "still on main after branch switch"
  fi
  exit 0
}

if [ "$#" -ne 1 ]; then
  usage
  exit 1
fi

BRANCH="$1"
PREFIX="${BRANCH%%/*}"

case "$PREFIX" in
  feat|fix|docs|chore|test|refactor|perf|build|ci)
    ;;
  *)
    usage
    exit 1
    ;;
esac

if [ "$BRANCH" = "$PREFIX" ] || [ "$BRANCH" = "$PREFIX/" ]; then
  usage
  exit 1
fi

if ! git fetch origin; then
  die "git fetch origin failed"
fi

CURRENT_BRANCH="$(git branch --show-current)"

if [ -z "$CURRENT_BRANCH" ]; then
  die "Detached HEAD is not supported; run from main or an existing task branch"
fi

if [ "$CURRENT_BRANCH" = "$BRANCH" ]; then
  finish_success
fi

if [ "$CURRENT_BRANCH" != "main" ]; then
  die "Must start from main or the existing task branch; currently on $CURRENT_BRANCH"
fi

DIRTY_STATUS="$(git status --porcelain | sort)"

if [ -n "$DIRTY_STATUS" ]; then
  SWITCH_OUT="$(git switch -c "$BRANCH" origin/main 2>&1)"
  SWITCH_RC=$?
  if [ "$SWITCH_RC" -ne 0 ]; then
    printf '%s\n' "$SWITCH_OUT" >&2
    die "git switch failed; no changes were forced"
  fi

  NEW_BRANCH="$(git branch --show-current)"
  if [ "$NEW_BRANCH" != "$BRANCH" ]; then
    die "git switch did not change branch to $BRANCH"
  fi

  AFTER_DIRTY="$(git status --porcelain | sort)"
  if [ "$AFTER_DIRTY" != "$DIRTY_STATUS" ]; then
    printf 'Before:\n%s\nAfter:\n%s\n' "$DIRTY_STATUS" "$AFTER_DIRTY" >&2
    die "dirty files were not carried onto the new branch"
  fi
else
  if ! git switch -c "$BRANCH" origin/main; then
    die "git switch failed; no changes were forced"
  fi
fi

finish_success
