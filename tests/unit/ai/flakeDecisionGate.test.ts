import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FailureHypothesis } from '@ai/schemas';
import { detectFlake } from '@ai/tools/detectFlake';
import { FlakeDecisionGate } from '@ai/tools/flakeDecisionGate';
import type { Suite, TestCase } from '@playwright/test/reporter';

vi.mock('@ai/tools/detectFlake');

const mockResult = {
  spec: '/tests/example.spec.ts',
  suite: null,
  classification: 'not_reproduced' as const,
  recommendation: 'passed',
  phases: [],
  totalDurationMs: 0,
};

function makeTestCase(title: string): TestCase {
  const mockProject = {
    name: 'api',
    testDir: '/tests',
  };
  const mockParent: Suite = {
    project: () => mockProject,
  } as unknown as Suite;
  return {
    title,
    parent: mockParent,
    location: { file: '/tests/example.spec.ts', line: 0, column: 0 },
  } as unknown as TestCase;
}

describe('unit', () => {
  describe('FlakeDecisionGate.maybeDetect', () => {
    let gate: FlakeDecisionGate;

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(detectFlake).mockResolvedValue(mockResult);
      gate = new FlakeDecisionGate(true, 2);
    });

    it('calls detectFlake when hypothesis is flake-worthy (category flake)', async () => {
      const flakeHypothesis: FailureHypothesis = {
        category: 'flake',
        confidence: 'high',
        hypothesis: 'test is flaky',
        evidence: ['failed once in CI'],
      };
      const result = await gate.maybeDetect(makeTestCase('should pass'), flakeHypothesis);
      expect(detectFlake).toHaveBeenCalledTimes(1);
      expect(result.result).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('calls detectFlake when hypothesis is test_issue', async () => {
      const testIssueHypothesis: FailureHypothesis = {
        category: 'test_issue',
        confidence: 'medium',
        hypothesis: 'fixture not cleaned up',
        evidence: ['state leaked between tests'],
      };
      const result = await gate.maybeDetect(makeTestCase('should pass'), testIssueHypothesis);
      expect(detectFlake).toHaveBeenCalledTimes(1);
      expect(result.result).toBeDefined();
    });

    it('calls detectFlake when product_bug has low confidence', async () => {
      const lowConfBug: FailureHypothesis = {
        category: 'product_bug',
        confidence: 'low',
        hypothesis: 'race condition in API',
        evidence: ['intermittent 500'],
      };
      const result = await gate.maybeDetect(makeTestCase('should pass'), lowConfBug);
      expect(detectFlake).toHaveBeenCalledTimes(1);
      expect(result.result).toBeDefined();
    });

    it('does NOT call detectFlake when hypothesis is product_bug with high confidence', async () => {
      const notFlakeHypothesis: FailureHypothesis = {
        category: 'product_bug',
        confidence: 'high',
        hypothesis: 'button disabled',
        evidence: ['click fails deterministically'],
      };
      const result = await gate.maybeDetect(makeTestCase('should pass'), notFlakeHypothesis);
      expect(detectFlake).not.toHaveBeenCalled();
      expect(result.result).toBeNull();
      expect(result.error).toBeNull();
    });

    it('does NOT call detectFlake when hypothesis is environment', async () => {
      const envHypothesis: FailureHypothesis = {
        category: 'environment',
        confidence: 'low',
        hypothesis: 'server down',
        evidence: ['503 response'],
      };
      const result = await gate.maybeDetect(makeTestCase('should pass'), envHypothesis);
      expect(detectFlake).not.toHaveBeenCalled();
      expect(result.result).toBeNull();
      expect(result.error).toBeNull();
    });

    it('does NOT call detectFlake when gate is disabled', async () => {
      const disabledGate = new FlakeDecisionGate(false, 5);
      const flakeHypothesis: FailureHypothesis = {
        category: 'flake',
        confidence: 'high',
        hypothesis: 'test is flaky',
        evidence: ['failed once in CI'],
      };
      const result = await disabledGate.maybeDetect(makeTestCase('should pass'), flakeHypothesis);
      expect(detectFlake).not.toHaveBeenCalled();
      expect(result.result).toBeNull();
      expect(result.error).toBeNull();
    });

    it('stops calling detectFlake after maxRuns cap is reached', async () => {
      const smallGate = new FlakeDecisionGate(true, 1);
      const flakeHypothesis: FailureHypothesis = {
        category: 'flake',
        confidence: 'high',
        hypothesis: 'test is flaky',
        evidence: ['failed once in CI'],
      };
      await smallGate.maybeDetect(makeTestCase('test 1'), flakeHypothesis);
      expect(detectFlake).toHaveBeenCalledTimes(1);
      await smallGate.maybeDetect(makeTestCase('test 2'), flakeHypothesis);
      expect(detectFlake).toHaveBeenCalledTimes(1);
    });
  });
});
