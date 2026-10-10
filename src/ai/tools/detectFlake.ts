import { runPlaywrightTest } from './runPlaywrightTest';

export type FlakeClassification =
  | 'not_reproduced'
  | 'flake_parallel'
  | 'flake_serial_only'
  | 'deterministic_fail'
  | 'inconclusive';

export interface FlakePhase {
  label: string;
  workers: number;
  repeatEach: number;
  passed: boolean;
  durationMs: number;
  failedTestNames: string[];
}

export interface FlakeDetectionResult {
  spec: string;
  classification: FlakeClassification;
  recommendation: string;
  phases: FlakePhase[];
  totalDurationMs: number;
}

const PARALLEL_PHASES = [
  { label: 'parallel-w2-r1', workers: 2, repeatEach: 1 },
  { label: 'parallel-w2-r3', workers: 2, repeatEach: 3 },
  { label: 'parallel-w2-r5', workers: 2, repeatEach: 5 },
];

const MAX_SERIAL_ATTEMPTS = 2;

function extractFailedTestNames(stdout: string): string[] {
  const lines = stdout.split('\n');
  const failed: string[] = [];
  for (const line of lines) {
    // Matches lines from --reporter=line that describe a test, prefixed
    // with an optional [n/m] counter and the [project] tag.
    const match = line.match(
      /\[\d+\/\d+\]\s+\[[\w-]+\]\s+›\s+(.+)$/
    );
    if (match && match[1] !== undefined) {
      failed.push(match[1].trim());
    }
  }
  return failed;
}

async function runPhase(
  specPath: string,
  project: string,
  workers: number,
  repeatEach: number,
  label: string
): Promise<FlakePhase> {
  const result = await runPlaywrightTest(specPath, {
    project,
    workers,
    repeatEach,
  });
  return {
    label,
    workers,
    repeatEach,
    passed: result.passed,
    durationMs: result.durationMs,
    failedTestNames: result.passed ? [] : extractFailedTestNames(result.stdout),
  };
}

function recommend(classification: FlakeClassification): string {
  switch (classification) {
    case 'flake_parallel':
      return 'Parallel-isolation flake detected at the file level. Options: (1) add test.describe.configure({ mode: "serial" }) if the suite shares state; (2) refactor tests to use unique per-test data (own users, own products); (3) investigate server-side global state, especially POST /_reset. See the failedTestNames in the parallel phase for which tests are affected.';
    case 'flake_serial_only':
      return 'File fails serially but passes in parallel. Unusual — likely test ordering or data leakage between tests in the same file. Inspect beforeEach/afterEach and shared fixtures.';
    case 'deterministic_fail':
      return 'File fails consistently in serial mode. Not a flake — treat as a regular bug. Run failure-analyst to classify (product_bug / test_issue / environment).';
    case 'not_reproduced':
      return 'File passed in all attempts. The flake did not reproduce in this run. Re-run the detector with higher repeat counts, or investigate via CI history.';
    case 'inconclusive':
      return 'Results do not match any expected pattern. Inspect the phases array manually.';
  }
}

export async function detectFlake(
  specPath: string,
  project: string = 'api'
): Promise<FlakeDetectionResult> {
  const start = Date.now();
  const phases: FlakePhase[] = [];
  // Phase 1: serial baseline, up to MAX_SERIAL_ATTEMPTS
  let serialFailures = 0;
  for (let attempt = 1; attempt <= MAX_SERIAL_ATTEMPTS; attempt++) {
    const phase = await runPhase(
      specPath,
      project,
      1,
      1,
      `serial-w1-r1-attempt${attempt}`
    );
    phases.push(phase);
    if (!phase.passed) serialFailures++;
  }
  if (serialFailures === MAX_SERIAL_ATTEMPTS) {
    return {
      spec: specPath,
      classification: 'deterministic_fail',
      recommendation: recommend('deterministic_fail'),
      phases,
      totalDurationMs: Date.now() - start,
    };
  }
  if (serialFailures > 0) {
    return {
      spec: specPath,
      classification: 'flake_serial_only',
      recommendation: recommend('flake_serial_only'),
      phases,
      totalDurationMs: Date.now() - start,
    };
  }
  // Phase 2: parallel escalation
  for (const phaseSpec of PARALLEL_PHASES) {
    const phase = await runPhase(
      specPath,
      project,
      phaseSpec.workers,
      phaseSpec.repeatEach,
      phaseSpec.label
    );
    phases.push(phase);
    if (!phase.passed) {
      return {
        spec: specPath,
        classification: 'flake_parallel',
        recommendation: recommend('flake_parallel'),
        phases,
        totalDurationMs: Date.now() - start,
      };
    }
  }
  return {
    spec: specPath,
    classification: 'not_reproduced',
    recommendation: recommend('not_reproduced'),
    phases,
    totalDurationMs: Date.now() - start,
  };
}
