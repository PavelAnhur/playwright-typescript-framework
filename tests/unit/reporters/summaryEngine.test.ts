import { writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FlakeDetectionResult } from '@ai/tools/detectFlake';
import type { FailureHypothesis } from '@ai/schemas';
import type { SummaryFile, TriagedFailure } from '../../../reporters/aiTriageTypes';
import { SummaryEngine } from '../../../reporters/summaryEngine';

const mockShouldConsiderFlake = vi.fn((h: { category?: string }) => {
  const cat = h.category;
  if (cat === 'test_issue' || cat === 'flake') return true;
  if (cat === 'product_bug') return false;
  return false;
});

vi.mock('@ai/tools/flakeDecisionGate', () => ({
  shouldConsiderFlake: (h: { category?: string }) => mockShouldConsiderFlake(h),
}));

vi.mock('node:fs/promises');

function makeFixture(
  hypothesisCategory: FailureHypothesis['category'] | null,
  flake: FlakeDetectionResult | null,
  flakeError: string | null
): TriagedFailure {
  const hypothesis: FailureHypothesis | null = hypothesisCategory
    ? {
        category: hypothesisCategory,
        hypothesis: 'dummy hypothesis text',
        confidence: 'high',
        evidence: ['placeholder'],
      }
    : null;

  return {
    testTitle: 'should do the thing',
    testFile: 'tests/specs/ui/example.spec.ts',
    errorMessage: 'expected true to be false',
    hypothesis,
    triageError: null,
    flake,
    flakeError,
  };
}

type WriteCall = [string, string | Buffer, encoding?: string];

function capturedSummary(): SummaryFile {
  const writeCalls = vi.mocked(writeFile).mock.calls! as WriteCall[];
  expect(writeCalls.length).toBeGreaterThan(0);
  const call = writeCalls[0]!;
  const content = call[1] as string;
  return JSON.parse(content) as SummaryFile;
}

describe('unit', () => {
  describe('SummaryEngine counts', () => {
    beforeEach(() => {
      mockShouldConsiderFlake.mockClear();
      mockShouldConsiderFlake.mockImplementation((h: { category?: string }) => {
        const cat = h.category;
        if (cat === 'test_issue' || cat === 'flake') return true;
        if (cat === 'product_bug') return false;
        return false;
      });
      vi.mocked(writeFile).mockClear();
    });

    it('counts flakeDetectionsRun and flakeDetectionsFailed', async () => {
      const flakeA: FlakeDetectionResult = {
        spec: 'a.spec.ts',
        suite: null,
        classification: 'flake_parallel',
        recommendation: '',
        phases: [],
        totalDurationMs: 0,
      };
      const flakeB: FlakeDetectionResult = {
        spec: 'b.spec.ts',
        suite: null,
        classification: 'deterministic_fail',
        recommendation: '',
        phases: [],
        totalDurationMs: 0,
      };

      const triaged = [makeFixture(null, flakeA, null), makeFixture(null, flakeB, 'timeout')];

      const engine = new SummaryEngine('/tmp', 'reports', 5);
      const summaryPath = await engine.write(triaged, 2);

      expect(summaryPath).toContain('ai-triage-summary.json');

      const summary = capturedSummary();

      // flakeDetectionsRun: both have flake !== null
      expect(summary.flakeDetectionsRun).toBe(2);
      // flakeDetectionsFailed: only one has flakeError !== null
      expect(summary.flakeDetectionsFailed).toBe(1);
      // flakeDetectionsSkipped: neither has hypothesis, so none qualify
      expect(summary.flakeDetectionsSkipped).toBe(0);
    });

    it('returns zero counts when triaged is empty', async () => {
      const engine = new SummaryEngine('/tmp', 'reports', 3);
      const summaryPath = await engine.write([], 1);

      expect(summaryPath).toContain('ai-triage-summary.json');

      const summary = capturedSummary();

      expect(summary.flakeDetectionsRun).toBe(0);
      expect(summary.flakeDetectionsFailed).toBe(0);
      expect(summary.flakeDetectionsSkipped).toBe(0);
    });

    it('counts flakeDetectionsSkipped for shouldConsiderFlake=true items', async () => {
      // hypothesis=test_issue → shouldConsiderFlake=true, flake=null, flakeError=null
      const itemA = makeFixture('test_issue', null, null);
      // hypothesis=flake → shouldConsiderFlake=true, flake=null, flakeError=null
      const itemB = makeFixture('flake', null, null);
      // hypothesis=product_bug(high) → shouldConsiderFlake=false, flake=null, flakeError=null
      const itemC = makeFixture('product_bug', null, null);

      const triaged = [itemA, itemB, itemC];

      const engine = new SummaryEngine('/tmp', 'reports', 3);
      const summaryPath = await engine.write(triaged, 0);

      expect(summaryPath).toContain('ai-triage-summary.json');

      const summary = capturedSummary();

      // flakeDetectionsSkipped: itemA (test_issue) + itemB (flake) = 2
      // itemC excluded because shouldConsiderFlake returns false
      expect(summary.flakeDetectionsSkipped).toBe(2);
      expect(mockShouldConsiderFlake).toHaveBeenCalledTimes(3);
    });

    it('excludes shouldConsiderFlake=false items from flakeDetectionsSkipped', async () => {
      mockShouldConsiderFlake.mockReturnValue(false);

      // hypothesis=test_issue but shouldConsiderFlake returns false
      const itemA = makeFixture('test_issue', null, null);
      // hypothesis=flake but shouldConsiderFlake returns false
      const itemB = makeFixture('flake', null, null);

      const triaged = [itemA, itemB];

      const engine = new SummaryEngine('/tmp', 'reports', 2);
      const summaryPath = await engine.write(triaged, 0);

      expect(summaryPath).toContain('ai-triage-summary.json');

      const summary = capturedSummary();

      // Both have hypothesis but shouldConsiderFlake=false → skipped=0
      expect(summary.flakeDetectionsSkipped).toBe(0);
      expect(mockShouldConsiderFlake).toHaveBeenCalledTimes(2);
    });

    it('passes totalFailed, triaged length, and skipped through build output', async () => {
      const engine = new SummaryEngine('/tmp', 'reports', 7);
      await engine.write([makeFixture(null, null, null)], 3);

      const summary = capturedSummary();

      expect(summary.totalFailed).toBe(7);
      expect(summary.triaged).toBe(1);
      expect(summary.skipped).toBe(3);
    });

    it('passthrough failures array unchanged', async () => {
      const fixture = makeFixture('test_issue', null, null);
      const engine = new SummaryEngine('/tmp', 'reports', 1);
      await engine.write([fixture], 0);

      const summary = capturedSummary();

      expect(summary.failures).toHaveLength(1);
      const f = summary.failures[0]!;
      expect(f.testTitle).toBe(fixture.testTitle);
      expect(f.testFile).toBe(fixture.testFile);
      expect(f.errorMessage).toBe(fixture.errorMessage);
      expect(f.hypothesis).toEqual(fixture.hypothesis);
      expect(f.flakeError).toBe(fixture.flakeError);
    });

    it('writes ai-triage-summary.json under join(rootDir, outputDir)', async () => {
      const engine = new SummaryEngine('/tmp/myproject', 'reports/triage', 0);
      const summaryPath = await engine.write([], 0);

      expect(summaryPath).toBe('/tmp/myproject/reports/triage/ai-triage-summary.json');
    });
  });
});
