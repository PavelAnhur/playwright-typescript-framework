# scripts/ - flow driver tools

This directory holds the scripts that drive the workflow. The table lists every script,
whether it is run by hand, and what its header comment says it does.

| File            | Run by hand? | Purpose                                                                                                                                                                                                                                |
| --------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ai-commit-pr.sh | yes          | Commit staged changes, push, and open a PR in one command.                                                                                                                                                                             |
| aider-lint.sh   | no           | Aider lint-cmd wrapper; receives filenames as args.                                                                                                                                                                                    |
| commit-msg.mjs  | no           | Chat-completions client for commit messages; reads prompt on stdin. Called by commit.sh.                                                                                                                                               |
| commit.sh       | yes          | Generate a Conventional Commit message from staged changes and commit only.                                                                                                                                                            |
| finish-task.sh  | yes          | Finish a task after merge: verify, watch gate, cleanup.                                                                                                                                                                                |
| flow.sh         | yes          | Gate first, then Judge review of the worktree vs HEAD (staged and unstaged changes).                                                                                                                                                   |
| gate-watch.sh   | yes          | Wait for a GitHub run to finish, then report PASS/FAIL.                                                                                                                                                                                |
| judge.mjs       | no           | Chat-completions client for the judge step; prompt file arg. Called by judge.sh.                                                                                                                                                       |
| judge.sh        | yes          | Build a review prompt from the REAL diff and send it to the judge model.                                                                                                                                                               |
| land-task.sh    | yes          | Chain commit -> push -> PR -> merge with streamed output, ASCII step markers, and state checks. Lands a single commit by default; with repeatable --commit "<intent>" / --paths "<pathspec>" pairs it lands several commits in one PR. |
| open-pr.sh      | yes          | Push the current branch and open a PR for committed changes.                                                                                                                                                                           |
| start-task.sh   | yes          | Start a task branch from main or continue an existing task branch.                                                                                                                                                                     |
| verify.sh       | no           | Single gate for this repo. No args. Called by flow.sh.                                                                                                                                                                                 |

## Usage

The authoritative source for any script's arguments is its usage header; a flag not
shown there does not exist.

### ai-commit-pr.sh

usage: `./scripts/ai-commit-pr.sh [--yes] [--intent "..."] [pr-title]`

### commit.sh

usage: `./scripts/commit.sh [--yes] [--intent "..."] [pr-title]`

- Note: pr-title is accepted for ai-commit-pr.sh compatibility and ignored.

### open-pr.sh

usage: `./scripts/open-pr.sh [--yes] [--intent "..."] [pr-title]`

- Note: --yes is accepted for wrapper compatibility and has no effect.

### finish-task.sh

usage: `./scripts/finish-task.sh <pr-number>`
pr-number must be a positive integer.

### flow.sh

usage: `./scripts/flow.sh [--range A..B]`

- Note: the Judge step reviews the worktree vs HEAD (staged and unstaged); with --range it reviews that commit range instead.

### gate-watch.sh

usage: `./scripts/gate-watch.sh [run-id] [timeout-seconds]`

- Note: with no run-id it watches the latest run on main; the timeout requires a run-id.

### judge.sh

usage: `./scripts/judge.sh` # working tree vs HEAD (incl. staged)
usage: `./scripts/judge.sh --staged` # staged only
usage: `./scripts/judge.sh --range A..B` # commit range

### land-task.sh

usage: `./scripts/land-task.sh [--yes] [--intent "..."] [pr-title]`
usage: `./scripts/land-task.sh [--yes] [pr-title] --commit "<intent>" --paths "<pathspec>" [--commit "<intent>" --paths "<pathspec>" ...]`

- Note: --commit and --paths are repeatable and paired in order; each --paths belongs to the --commit immediately before it.
- Note: multi mode requires a clean index (nothing staged) when the script starts.

### start-task.sh

usage: `./scripts/start-task.sh <branch>`
Branch prefix must be one of: feat fix docs chore test refactor perf build ci
Example: docs/backlog-audit-split
