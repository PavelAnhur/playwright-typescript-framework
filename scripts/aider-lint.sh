#!/usr/bin/env bash
# Aider lint-cmd wrapper. Receives filenames as args.
# prettier --write fixes formatting; the following --check then exits 0
# unless there is a problem formatting cannot solve.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
[ "$#" -eq 0 ] && exit 0
# --ignore-unknown: skip files prettier cannot parse (e.g. .sh) instead of failing.
./node_modules/.bin/prettier --write --ignore-unknown "$@" > /dev/null 2>&1
exec ./node_modules/.bin/prettier --check --ignore-unknown "$@"
