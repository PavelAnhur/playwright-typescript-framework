import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FlakeDetectionResult } from '@ai/tools/detectFlake';
import type { FailureHypothesis } from '@ai/schemas';
import type { TestCase } from '@playwright/test/reporter';
import type { ContextInput, RawFailure } from '../../../reporters/aiTriageTypes';
import type { FlakeDecisionGate } from '@ai/tools/flakeDecisionGate';
import { TriageEngine } from '../../../reporters/triageEngine';

const mockAnalyzeFailures =
  vi.fn<(contexts: ContextInput[]) => Promise<{ hypotheses: FailureHypothesis[] }>>();
const mockAnalyzeFailure =
  vi.fn<
    (ctx: ContextInput) => Promise<{ hypothesis: FailureHypothesis; outputPath: string | null }>
  >();

vi.mock('@ai/agents/failureAnalyst', () => ({
  analyzeFailure: (ctx: ContextInput) => mockAnalyzeFailure(ctx),
  analyzeFailures: (contexts: ContextInput[]) => mockAnalyzeFailures(contexts),
}));

const mockMaybeDetect =
  vi.fn<
    (
      test: TestCase,
      hypothesis: FailureHypothesis
    ) => Promise<{ result: FlakeDetectionResult | null; error: string | null }>
  >();

function makeMockFlakeGate(): FlakeDecisionGate {
  return { maybeDetect: mockMaybeDetect } as unknown as FlakeDecisionGate;
}

function makeHypothesis(
  category: FailureHypothesis['category'],
  confidence: FailureHypothesis['confidence'] = 'high'
): FailureHypothesis {
  return { category, confidence, hypothesis: 'dummy', evidence: ['placeholder'] };
}

function makeRawFailure(title: string, errMsg: string, stack?: string): RawFailure {
  const test = {
    title,
    parent: {
      project: () => ({ name: 'api', testDir: '/tmp' }),
    },
    location: { file: 'tests/specs/ui/example.spec.ts', line: 0, column: 0 },
    retries: 0,
    timeout: 30000,
  } as unknown as TestCase;
  const result = {
    status: 'failed',
    startTime: new Date(),
    duration: 100,
    annotations: [],
    error: { message: errMsg, stack },
  } as unknown as RawFailure['result'];
  return { test, result };
}

describe('TriageEngine MAX_TRIAGE cap', () => {
  beforeEach(() => {
    mockAnalyzeFailures.mockClear();
    mockAnalyzeFailure.mockClear();
    mockMaybeDetect.mockClear();
  });

  it('trims failures to at most 10', async () => {
    const failures = Array.from({ length: 15 }, (_, i) =>
      makeRawFailure(`test-${i}`, `error ${i}`)
    );

    mockAnalyzeFailures.mockResolvedValue({
      hypotheses: Array.from({ length: 10 }, () => makeHypothesis('product_bug')),
    });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(10);
    expect(mockAnalyzeFailures).toHaveBeenCalledTimes(1);
    const callCtx = mockAnalyzeFailures.mock.calls[0]![0];
    expect(callCtx).toHaveLength(10);
  });

  it('returns all failures when count <= 10', async () => {
    const failures = Array.from({ length: 5 }, (_, i) => makeRawFailure(`test-${i}`, `error ${i}`));

    mockAnalyzeFailures.mockResolvedValue({
      hypotheses: Array.from({ length: 5 }, () => makeHypothesis('product_bug')),
    });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(5);
  });

  it('returns empty array when no failures provided', async () => {
    mockAnalyzeFailures.mockResolvedValue({ hypotheses: [] });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run([]);

    expect(result).toHaveLength(0);
  });
});

describe('TriageEngine truncation', () => {
  beforeEach(() => {
    mockAnalyzeFailures.mockClear();
    mockAnalyzeFailure.mockClear();
    mockMaybeDetect.mockClear();
  });

  it('truncates errorMessage longer than 2000 chars', async () => {
    const longMsg = 'x'.repeat(2001);
    const failures = [makeRawFailure('long-error', longMsg)];

    mockAnalyzeFailures.mockResolvedValue({
      hypotheses: [makeHypothesis('test_issue')],
    });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(1);
    // pairResults reads from RawFailure, so TriagedFailure has the raw message
    expect(result[0]!.errorMessage).toBe(longMsg);
    // Context passed to analyzeFailures should be truncated
    const callCtx = mockAnalyzeFailures.mock.calls[0]![0];
    expect(callCtx).toHaveLength(1);
    const ctx = callCtx[0]!;
    expect(ctx.errorMessage.length).toBe(2012); // 2000 + '…[truncated]'
    expect(ctx.errorMessage.endsWith('…[truncated]'));
  });

  it('truncates stackTrace longer than 4000 chars', async () => {
    const longStack = 'y'.repeat(4001);
    const failures = [makeRawFailure('long-stack', 'short error', longStack)];

    mockAnalyzeFailures.mockResolvedValue({
      hypotheses: [makeHypothesis('test_issue')],
    });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(1);
    const stack = result[0]!.errorMessage;
    expect(stack).toBe('short error');
  });

  it('does not truncate short messages and stacks', async () => {
    const failures = [makeRawFailure('short', 'short error', 'short stack')];

    mockAnalyzeFailures.mockResolvedValue({
      hypotheses: [makeHypothesis('test_issue')],
    });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result[0]!.errorMessage).toBe('short error');
  });
});

