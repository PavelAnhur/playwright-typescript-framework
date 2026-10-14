import { basename } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SpecGeneratorInput } from '@ai/prompts/specGenerator';
import type { CallResult } from '@ai/dshClient';
import { callModel } from '@ai/dshClient';
import { refineSpec } from '@ai/agents/refineSpec';
import { runPlaywrightTest } from '@ai/tools/runPlaywrightTest';
import type { TestRunResult } from '@ai/tools/runPlaywrightTest';
import { writeFile } from 'node:fs/promises';

vi.mock('@ai/dshClient');
vi.mock('node:fs/promises');
vi.mock('@ai/tools/runPlaywrightTest');
vi.mock('@ai/tools/validateTestSelectors', () => ({
  validateTestSelectors: vi.fn().mockResolvedValue({ allValid: true, checked: [] }),
}));
vi.mock('@ai/tools/refineLogger', () => ({
  logRefineAttempt: vi.fn(),
}));

function createMockResult(content: string): CallResult {
  return {
    content,
    durationMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

const mockInput: SpecGeneratorInput = {
  featureName: 'Checkout',
  caseId: 'C1',
  caseTitle: 'Checkout button disabled when cart empty',
  steps: ['Add item to cart', 'Navigate to checkout'],
  expected: 'Button should be disabled',
  projectContext: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('refineSpec - finalFileName matches written file (Item 2)', () => {
  it('should report the same fileName as the file written on disk', async () => {
    const cmCalls: CallResult[] = [
      createMockResult(JSON.stringify({ fileName: 'checkout-button-disabled.spec.ts', code: 'initial code' })),
      createMockResult(JSON.stringify({ fileName: 'some-other-name.spec.ts', code: 'refined code' })),
    ];
    let cmIndex = 0;
    vi.mocked(callModel).mockImplementation(async () => cmCalls[cmIndex++] as CallResult);

    const rpwtCalls: TestRunResult[] = [
      { passed: false, exitCode: 1, errorMessage: 'test failed', errorContext: null, failedTestNames: [], durationMs: 100, stdout: '' },
      { passed: true, exitCode: 0, errorMessage: null, errorContext: null, failedTestNames: [], durationMs: 100, stdout: '' },
    ];
    let rpwtIndex = 0;
    vi.mocked(runPlaywrightTest).mockImplementation(async () => rpwtCalls[rpwtIndex++] as TestRunResult);

    const result = await refineSpec(mockInput);

    expect(result.finalFileName).toBe(basename(result.finalOutputPath));

    const writeCalls = vi.mocked(writeFile).mock.calls;
    const writePaths = writeCalls.map(call => call[0] as string);
    expect(writePaths).toContain(result.finalOutputPath);
    for (const p of writePaths) {
      expect(p).not.toContain('some-other-name.spec.ts');
    }
  });
});

describe('refineSpec - parser policy rejects dangerous fileName (Item 1)', () => {
  function setupMocks(badFileName: string) {
    const cmCalls: CallResult[] = [
      createMockResult(JSON.stringify({ fileName: 'checkout-button-disabled.spec.ts', code: 'initial code' })),
      createMockResult(JSON.stringify({ fileName: badFileName, code: 'refined code' })),
    ];
    let cmIndex = 0;
    vi.mocked(callModel).mockImplementation(async () => cmCalls[cmIndex++] as CallResult);

    const rpwtCalls: TestRunResult[] = [
      { passed: false, exitCode: 1, errorMessage: 'test failed', errorContext: null, failedTestNames: [], durationMs: 100, stdout: '' },
      { passed: true, exitCode: 0, errorMessage: null, errorContext: null, failedTestNames: [], durationMs: 100, stdout: '' },
    ];
    let rpwtIndex = 0;
    vi.mocked(runPlaywrightTest).mockImplementation(async () => rpwtCalls[rpwtIndex++] as TestRunResult);
  }

  it('should reject fileName with ../ traversal sequence', async () => {
    setupMocks('../x.spec.ts');
    await expect(refineSpec(mockInput)).rejects.toThrow(
      'Refusing fileName with path separators or traversal sequences'
    );
  });

  it('should reject fileName with forward slash path separator', async () => {
    setupMocks('nested/deep.spec.ts');
    await expect(refineSpec(mockInput)).rejects.toThrow(
      'Refusing fileName with path separators or traversal sequences'
    );
  });

  it('should reject fileName with backslash path separator', async () => {
    setupMocks('nested\\deep.spec.ts');
    await expect(refineSpec(mockInput)).rejects.toThrow(
      'Refusing fileName with path separators or traversal sequences'
    );
  });

  it('should accept a flat fileName that passes all checks', async () => {
    setupMocks('checkout-button-disabled.spec.ts');
    const result = await refineSpec(mockInput);
    expect(result.finalFileName).toBe(basename(result.finalOutputPath));
  });
});
