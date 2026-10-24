#!/usr/bin/env bash
# Single gate for this repo. No args. Exit 0 only if every check passes.
# ASCII only on purpose: no em-dashes, no smart quotes.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

BIN=./node_modules/.bin
FAILED=0
SUMMARY=()

strip_ansi() { sed -r 's/\x1B\[[0-9;]*[mK]//g'; }

run() {
  local name="$1"; shift
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  if [ "$rc" -eq 0 ]; then
    SUMMARY+=("PASS  $name")
  else
    FAILED=1
    SUMMARY+=("FAIL  $name (exit $rc)")
    printf '\n===== %s FAILED (exit %s) =====\n%s\n' "$name" "$rc" "$out"
  fi
}

# 1. Typecheck
run "tsc --noEmit" "$BIN/tsc" --noEmit

# 2. Unit tests - require BOTH exit 0 and the summary line.
#    (npx vitest has been observed to report EXIT:0 while failing.)
VITEST_OUT="$(NO_COLOR=1 "$BIN/vitest" run 2>&1)"; VITEST_RC=$?
VITEST_CLEAN="$(printf '%s' "$VITEST_OUT" | strip_ansi)"
if [ "$VITEST_RC" -eq 0 ] && printf '%s' "$VITEST_CLEAN" | grep -Eq 'Tests +[0-9]+ passed'; then
  SUMMARY+=("PASS  vitest run ($(printf '%s' "$VITEST_CLEAN" | grep -Eo 'Tests +[0-9]+ passed' | tail -1))")
else
  FAILED=1
  SUMMARY+=("FAIL  vitest run (exit $VITEST_RC)")
  printf '\n===== vitest run FAILED =====\n%s\n' "$(printf '%s' "$VITEST_CLEAN" | tail -60)"
fi

# 3. Format - repo-wide, this is the CI gate
run "prettier --check ." "$BIN/prettier" --check .

# 3b. ESLint - CI runs this as `npm run lint`; the local gate must cover it,
#     or a lint violation passes locally and fails the push-to-main gate.
run "eslint ." "$BIN/eslint" .

# 4. Lockfile sync - catches the failure class that broke PR #57.
#    A local node_modules can satisfy a requirement the lockfile does not declare.
CI_OUT="$(npm ci --dry-run 2>&1)"; CI_RC=$?
if [ "$CI_RC" -eq 0 ]; then
  SUMMARY+=("PASS  npm ci --dry-run (lockfile in sync)")
else
  FAILED=1
  SUMMARY+=("FAIL  npm ci --dry-run (exit $CI_RC)")
  printf '\n===== npm ci --dry-run FAILED =====\n%s\n' "$CI_OUT"
fi

# 5. Shell script syntax - the gate must cover the scripts that run it.
#    A broken aider-lint.sh or gate-watch.sh fails only at call time, elsewhere.
run "bash -n scripts/*.sh" bash -c 'for f in scripts/*.sh; do bash -n "$f" || exit 1; done'


# 6. Mojibake in changed markdown. Skips when no .md is touched.
MD_FILES="$(git diff --name-only --diff-filter=ACM HEAD -- '*.md' 2>/dev/null)"
if [ -z "$MD_FILES" ]; then
  SUMMARY+=("SKIP  mojibake (no changed .md)")
else
  MOJI_OUT="$(printf '%s\n' "$MD_FILES" | node -e '
    const fs = require("fs");
    const seqs = [
      ["\u00e2\u20ac\u201d", "mojibake em-dash"],
      ["\u00d4\u00c7\u00f6", "mojibake O-umlaut"],
      ["\u00c3\u00a9", "mojibake e-acute"],
      ["\u00c2", "stray A-circumflex"],
    ];
    const files = fs.readFileSync(0, "utf8").trim().split("\n").filter(Boolean);
    const hits = [];
    for (const f of files) {
      fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        for (const [seq, name] of seqs) {
          if (line.includes(seq)) hits.push(f + ":" + (i + 1) + ": " + name);
        }
      });
    }
    if (hits.length) { console.log(hits.join("\n")); process.exit(1); }
  ' 2>&1)"
  if [ $? -eq 0 ]; then
    SUMMARY+=("PASS  mojibake check")
  else
    FAILED=1
    SUMMARY+=("FAIL  mojibake in changed .md")
    printf '\n===== mojibake found =====\n%s\n' "$MOJI_OUT"
  fi
fi

printf '\n================ GATE SUMMARY ================\n'
printf '%s\n' "${SUMMARY[@]}"
printf '==============================================\n'
if [ "$FAILED" -ne 0 ]; then
  printf 'RESULT: FAIL - fix the FAIL lines above and re-run.\n'
  exit 1
fi
printf 'RESULT: PASS - all checks green.\n'
exit 0