describe('TriageEngine batch success path', () => {
  beforeEach(() => {
    mockAnalyzeFailures.mockClear();
    mockAnalyzeFailure.mockClear();
    mockMaybeDetect.mockClear();
  });

  it('pairs hypotheses with failures and calls maybeDetect per failure', async () => {
    const failures = [
      makeRawFailure('test-a', 'error a'),
      makeRawFailure('test-b', 'error b'),
      makeRawFailure('test-c', 'error c'),
    ];

    const hypA = makeHypothesis('product_bug');
    const hypB = makeHypothesis('test_issue');
    const hypC = makeHypothesis('flake');

    mockAnalyzeFailures.mockResolvedValue({ hypotheses: [hypA, hypB, hypC] });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(3);

    expect(result[0]!.hypothesis).toBe(hypA);
    expect(result[0]!.testTitle).toBe('test-a');
    expect(result[0]!.errorMessage).toBe('error a');
    expect(result[0]!.triageError).toBeNull();

    expect(result[1]!.hypothesis).toBe(hypB);
    expect(result[1]!.testTitle).toBe('test-b');
    expect(result[1]!.errorMessage).toBe('error b');

    expect(result[2]!.hypothesis).toBe(hypC);
    expect(result[2]!.testTitle).toBe('test-c');
    expect(result[2]!.errorMessage).toBe('error c');

    expect(mockMaybeDetect).toHaveBeenCalledTimes(3);
    expect(mockMaybeDetect).toHaveBeenCalledWith(failures[0]!.test, hypA);
    expect(mockMaybeDetect).toHaveBeenCalledWith(failures[1]!.test, hypB);
    expect(mockMaybeDetect).toHaveBeenCalledWith(failures[2]!.test, hypC);
  });

  it('sets flake and flakeError from maybeDetect return value', async () => {
    const failures = [makeRawFailure('flake-test', 'timeout')];

    const flakeResult: FlakeDetectionResult = {
      spec: 'flake-test.spec.ts',
      suite: null,
      classification: 'flake_parallel',
      recommendation: 'retry',
      phases: [],
      totalDurationMs: 5000,
    };

    mockAnalyzeFailures.mockResolvedValue({ hypotheses: [makeHypothesis('test_issue')] });
    mockMaybeDetect.mockResolvedValue({ result: flakeResult, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result[0]!.flake).toBe(flakeResult);
    expect(result[0]!.flakeError).toBeNull();
  });
});

describe('TriageEngine batch failure fallback', () => {
  beforeEach(() => {
    mockAnalyzeFailures.mockClear();
    mockAnalyzeFailure.mockClear();
    mockMaybeDetect.mockClear();
  });

  it('falls back to single triage when batch throws', async () => {
    const failures = [makeRawFailure('test-a', 'error a'), makeRawFailure('test-b', 'error b')];

    mockAnalyzeFailures.mockRejectedValue(new Error('model unavailable'));
    mockAnalyzeFailure.mockResolvedValue({
      hypothesis: makeHypothesis('product_bug'),
      outputPath: null,
    });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(2);
    expect(mockAnalyzeFailure).toHaveBeenCalledTimes(2);
    expect(mockAnalyzeFailure).toHaveBeenCalledWith(
      expect.objectContaining({ testTitle: 'test-a' })
    );
    expect(mockAnalyzeFailure).toHaveBeenCalledWith(
      expect.objectContaining({ testTitle: 'test-b' })
    );
    expect(mockMaybeDetect).toHaveBeenCalledTimes(2);
  });

  it('sets triageError and null hypothesis when single triage throws', async () => {
    const failures = [makeRawFailure('fail-a', 'error a'), makeRawFailure('ok-b', 'error b')];

    mockAnalyzeFailures.mockRejectedValue(new Error('batch crash'));
    mockAnalyzeFailure
      .mockRejectedValueOnce(new Error('single triage failed'))
      .mockResolvedValueOnce({
        hypothesis: makeHypothesis('test_issue'),
        outputPath: null,
      });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(2);

    expect(result[0]!.hypothesis).toBeNull();
    expect(result[0]!.triageError).toBe('single triage failed');
    expect(result[0]!.flake).toBeNull();
    expect(result[0]!.flakeError).toBeNull();
    expect(result[0]!.testTitle).toBe('fail-a');

    expect(result[1]!.hypothesis).toEqual(makeHypothesis('test_issue'));
    expect(result[1]!.triageError).toBeNull();
  });
});

describe('TriageEngine pairResults silent skip', () => {
  beforeEach(() => {
    mockAnalyzeFailures.mockClear();
    mockAnalyzeFailure.mockClear();
    mockMaybeDetect.mockClear();
  });

  it('skips extra failures when fewer hypotheses than failures', async () => {
    const failures = [
      makeRawFailure('test-a', 'error a'),
      makeRawFailure('test-b', 'error b'),
      makeRawFailure('test-c', 'error c'),
    ];

    mockAnalyzeFailures.mockResolvedValue({
      hypotheses: [makeHypothesis('product_bug')],
    });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(1);
    expect(result[0]!.testTitle).toBe('test-a');
  });

  it('matches hypothesis[i] with failure[i] by index', async () => {
    const failures = [makeRawFailure('first', 'err 1'), makeRawFailure('second', 'err 2')];

    mockAnalyzeFailures.mockResolvedValue({
      hypotheses: [makeHypothesis('product_bug'), makeHypothesis('test_issue')],
    });
    mockMaybeDetect.mockResolvedValue({ result: null, error: null });

    const engine = new TriageEngine(makeMockFlakeGate());
    const result = await engine.run(failures);

    expect(result).toHaveLength(2);
    expect(result[0]!.hypothesis!.category).toBe('product_bug');
    expect(result[0]!.testTitle).toBe('first');
    expect(result[1]!.hypothesis!.category).toBe('test_issue');
    expect(result[1]!.testTitle).toBe('second');
  });
});
