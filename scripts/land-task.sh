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
#        ./scripts/land-task.sh [--yes] [pr-title] \
#            --commit "<intent>" --paths "<pathspec>" \
#            [--commit "<intent>" --paths "<pathspec>" ...]
#
# Single-commit mode (no --commit/--paths pairs): all arguments are passed
# through to commit.sh and open-pr.sh, exactly as before.
#
# Multi-commit mode (one or more --commit/--paths pairs): the script stages
# each pathspec, commits it with the paired intent, and repeats for every
# pair; only after all pairs are committed does it open one PR and merge it.
# --commit and --paths are repeatable and paired: each --paths belongs to the
# --commit immediately before it, and the two must be given in equal numbers.
# A --paths value may name several space-separated paths; every one of them is
# staged for that pair. In this mode the remaining arguments (e.g. --yes,
# pr-title) are passed through to open-pr.sh only.
#
# Preconditions (both modes):
#   - the branch must not already be ahead of origin/main, because the PR must
#     contain only the commits this run creates.
# Preconditions (multi-commit mode only):
#   - nothing may be staged when the script starts, because the script stages
#     each --commit/--paths pair itself.

set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

die() {
  echo "land-task: $*" >&2
  exit 1
}

# --- parse --commit/--paths pairs -------------------------------------------
# --commit and --paths are repeatable and paired: each --paths belongs to the
# --commit immediately before it. Both accept the "--flag value" and
# "--flag=value" forms. Every other argument is collected, in order, into
# passthrough.
orig_args=("$@")
commit_intents=()
commit_paths=()
passthrough=()
pending_commit=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --commit)
      [ "$#" -ge 2 ] || die "--commit requires a value"
      commit_intents+=("$2")
      pending_commit=1
      shift 2
      ;;
    --commit=*)
      commit_intents+=("${1#--commit=}")
      pending_commit=1
      shift
      ;;
    --paths)
      [ "$#" -ge 2 ] || die "--paths requires a value"
      [ "$pending_commit" -eq 1 ] || die "--paths must follow a --commit"
      commit_paths+=("$2")
      pending_commit=0
      shift 2
      ;;
    --paths=*)
      [ "$pending_commit" -eq 1 ] || die "--paths must follow a --commit"
      commit_paths+=("${1#--paths=}")
      pending_commit=0
      shift
      ;;
    *)
      passthrough+=("$1")
      shift
      ;;
  esac
done

if [ "${#commit_intents[@]}" -ne "${#commit_paths[@]}" ]; then
  die "count mismatch: ${#commit_intents[@]} --commit vs ${#commit_paths[@]} --paths"
fi

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

# The PR must contain only the commits this run creates, so the branch must
# start level with origin/main. This applies in both modes.
pre_ahead="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
if [ "${pre_ahead:-0}" -ge 1 ]; then
  die "branch is already ahead of origin/main by ${pre_ahead} commit(s); the PR must contain only the commits this run creates"
fi

if [ "${#commit_intents[@]}" -eq 0 ]; then
  # Single-commit mode: the reviewed changes are already staged. A literal
  # "git status --porcelain is empty" test cannot hold here, because staged
  # changes themselves appear in that output; we reject any porcelain line that
  # carries a worktree change or an untracked file (second column not a space).
  if [ -n "$(git status --porcelain | grep -E '^.[^ ]')" ]; then
    die "working tree has unstaged or untracked changes; stage or stash them first"
  fi
  if [ -z "$(git diff --staged --name-only)" ]; then
    die "nothing staged; stage the reviewed changes first"
  fi
else
  # Multi-commit mode: the script stages each pathspec itself, so the index
  # must start clean; otherwise the first commit would silently include
  # changes that no --paths covered.
  if [ -n "$(git diff --staged --name-only)" ]; then
    die "index is not clean; unstage changes before using --commit/--paths"
  fi
fi

# --- step 1: commit ---------------------------------------------------------
if [ "${#commit_intents[@]}" -gt 0 ]; then
  # Multi-commit mode: stage and commit each --commit/--paths pair, in order.
  echo "== land-task: commit (multi) =="
  commit_shas=()
  for i in "${!commit_intents[@]}"; do
    intent="${commit_intents[$i]}"
    pathspec="${commit_paths[$i]}"

    # A --paths value may name several space-separated paths; stage every one
    # of them. If any named path does not exist, stage nothing and fail the
    # pair (treated as "staged nothing").
    read -ra paths <<< "$pathspec"
    missing=0
    for p in "${paths[@]}"; do
      [ -e "$p" ] || missing=1
    done
    if [ "$missing" -eq 0 ]; then
      git add -- "${paths[@]}"
    fi
    if [ -z "$(git diff --staged --name-only)" ]; then
      S_COMMIT="[FAIL]"
      COMMIT_DETAIL="pathspec '${pathspec}' staged nothing"
      print_summary
      exit 1
    fi

    if ! ./scripts/commit.sh --yes --intent "$intent"; then
      S_COMMIT="[FAIL]"
      COMMIT_DETAIL="commit.sh failed for intent '${intent}'"
      print_summary
      exit 1
    fi

    commit_shas+=("$(git rev-parse --short HEAD)")
  done

  S_COMMIT="[ok]"
  COMMIT_DETAIL="$(printf '%s ' "${commit_shas[@]}")"
  COMMIT_DETAIL="${COMMIT_DETAIL% }"

  # Nothing may be silently included or silently dropped: every tracked change
  # must have been covered by a --paths. Untracked files are not tracked, so
  # they are ignored here.
  leftover="$(git status --porcelain | grep -v '^??')"
  if [ -n "$leftover" ]; then
    S_COMMIT="[FAIL]"
    COMMIT_DETAIL="committed ${commit_shas[*]}; uncommitted tracked changes remain: $(printf '%s' "$leftover" | tr '\n' ' ')"
    print_summary
    exit 1
  fi
else
  # Single-commit mode: unchanged.
  echo "== land-task: commit =="
  ./scripts/commit.sh "${orig_args[@]}"
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
fi

# --- step 2: open PR --------------------------------------------------------
echo "== land-task: open PR =="
PR_LOG="$(mktemp)"
./scripts/open-pr.sh "${passthrough[@]}" 2>&1 | tee "$PR_LOG"
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
