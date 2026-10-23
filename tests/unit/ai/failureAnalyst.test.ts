import { writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { analyzeFailure } from '@ai/agents/failureAnalyst';
import type { CallResult } from '@ai/dshClient';
import { callModel } from '@ai/dshClient';
import { failureAnalystSystem } from '@ai/prompts/failureAnalyst';
import type { FailureHypothesis } from '@ai/schemas';

vi.mock('@ai/dshClient');
vi.mock('node:fs/promises');

const mockResponse: FailureHypothesis = {
  hypothesis: 'The button is not disabled when the cart is empty.',
  category: 'product_bug',
  confidence: 'high',
  evidence: ['Expected: disabled', 'Received: enabled'],
};

function createMockResult(content?: string): CallResult {
  return {
    content: content ?? JSON.stringify(mockResponse),
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

describe('unit', () => {
  describe('analyzeFailure - error handling', () => {
    it('should throw when errorMessage is empty', async () => {
      const ctx = { testTitle: 'test', testFile: 'test.spec.ts', errorMessage: '' };
      await expect(analyzeFailure(ctx)).rejects.toThrow('FailureContext is missing errorMessage');
    });

    it('should throw when the model returns non-JSON output', async () => {
      vi.mocked(callModel).mockResolvedValue(createMockResult('not valid json'));
      const ctx = { testTitle: 'test', testFile: 'test.spec.ts', errorMessage: 'fail' };
      await expect(analyzeFailure(ctx)).rejects.toThrow('Model returned non-JSON output');
    });

    it('should throw when the model response fails schema validation', async () => {
      vi.mocked(callModel).mockResolvedValue(
        createMockResult(JSON.stringify({ category: 'not-a-real-category' }))
      );
      const ctx = { testTitle: 'test', testFile: 'test.spec.ts', errorMessage: 'fail' };
      await expect(analyzeFailure(ctx)).rejects.toThrow('Model output failed schema validation');
    });
  });

  describe('analyzeFailure - happy path', () => {
    it('should return parsed hypothesis with all four fields', async () => {
      vi.mocked(callModel).mockResolvedValue(createMockResult());
      const ctx = { testTitle: 'test', testFile: 'test.spec.ts', errorMessage: 'fail' };
      const result = await analyzeFailure(ctx);
      expect(result.hypothesis.hypothesis).toBe(
        'The button is not disabled when the cart is empty.'
      );
      expect(result.hypothesis.category).toBe('product_bug');
      expect(result.hypothesis.confidence).toBe('high');
      expect(result.hypothesis.evidence).toEqual(['Expected: disabled', 'Received: enabled']);
    });
  });

  describe('analyzeFailure - model invocation', () => {
    it('should call model with correct agent and message roles', async () => {
      vi.mocked(callModel).mockResolvedValue(createMockResult());
      const ctx = { testTitle: 'my test', testFile: 'test.spec.ts', errorMessage: 'fail' };
      await analyzeFailure(ctx);
      expect(callModel).toHaveBeenCalledTimes(1);
      const callOptions = vi.mocked(callModel).mock.calls?.[0]?.[0];
      expect(callOptions?.agent).toBe('failure-analyst');
      const messages = callOptions?.messages;
      expect(messages?.[0]?.role).toBe('system');
      expect(messages?.[0]?.content).toBe(failureAnalystSystem);
      expect(messages?.[1]?.role).toBe('user');
      expect(messages?.[1]?.content).toContain('fail');
      expect(messages?.[1]?.content).toContain('my test');
    });

    it('should include testTitle and custom metadata in callModel call', async () => {
      vi.mocked(callModel).mockResolvedValue(createMockResult());
      const ctx = { testTitle: 'my test', testFile: 'test.spec.ts', errorMessage: 'fail' };
      await analyzeFailure(ctx, { customKey: 'customValue' });
      expect(callModel).toHaveBeenCalledTimes(1);
      const callOptions = vi.mocked(callModel).mock.calls?.[0]?.[0];
      expect(callOptions?.metadata?.['testTitle']).toBe('my test');
      expect(callOptions?.metadata?.['customKey']).toBe('customValue');
    });
  });

  describe('analyzeFailure - JSON parsing regression', () => {
    it('should parse the JSON string from callModel before schema validation (regression: db6a844)', async () => {
      const jsonString = JSON.stringify(mockResponse);
      vi.mocked(callModel).mockResolvedValue(createMockResult(jsonString));
      const ctx = { testTitle: 'test', testFile: 'test.spec.ts', errorMessage: 'fail' };
      const result = await analyzeFailure(ctx);
      expect(result.hypothesis).toEqual(mockResponse);
      expect(callModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('analyzeFailure - output file', () => {
    it('should write output file when outputName is provided', async () => {
      vi.mocked(callModel).mockResolvedValue(createMockResult());
      const ctx = { testTitle: 'my test', testFile: 'test.spec.ts', errorMessage: 'fail msg' };
      const result = await analyzeFailure(ctx, { outputName: 'my-test.triage.json' });
      expect(result.outputPath).toContain('my-test.triage.json');
      expect(writeFile).toHaveBeenCalledTimes(1);
      const writeCalls = vi.mocked(writeFile).mock.calls;
      expect(writeCalls?.length).toBeGreaterThan(0);
      const writeArgs = writeCalls[0];
      const content = writeArgs?.[1] as string;
      const parsed = JSON.parse(content);
      expect(parsed.category).toBe('product_bug');
      expect(parsed.hypothesis).toBe('The button is not disabled when the cart is empty.');
      expect(typeof parsed.sourceContext).toBe('string');
      expect(parsed.sourceContext).toContain('Test title: my test');
      expect(parsed.sourceContext).toContain('Test file: test.spec.ts');
      expect(parsed.sourceContext).toContain('fail msg');
    });

    it('should not write output when outputName is absent', async () => {
      vi.mocked(callModel).mockResolvedValue(createMockResult());
      const ctx = { testTitle: 'test', testFile: 'test.spec.ts', errorMessage: 'fail' };
      const result = await analyzeFailure(ctx, {});
      expect(writeFile).not.toHaveBeenCalled();
      expect(result.outputPath).toBeNull();
    });

    it('should include stack trace in sourceContext when provided', async () => {
      vi.mocked(callModel).mockResolvedValue(createMockResult());
      const ctx = {
        testTitle: 'test',
        testFile: 'test.spec.ts',
        errorMessage: 'fail',
        stackTrace: 'Error at line 42',
      };
      const result = await analyzeFailure(ctx, { outputName: 'stack.triage.json' });
      expect(result.outputPath).toContain('stack.triage.json');
      expect(writeFile).toHaveBeenCalledTimes(1);
      const writeCalls = vi.mocked(writeFile).mock.calls;
      expect(writeCalls?.length).toBeGreaterThan(0);
      const writeArgs = writeCalls[0];
      const content = writeArgs?.[1] as string;
      const parsed = JSON.parse(content);
      expect(typeof parsed.sourceContext).toBe('string');
      expect(parsed.sourceContext).toContain('--- STACK TRACE ---');
      expect(parsed.sourceContext).toContain('Error at line 42');
    });

    it('should include extra context in sourceContext when provided', async () => {
      vi.mocked(callModel).mockResolvedValue(createMockResult());
      const ctx = {
        testTitle: 'test',
        testFile: 'test.spec.ts',
        errorMessage: 'fail',
        extraContext: 'Fails consistently in CI',
      };
      const result = await analyzeFailure(ctx, { outputName: 'extra.triage.json' });
      expect(result.outputPath).toContain('extra.triage.json');
      expect(writeFile).toHaveBeenCalledTimes(1);
      const writeCalls = vi.mocked(writeFile).mock.calls;
      expect(writeCalls?.length).toBeGreaterThan(0);
      const writeArgs = writeCalls[0];
      const content = writeArgs?.[1] as string;
      const parsed = JSON.parse(content);
      expect(typeof parsed.sourceContext).toBe('string');
      expect(parsed.sourceContext).toContain('--- EXTRA CONTEXT ---');
      expect(parsed.sourceContext).toContain('Fails consistently in CI');
    });
  });

  describe('analyzeFailure - markdown fence stripping', () => {
    it('should parse model output wrapped in ```json fences', async () => {
      const fencedContent = '```json\n' + JSON.stringify(mockResponse) + '\n```';
      vi.mocked(callModel).mockResolvedValue(createMockResult(fencedContent));
      const ctx = { testTitle: 'test', testFile: 'test.spec.ts', errorMessage: 'fail' };
      const result = await analyzeFailure(ctx);
      expect(result.hypothesis.category).toBe('product_bug');
      expect(result.hypothesis.confidence).toBe('high');
    });
  });
});
