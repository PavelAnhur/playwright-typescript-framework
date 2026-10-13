import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SpecGeneratorInput } from '@ai/prompts/specGenerator';
import type { CallResult } from '@ai/dshClient';
import { callModel } from '@ai/dshClient';
import { assertPathInsideTargetDir, generateSpec } from '@ai/agents/specGenerator';
import { writeFile } from 'node:fs/promises';

vi.mock('@ai/dshClient');
vi.mock('node:fs/promises');

const validSpec = {
  fileName: 'checkout-button-disabled.spec.ts',
  code: 'import { test, expect } from \'@playwright/test\';\ntest(\'should disable button\', async ({ page }) => {});',
};

function createMockResult(content?: string): CallResult {
  return {
    content: content ?? JSON.stringify(validSpec),
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
  vi.resetAllMocks();
});

describe('generateSpec - happy path', () => {
  it('should write a spec file and return fileName + outputPath', async () => {
    vi.mocked(callModel).mockResolvedValue(createMockResult());
    const result = await generateSpec(mockInput);
    expect(result.fileName).toBe('checkout-button-disabled.spec.ts');
    expect(result.outputPath).toContain('checkout-button-disabled.spec.ts');
    expect(result.code).toBe(validSpec.code);
    expect(writeFile).toHaveBeenCalledTimes(1);
    const writeCalls = vi.mocked(writeFile).mock.calls;
    const writtenPath = writeCalls[0]?.[0] as string;
    expect(writtenPath).toContain('tests/specs/review/');
  });
});

describe('generateSpec - path traversal guard', () => {
  it('should refuse fileName with ../ traversal sequence', async () => {
    vi.mocked(callModel).mockResolvedValue(
      createMockResult(JSON.stringify({ fileName: '../__traversal_repro__.spec.ts', code: 'x' }))
    );
    await expect(generateSpec(mockInput)).rejects.toThrow(
      'Refusing fileName with path separators or traversal sequences'
    );
  });

  it('should refuse fileName with forward slash path separator', async () => {
    vi.mocked(callModel).mockResolvedValue(
      createMockResult(JSON.stringify({ fileName: 'nested/deep.spec.ts', code: 'x' }))
    );
    await expect(generateSpec(mockInput)).rejects.toThrow(
      'Refusing fileName with path separators or traversal sequences'
    );
  });

  it('should refuse fileName with backslash path separator', async () => {
    vi.mocked(callModel).mockResolvedValue(
      createMockResult(JSON.stringify({ fileName: 'nested\\deep.spec.ts', code: 'x' }))
    );
    await expect(generateSpec(mockInput)).rejects.toThrow(
      'Refusing fileName with path separators or traversal sequences'
    );
  });
});

describe('assertPathInsideTargetDir - invariant isolation', () => {
  it('should throw when resolved output escapes target via ..', () => {
    const resolvedTarget = '/home/user/project/tests/specs/review';
    const resolvedOutput = '/home/user/project/tests/__escape__.spec.ts';
    expect(() => assertPathInsideTargetDir(resolvedOutput, resolvedTarget)).toThrow(
      'Refusing to write outside target directory'
    );
  });

  it('should throw when resolved output escapes target via sibling-prefix bypass', () => {
    const resolvedTarget = '/home/user/project/tests/specs/review';
    const resolvedOutput = '/home/user/project/tests/specs/review-evil/x.spec.ts';
    expect(() => assertPathInsideTargetDir(resolvedOutput, resolvedTarget)).toThrow(
      'Refusing to write outside target directory'
    );
  });

  it('should throw when resolved output is an absolute path outside target', () => {
    const resolvedTarget = '/home/user/project/tests/specs/review';
    const resolvedOutput = '/tmp/x.spec.ts';
    expect(() => assertPathInsideTargetDir(resolvedOutput, resolvedTarget)).toThrow(
      'Refusing to write outside target directory'
    );
  });

  it('should allow a normal fileName that stays inside target', () => {
    const resolvedTarget = '/home/user/project/tests/specs/review';
    const resolvedOutput = '/home/user/project/tests/specs/review/login.spec.ts';
    expect(() => assertPathInsideTargetDir(resolvedOutput, resolvedTarget)).not.toThrow();
  });
});
