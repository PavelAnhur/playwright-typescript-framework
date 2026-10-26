#!/usr/bin/env bash
# shellcheck shell=bash
#
# land-task.sh - land an already-reviewed, already-staged task.
#
# Chains the three existing scripts and streams every child's output:
#   1. commit.sh      - commit the staged changes
#   2. open-pr.sh     - push the branch and open a PR
#   3. finish-task.sh - merge, watch the gate, clean up
#
# This script automates mechanics and readback only. It does NOT judge the
# diff, the scope, or the review.
#
# usage: ./scripts/land-task.sh [--yes] [--intent "..."] [pr-title]
#
# All arguments are passed through to commit.sh and open-pr.sh.

set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

die() {
  echo "land-task: $*" >&2
  exit 1
}

# --- state markers (set only after a step's verification passes) ------------
S_COMMIT="[--]"
S_PR="[--]"
S_MERGE="[--]"

COMMIT_DETAIL="-"
PR_DETAIL="-"
MERGE_DETAIL="-"
PR_NUMBER=""

PR_LOG=""
MERGE_LOG=""

cleanup() {
  if [ -n "$PR_LOG" ]; then rm -f "$PR_LOG"; fi
  if [ -n "$MERGE_LOG" ]; then rm -f "$MERGE_LOG"; fi
}
trap cleanup EXIT

print_summary() {
  echo "== land-task: summary =="
  printf '%s   %-11s %s\n' "$S_COMMIT" "commit" "$COMMIT_DETAIL"
  printf '%s   %-11s %s\n' "$S_PR" "open PR" "$PR_DETAIL"
  printf '%s   %-11s %s\n' "$S_MERGE" "merge+gate" "$MERGE_DETAIL"
  if [ "$S_COMMIT" = "[ok]" ] && [ "$S_PR" = "[ok]" ] && [ "$S_MERGE" = "[ok]" ]; then
    echo "landed: branch=$(git branch --show-current) sha=$(git rev-parse --short HEAD) pr=#${PR_NUMBER}"
  fi
}

# --- preconditions (fail fast) ----------------------------------------------
branch="$(git branch --show-current)"
if [ -z "$branch" ]; then
  die "not on a branch (detached HEAD); check out a task branch first"
fi
if [ "$branch" = "main" ]; then
  die "refusing to land on main; create a task branch first"
fi
# Working tree must be clean apart from the staged changes. A literal
# "git status --porcelain is empty" test cannot hold here, because staged
# changes themselves appear in that output; we reject any porcelain line that
# carries a worktree change or an untracked file (second column not a space).
if [ -n "$(git status --porcelain | grep -E '^.[^ ]')" ]; then
  die "working tree has unstaged or untracked changes; stage or stash them first"
fi
if [ -z "$(git diff --staged --name-only)" ]; then
  die "nothing staged; stage the reviewed changes first"
fi

# --- step 1: commit ---------------------------------------------------------
echo "== land-task: commit =="
./scripts/commit.sh "$@"
commit_rc=$?
commits_ahead="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
if [ "$commit_rc" -eq 0 ] && [ "${commits_ahead:-0}" -ge 1 ]; then
  S_COMMIT="[ok]"
  COMMIT_DETAIL="$(git rev-parse --short HEAD)"
else
  S_COMMIT="[FAIL]"
  COMMIT_DETAIL="commit.sh exit ${commit_rc}; commits ahead ${commits_ahead:-0}"
  print_summary
  exit 1
fi

# --- step 2: open PR --------------------------------------------------------
echo "== land-task: open PR =="
PR_LOG="$(mktemp)"
./scripts/open-pr.sh "$@" 2>&1 | tee "$PR_LOG"
pr_rc=${PIPESTATUS[0]}

PR_NUMBER="$(grep -oE '/pull/[0-9]+' "$PR_LOG" | head -n1 | grep -oE '[0-9]+' || true)"

if [ -z "$PR_NUMBER" ]; then
  echo "land-task: could not parse a PR number from open-pr.sh output (exit ${pr_rc}); verifying via gh" >&2
  PR_NUMBER="$(gh pr list --head "$(git branch --show-current)" --json number -q '.[0].number' 2>/dev/null || true)"
fi

if [ -z "$PR_NUMBER" ]; then
  S_PR="[FAIL]"
  PR_DETAIL="unknown"
  print_summary
  exit 1
fi

pr_state="$(gh pr view "$PR_NUMBER" --json state -q .state 2>/dev/null || true)"

if [ -z "$pr_state" ]; then
  S_PR="[FAIL]"
  PR_DETAIL="PR #${PR_NUMBER} not confirmed"
  print_summary
  exit 1
fi

S_PR="[ok]"
PR_DETAIL="#${PR_NUMBER}"

# --- step 3: merge + gate ---------------------------------------------------
echo "== land-task: merge+gate =="
MERGE_LOG="$(mktemp)"
./scripts/finish-task.sh "$PR_NUMBER" 2>&1 | tee "$MERGE_LOG"
merge_rc=${PIPESTATUS[0]}

if [ "$merge_rc" -eq 0 ]; then
  S_MERGE="[ok]"
  run_id="$(grep -oE 'run [0-9]+' "$MERGE_LOG" | head -n1 | grep -oE '[0-9]+' || true)"
  if [ -n "$run_id" ]; then
    MERGE_DETAIL="PASS (run ${run_id})"
  else
    MERGE_DETAIL="PASS"
  fi
else
  S_MERGE="[FAIL]"
  MERGE_DETAIL="finish-task.sh exit ${merge_rc}"
  print_summary
  exit "$merge_rc"
fi

print_summary
