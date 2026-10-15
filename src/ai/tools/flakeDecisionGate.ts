import type { FailureHypothesis } from '@ai/schemas';
import type { FlakeDetectionResult } from '@ai/tools/detectFlake';
import { detectFlake } from '@ai/tools/detectFlake';
import type { TestCase } from '@playwright/test/reporter';

export function shouldConsiderFlake(hypothesis: FailureHypothesis): boolean {
  const isFlakeCategory = hypothesis.category === 'test_issue' || hypothesis.category === 'flake';
  const isLowConfidenceProductBug =
    hypothesis.category === 'product_bug' &&
    (hypothesis.confidence === 'low' || hypothesis.confidence === 'medium');
  return isFlakeCategory || isLowConfidenceProductBug;
}

export class FlakeDecisionGate {
  constructor(
    private readonly enabled: boolean,
    private readonly maxRuns: number
  ) {}

  reset(): void {
    this.runs = 0;
  }

  async maybeDetect(
    test: TestCase,
    hypothesis: FailureHypothesis
  ): Promise<{
    result: FlakeDetectionResult | null;
    error: string | null;
  }> {
    if (!this.enabled) return { result: null, error: null };
    if (!shouldConsiderFlake(hypothesis)) return { result: null, error: null };
    if (this.runs >= this.maxRuns) {
      console.log(`  ⏭️  ${test.title} → flake detection skipped (cap ${this.maxRuns})`);
      return { result: null, error: null };
    }
    this.runs++;
    try {
      const project = test.parent.project()?.name ?? 'api';
      const suitePath = test.parent.project()?.testDir;
      console.log(`  🔍 ${test.title} → running flake detection...`);
      const result = await detectFlake(test.location.file, project, suitePath);
      console.log(`     ${result.classification} (${result.totalDurationMs}ms)`);
      return { result, error: null };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`     flake detection failed: ${msg.slice(0, 80)}`);
      return { result: null, error: msg };
    }
  }

  private runs = 0;
}
