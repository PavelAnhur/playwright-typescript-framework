import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { detectFlake } from '@ai/tools/detectFlake';
import type { TestRunResult } from '@ai/tools/runPlaywrightTest';

const capturedCalls: [string, { project?: string; workers?: number; repeatEach?: number }][] = [];

const mockImpl = vi.fn();

vi.mock('@ai/tools/runPlaywrightTest', () => ({
  runPlaywrightTest: (
    spec: string,
    opts: { project?: string; workers?: number; repeatEach?: number }
  ) => {
    capturedCalls.push([spec, opts]);
    return mockImpl(opts);
  },
}));

function makeResult(passed: boolean): TestRunResult {
  return {
    passed,
    exitCode: passed ? 0 : 1,
    errorMessage: passed ? null : 'expected',
    errorContext: null,
    failedTestNames: passed ? [] : ['test'],
    durationMs: 100,
    stdout: '',
  };
}

describe('detectFlake classification ladder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Date, 'now').mockImplementation(() => 1000);
    mockImpl.mockReset();
    capturedCalls.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('classifies as deterministic_fail when both serial attempts fail', async () => {
    mockImpl.mockResolvedValue(makeResult(false));

    const result = await detectFlake('spec.spec.ts', 'api');

    expect(result.classification).toBe('deterministic_fail');
    expect(mockImpl).toHaveBeenCalledTimes(2);
    // Both calls are serial (workers=1, repeatEach=1)
    expect(capturedCalls[0]![1]).toEqual({ project: 'api', workers: 1, repeatEach: 1 });
    expect(capturedCalls[1]![1]).toEqual({ project: 'api', workers: 1, repeatEach: 1 });
    // Parallel phases must NOT be run (short-circuit)
    for (const call of capturedCalls) {
      expect(call[1].workers).toBe(1);
    }
  });

  it('classifies as flake_serial_only when exactly one serial attempt fails', async () => {
    mockImpl.mockResolvedValueOnce(makeResult(false)).mockResolvedValueOnce(makeResult(true));

    const result = await detectFlake('spec.spec.ts', 'api');

    expect(result.classification).toBe('flake_serial_only');
    expect(mockImpl).toHaveBeenCalledTimes(2);
    // No parallel phases should be run (short-circuit)
    for (const call of capturedCalls) {
      expect(call[1].workers).toBe(1);
    }
  });

  it('classifies as flake_serial_only when the second serial attempt fails', async () => {
    mockImpl.mockResolvedValueOnce(makeResult(true)).mockResolvedValueOnce(makeResult(false));

    const result = await detectFlake('spec.spec.ts', 'api');

    expect(result.classification).toBe('flake_serial_only');
    expect(mockImpl).toHaveBeenCalledTimes(2);
  });

  it('classifies as flake_parallel when serial passes but first parallel phase fails', async () => {
    mockImpl
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 1
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 2
      .mockResolvedValueOnce(makeResult(false)); // file-parallel-w2-r1

    const result = await detectFlake('spec.spec.ts', 'api');

    expect(result.classification).toBe('flake_parallel');
    expect(mockImpl).toHaveBeenCalledTimes(3);
    // First two calls are serial, third is parallel (workers=2)
    expect(capturedCalls[0]![1].workers).toBe(1);
    expect(capturedCalls[1]![1].workers).toBe(1);
    expect(capturedCalls[2]![1].workers).toBe(2);
  });

  it('classifies as flake_parallel when serial + first parallel pass but second parallel phase fails', async () => {
    mockImpl
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 1
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 2
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r1
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r3
      .mockResolvedValueOnce(makeResult(false)); // file-parallel-w2-r5

    const result = await detectFlake('spec.spec.ts', 'api');

    expect(result.classification).toBe('flake_parallel');
    expect(mockImpl).toHaveBeenCalledTimes(5);
    // Last call is the failing parallel phase (workers=2, repeatEach=5)
    expect(capturedCalls[4]![1].repeatEach).toBe(5);
  });

  it('classifies as flake_parallel_suite when serial + all parallel pass, suite provided and suite fails', async () => {
    mockImpl
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 1
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 2
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r1
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r3
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r5
      .mockResolvedValueOnce(makeResult(false)); // suite-parallel-w2-r1

    const result = await detectFlake('spec.spec.ts', 'api', 'suite.spec.ts');

    expect(result.classification).toBe('flake_parallel_suite');
    expect(result.suite).toBe('suite.spec.ts');
    expect(mockImpl).toHaveBeenCalledTimes(6);
    // Last call is the suite phase (workers=2, repeatEach=1)
    expect(capturedCalls[5]![1].workers).toBe(2);
    expect(capturedCalls[5]![1].repeatEach).toBe(1);
  });

  it('classifies as not_reproduced when all phases pass with no suite', async () => {
    mockImpl
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 1
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 2
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r1
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r3
      .mockResolvedValueOnce(makeResult(true)); // file-parallel-w2-r5

    const result = await detectFlake('spec.spec.ts', 'api');

    expect(result.classification).toBe('not_reproduced');
    expect(result.suite).toBeNull();
    expect(mockImpl).toHaveBeenCalledTimes(5);
  });

  it('classifies as not_reproduced when all phases pass with suite also passing', async () => {
    mockImpl
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 1
      .mockResolvedValueOnce(makeResult(true)) // serial attempt 2
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r1
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r3
      .mockResolvedValueOnce(makeResult(true)) // file-parallel-w2-r5
      .mockResolvedValueOnce(makeResult(true)); // suite-parallel-w2-r1

    const result = await detectFlake('spec.spec.ts', 'api', 'suite.spec.ts');

    expect(result.classification).toBe('not_reproduced');
    expect(result.suite).toBe('suite.spec.ts');
    expect(mockImpl).toHaveBeenCalledTimes(6);
  });

  // inconclusive is declared in the FlakeClassification union but the ladder
  // has no code path that returns it — every branch resolves to one of the
  // other five values. This test documents that fact.
  it('does not produce inconclusive — the ladder has no reachable path for it', async () => {
    mockImpl
      .mockResolvedValueOnce(makeResult(true))
      .mockResolvedValueOnce(makeResult(true))
      .mockResolvedValueOnce(makeResult(true))
      .mockResolvedValueOnce(makeResult(true))
      .mockResolvedValueOnce(makeResult(true));

    const result = await detectFlake('spec.spec.ts', 'api');

    expect(result.classification).not.toBe('inconclusive');
  });
});
