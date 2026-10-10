import { runPlaywrightTest } from './runPlaywrightTest';

export type FlakeClassification =
  | 'not_reproduced'
  | 'flake_parallel'
  | 'flake_serial_only'
  | 'flake_parallel_suite'
  | 'deterministic_fail'
  | 'inconclusive';

export interface FlakePhase {
  label: string;
  scope: 'file' | 'suite';
  workers: number;
  repeatEach: number;
  passed: boolean;
  durationMs: number;
  failedTestNames: string[];
}

export interface FlakeDetectionResult {
  spec: string;
  suite: string | null;
  classification: FlakeClassification;
  recommendation: string;
  phases: FlakePhase[];
  totalDurationMs: number;
}

const FILE_PARALLEL_PHASES = [
  { label: 'file-parallel-w2-r1', workers: 2, repeatEach: 1 },
  { label: 'file-parallel-w2-r3', workers: 2, repeatEach: 3 },
  { label: 'file-parallel-w2-r5', workers: 2, repeatEach: 5 },
];

const SUITE_PHASE = { label: 'suite-parallel-w2-r1', workers: 2, repeatEach: 1 };

const MAX_SERIAL_ATTEMPTS = 2;

async function runPhase(
  targetPath: string,
  scope: 'file' | 'suite',
  project: string,
  workers: number,
  repeatEach: number,
  label: string
): Promise<FlakePhase> {
  const result = await runPlaywrightTest(targetPath, {
    project,
    workers,
    repeatEach,
  });
  return {
    label,
    scope,
    workers,
    repeatEach,
    passed: result.passed,
    durationMs: result.durationMs,
    failedTestNames: result.failedTestNames,
  };
}

function recommend(classification: FlakeClassification): string {
  switch (classification) {
    case 'flake_parallel':
      return 'Parallel-isolation flake detected at the file level. Options: (1) add test.describe.configure({ mode: "serial" }) if the suite shares state; (2) refactor tests to use unique per-test data (own users, own products); (3) investigate server-side global state, especially POST /_reset. See the failedTestNames in the parallel phase for which tests are affected.';
    case 'flake_parallel_suite':
      return 'File is clean in isolation but flaky when run as part of the suite. The interfering test lives in another file. Options: (1) find the sibling file that shares global state (look for tests that mutate shared resources); (2) isolate tests in this file so they do not depend on global state; (3) if the flake is rare, correlate with CI history rather than trying to reproduce locally.';
    case 'flake_serial_only':
      return 'File fails serially but passes in parallel. Unusual — likely test ordering or data leakage between tests in the same file. Inspect beforeEach/afterEach and shared fixtures.';
    case 'deterministic_fail':
      return 'File fails consistently in serial mode. Not a flake — treat as a regular bug. Run failure-analyst to classify (product_bug / test_issue / environment).';
    case 'not_reproduced':
      return 'File passed in all attempts, including suite-level runs (if requested). The flake did not reproduce in this run. Re-run with higher repeat counts, or investigate via CI history.';
    case 'inconclusive':
      return 'Results do not match any expected pattern. Inspect the phases array manually.';
  }
}

export async function detectFlake(
  specPath: string,
  project: string = 'api',
  suitePath?: string
): Promise<FlakeDetectionResult> {
  const start = Date.now();
  const phases: FlakePhase[] = [];
  // Phase 1: serial baseline on the file
  let serialFailures = 0;
  for (let attempt = 1; attempt <= MAX_SERIAL_ATTEMPTS; attempt++) {
    const phase = await runPhase(
      specPath,
      'file',
      project,
      1,
      1,
      `file-serial-w1-r1-attempt${attempt}`
    );
    phases.push(phase);
    if (!phase.passed) serialFailures++;
  }
  if (serialFailures === MAX_SERIAL_ATTEMPTS) {
    return {
      spec: specPath,
      suite: suitePath ?? null,
      classification: 'deterministic_fail',
      recommendation: recommend('deterministic_fail'),
      phases,
      totalDurationMs: Date.now() - start,
    };
  }
  if (serialFailures > 0) {
    return {
      spec: specPath,
      suite: suitePath ?? null,
      classification: 'flake_serial_only',
      recommendation: recommend('flake_serial_only'),
      phases,
      totalDurationMs: Date.now() - start,
    };
  }
  // Phase 2: parallel escalation on the file
  for (const phaseSpec of FILE_PARALLEL_PHASES) {
    const phase = await runPhase(
      specPath,
      'file',
      project,
      phaseSpec.workers,
      phaseSpec.repeatEach,
      phaseSpec.label
    );
    phases.push(phase);
    if (!phase.passed) {
      return {
        spec: specPath,
        suite: suitePath ?? null,
        classification: 'flake_parallel',
        recommendation: recommend('flake_parallel'),
        phases,
        totalDurationMs: Date.now() - start,
      };
    }
  }
  // Phase 3: single suite-level run (optional)
  if (suitePath !== undefined) {
    const phase = await runPhase(
      suitePath,
      'suite',
      project,
      SUITE_PHASE.workers,
      SUITE_PHASE.repeatEach,
      SUITE_PHASE.label
    );
    phases.push(phase);
    if (!phase.passed) {
      return {
        spec: specPath,
        suite: suitePath,
        classification: 'flake_parallel_suite',
        recommendation: recommend('flake_parallel_suite'),
        phases,
        totalDurationMs: Date.now() - start,
      };
    }
  }
  return {
    spec: specPath,
    suite: suitePath ?? null,
    classification: 'not_reproduced',
    recommendation: recommend('not_reproduced'),
    phases,
    totalDurationMs: Date.now() - start,
  };
}
