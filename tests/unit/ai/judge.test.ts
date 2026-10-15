import { basename, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { judgeTriage } from '@ai/agents/judge';
import { aiConfig } from '@ai/config';
import type { CallResult } from '@ai/dshClient';
import { callModel } from '@ai/dshClient';

vi.mock('@ai/dshClient');
vi.mock('node:fs/promises');

const summaryFixture = {
  failures: [
    {
      hypothesis: {
        hypothesis: 'The button is not disabled when the cart is empty.',
        category: 'product_bug',
        confidence: 'high',
        evidence: ['Expected: disabled', 'Received: enabled'],
      },
      errorMessage: 'Error: expect(locator).toBeDisabled() failed',
    },
  ],
};

const validVerdict = {
  score: 9,
  verdict: 'correct',
  reasoning: 'The hypothesis is well-grounded in the evidence.',
  hallucinations: [],
};

function createMockResult(content?: string): CallResult {
  return {
    content: content ?? JSON.stringify(validVerdict),
    durationMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('judgeTriage - happy path with reporter summary shape', () => {
  it('should return verdict and correct output path for checkout-button-disabled.triage.json', async () => {
    vi.mocked(readFile).mockImplementation(async path => {
      if (path === 'checkout-button-disabled.triage.json') return JSON.stringify(summaryFixture);
      throw new Error('ENOENT: no such file');
    });
    vi.mocked(callModel).mockResolvedValue(createMockResult());
    const result = await judgeTriage('checkout-button-disabled.triage.json', null, null);
    expect(result.verdict.score).toBe(9);
    expect(result.verdict.verdict).toBe('correct');
    expect(basename(result.outputPath)).toBe('checkout-button-disabled.judge.json');
    expect(writeFile).toHaveBeenCalledTimes(1);
    const callOptions = vi.mocked(callModel).mock.calls?.[0]?.[0];
    expect(callOptions?.agent).toBe('judge');
  });
});

describe('judgeTriage - happy path with standalone triage shape', () => {
  it('should return verdict and correct output path for checkout-button-disabled.triage.json', async () => {
    vi.mocked(readFile).mockImplementation(async path => {
      if (path === 'checkout-button-disabled.triage.json') return JSON.stringify(summaryFixture);
      throw new Error('ENOENT: no such file');
    });
    vi.mocked(callModel).mockResolvedValue(createMockResult());
    const result = await judgeTriage('checkout-button-disabled.triage.json', null, null);
    expect(result.verdict.score).toBe(9);
    expect(basename(result.outputPath)).toBe('checkout-button-disabled.judge.json');
  });
});

describe('judgeTriage - error context priority', () => {
  it('should prefer error context file over summary errorMessage', async () => {
    vi.mocked(readFile).mockImplementation(async path => {
      if (path === 'checkout-button-disabled.triage.json') return JSON.stringify(summaryFixture);
      if (path === 'error-context.md') return 'from file';
      throw new Error('ENOENT: no such file');
    });
    vi.mocked(callModel).mockResolvedValue(createMockResult());
    await judgeTriage('checkout-button-disabled.triage.json', 'error-context.md', null);
    expect(callModel).toHaveBeenCalledTimes(1);
    const callOptions = vi.mocked(callModel).mock.calls?.[0]?.[0];
    const userContent = callOptions?.messages?.find(m => m.role === 'user')?.content ?? '';
    expect(userContent).toContain('from file');
    expect(userContent).not.toContain('Error: expect(locator).toBeDisabled() failed');
  });
});

describe('judgeTriage - error context missing', () => {
  it('should reject when no error context is available', async () => {
    const minimalSummary = {
      failures: [
        {
          hypothesis: {
            hypothesis: 'The button is not disabled when the cart is empty.',
            category: 'product_bug',
            confidence: 'high',
            evidence: ['Expected: disabled', 'Received: enabled'],
          },
          errorMessage: '',
        },
      ],
    };
    vi.mocked(readFile).mockImplementation(async path => {
      if (path === 'report.json') return JSON.stringify(minimalSummary);
      throw new Error('ENOENT: no such file');
    });
    await expect(judgeTriage('report.json', null, null)).rejects.toThrow(
      'No error context available'
    );
  });
});

describe('judgeTriage - non-JSON model response', () => {
  it('should reject when the model returns invalid JSON', async () => {
    vi.mocked(readFile).mockImplementation(async path => {
      if (path === 'report.json') return JSON.stringify(summaryFixture);
      throw new Error('ENOENT: no such file');
    });
    vi.mocked(callModel).mockResolvedValue(createMockResult('not valid json'));
    await expect(judgeTriage('report.json', null, null)).rejects.toThrow(
      'Judge returned non-JSON output'
    );
  });
});

describe('judgeTriage - schema validation failure', () => {
  it('should reject when the model response fails schema validation', async () => {
    vi.mocked(readFile).mockImplementation(async path => {
      if (path === 'report.json') return JSON.stringify(summaryFixture);
      throw new Error('ENOENT: no such file');
    });
    vi.mocked(callModel).mockResolvedValue(
      createMockResult(
        JSON.stringify({ score: 11, verdict: 'correct', reasoning: 'x', hallucinations: [] })
      )
    );
    await expect(judgeTriage('report.json', null, null)).rejects.toThrow(
      'Judge output failed schema validation'
    );
  });
});

describe('judgeTriage - overwrite guard', () => {
  it('should refuse to overwrite the input file when triageFile resolves into generatedCasesDir', async () => {
    const triagePath = join(aiConfig.generatedCasesDir, 'report.json');
    vi.mocked(readFile).mockImplementation(async path => {
      if (path === triagePath) return JSON.stringify(summaryFixture);
      throw new Error('ENOENT: no such file');
    });
    vi.mocked(callModel).mockResolvedValue(createMockResult());
    await expect(judgeTriage(triagePath, null, null)).rejects.toThrow(
      'Refusing to overwrite the input file'
    );
  });
});

describe('judgeTriage - markdown fence stripping', () => {
  it('should parse model output wrapped in ```json fences', async () => {
    vi.mocked(readFile).mockImplementation(async path => {
      if (path === 'checkout-button-disabled.triage.json') return JSON.stringify(summaryFixture);
      throw new Error('ENOENT: no such file');
    });
    const fencedContent = '```json\n' + JSON.stringify(validVerdict) + '\n```';
    vi.mocked(callModel).mockResolvedValue(createMockResult(fencedContent));
    const result = await judgeTriage('checkout-button-disabled.triage.json', null, null);
    expect(result.verdict.score).toBe(9);
    expect(result.verdict.verdict).toBe('correct');
  });
});
