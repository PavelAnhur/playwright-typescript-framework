import { describe, expect, it } from 'vitest';

import type { FailureHypothesis } from '@ai/schemas';
import { shouldConsiderFlake } from '@ai/tools/flakeDecisionGate';

describe('unit', () => {
  describe('shouldConsiderFlake predicate', () => {
    const rows: Array<{
      category: FailureHypothesis['category'];
      confidence: FailureHypothesis['confidence'];
      expected: boolean;
    }> = [
      { category: 'product_bug', confidence: 'high', expected: false },
      { category: 'product_bug', confidence: 'medium', expected: true },
      { category: 'product_bug', confidence: 'low', expected: true },
      { category: 'flake', confidence: 'high', expected: true },
      { category: 'flake', confidence: 'medium', expected: true },
      { category: 'flake', confidence: 'low', expected: true },
      { category: 'test_issue', confidence: 'high', expected: true },
      { category: 'test_issue', confidence: 'medium', expected: true },
      { category: 'test_issue', confidence: 'low', expected: true },
      { category: 'environment', confidence: 'high', expected: false },
      { category: 'environment', confidence: 'medium', expected: false },
      { category: 'environment', confidence: 'low', expected: false },
    ];

    it.each(rows)('$category + $confidence → $expected', ({ category, confidence, expected }) => {
      const result = shouldConsiderFlake({
        category,
        confidence,
        hypothesis: 'dummy',
        evidence: ['x'],
      });
      expect(result).toBe(expected);
    });
  });
});
