import { describe, expect, it, vi } from 'vitest';

import type { FlakeDetectionResult } from '@ai/tools/detectFlake';
import type { FailureHypothesis } from '@ai/schemas';
import type { TriagedFailure } from '../../../reporters/aiTriageTypes';
import { OutputFormatter } from '../../../reporters/outputFormatter';

function makeFixture(
  hypothesisCategory: string,
  flakeClassification: string | null
): TriagedFailure {
  const flake: FlakeDetectionResult | null = flakeClassification
    ? {
        spec: 'test.spec.ts',
        suite: null,
        classification: flakeClassification as any,
        recommendation: '',
        phases: [],
        totalDurationMs: 0,
      }
    : null;

  const hypothesis: FailureHypothesis | null = hypothesisCategory
    ? { category: hypothesisCategory, hypothesis: 'dummy hypothesis text', confidence: 0 }
    : null;

  return {
    testTitle: 'should do the thing',
    testFile: 'tests/specs/ui/example.spec.ts',
    errorMessage: 'expected true to be false',
    hypothesis,
    triageError: null,
    flake,
    flakeError: null,
  };
}

describe('OutputFormatter flake-note for product_bug suspects', () => {
  it('must NOT append "likely not a product bug" when flake classification is deterministic_fail', () => {
    const mock = vi.spyOn(console, 'log').mockImplementation(() => {});

    const formatter = new OutputFormatter();
    const fixture = makeFixture('product_bug', 'deterministic_fail');

    formatter.print([fixture], 0, '/tmp/summary.json');

    const output = mock.mock.calls.map((c) => c[0] as string).join('\n');

    expect(output).not.toContain('likely not a product bug');
    expect(output).not.toContain('flake detected');

    mock.mockRestore();
  });

  it('SHOULD append flake note when flake classification is flake_parallel', () => {
    const mock = vi.spyOn(console, 'log').mockImplementation(() => {});

    const formatter = new OutputFormatter();
    const fixture = makeFixture('product_bug', 'flake_parallel');

    formatter.print([fixture], 0, '/tmp/summary.json');

    const output = mock.mock.calls.map((c) => c[0] as string).join('\n');

    expect(output).toContain('flake detected: flake_parallel');

    mock.mockRestore();
  });
});
