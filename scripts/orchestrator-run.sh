#!/usr/bin/env bash
#
# orchestrator-run.sh
#
# Run the Playwright suite and emit a machine-readable envelope at
# test-results/orchestrator-result.json.
#
# Usage:
#   scripts/orchestrator-run.sh [playwright test args...]
#
# All extra arguments are forwarded verbatim to `playwright test`.
#
# Examples:
#   scripts/orchestrator-run.sh --project=api
#   scripts/orchestrator-run.sh --project=api --grep "@smoke"
#
# Exit codes:
#   <n>  Playwright's own exit code
#   2    playwright.config.ts or package.json missing
#   3    Maison health check failed
#   4    Failed to write the result envelope
#
set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

cd -- "${REPO_ROOT}" || { echo "orchestrator: cannot cd to repo root: ${REPO_ROOT}" >&2; exit 2; }

die() {
  echo "orchestrator: $*" >&2
  exit 2
}

[ -f playwright.config.ts ] || die "playwright.config.ts not found in ${REPO_ROOT}"
[ -f package.json ] || die "package.json not found in ${REPO_ROOT}"

HEALTH_URL="http://localhost:4000/api/v1/health"
if ! curl -fsS --max-time 5 "${HEALTH_URL}" >/dev/null; then
  echo "orchestrator: Maison health check failed: ${HEALTH_URL}" >&2
  exit 3
fi

GENERATED_CONFIG="playwright.config.orchestrator.ts"
RAW_REPORT="test-results/orchestrator-raw.json"
RESULT_REPORT="test-results/orchestrator-result.json"

cleanup() {
  rm -f -- "${GENERATED_CONFIG}" "${RAW_REPORT}"
}
trap cleanup EXIT INT TERM

mkdir -p -- test-results

cat > "${GENERATED_CONFIG}" <<'EOF'
import baseConfig from './playwright.config';

const baseReporter = baseConfig.reporter ?? 'list';
const reporters = Array.isArray(baseReporter) ? baseReporter : [baseReporter];

export default {
  ...baseConfig,
  reporter: [...reporters, ['json', { outputFile: 'test-results/orchestrator-raw.json' }]],
};
EOF

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

./node_modules/.bin/playwright test --config="${GENERATED_CONFIG}" "$@"
EXIT_CODE=$?

ENDED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

node -e '
const fs = require("fs");
const [rawPath, outPath, startedAt, endedAt, exitCode, ...args] = process.argv.slice(1);

const envelope = {
  schemaVersion: 1,
  startedAt,
  endedAt,
  exitCode: Number(exitCode),
  args,
  maisonHealthy: true,
  summary: { passed: 0, failed: 0, flaky: 0, skipped: 0, timedOut: 0 },
  failures: [],
};

if (!fs.existsSync(rawPath)) {
  envelope.error = "raw-report-missing";
} else {
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const failures = [];
  let timedOut = 0;

  const walk = (suite, inheritedFile) => {
    const file = suite.file || inheritedFile || "";
    
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const results = test.results || [];
        const last = results[results.length - 1];
        
        if (last && last.status === "timedOut") timedOut += 1;
        
        if (!spec.ok) {
          const errMsg = last && last.error 
            ? (typeof last.error === "string" ? last.error : last.error.message) 
            : "";
          const errStack = last && last.error 
            ? (typeof last.error === "string" ? last.error : last.error.stack) 
            : "";
            
          failures.push({
            file,
            title: spec.title,
            projectName: test.projectName || "",
            status: last ? last.status : "unknown",
            errorMessage: errMsg,
            errorStack: errStack,
          });
        }
      }
    }
    
    for (const child of suite.suites || []) walk(child, file);
  };

  for (const suite of raw.suites || []) walk(suite, "");

  const stats = raw.stats || {};
  envelope.summary = {
    passed: stats.expected || 0,
    failed: stats.unexpected || 0,
    flaky: stats.flaky || 0,
    skipped: stats.skipped || 0,
    timedOut,
  };
  envelope.failures = failures;
}

fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2) + "\n");
' "${RAW_REPORT}" "${RESULT_REPORT}" "${STARTED_AT}" "${ENDED_AT}" "${EXIT_CODE}" "$@"

if [ $? -ne 0 ]; then
  echo "orchestrator: failed to write result envelope at ${RESULT_REPORT}" >&2
  exit 4
fi

exit "${EXIT_CODE}"
