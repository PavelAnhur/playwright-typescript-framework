import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SummaryFile, TriagedFailure } from './aiTriageTypes';
import { shouldConsiderFlake } from '@ai/tools/flakeDecisionGate';

export class SummaryEngine {
  constructor(
    private readonly rootDir: string,
    private readonly outputDir: string,
    private readonly totalFailed: number
  ) {}

  async write(triaged: TriagedFailure[], skipped: number): Promise<string> {
    const summary = this.build(triaged, skipped);
    const summaryPath = join(this.rootDir, this.outputDir, 'ai-triage-summary.json');
    await mkdir(join(this.rootDir, this.outputDir), { recursive: true });
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    return summaryPath;
  }

  private build(triaged: TriagedFailure[], skipped: number): SummaryFile {
    return {
      generatedAt: new Date().toISOString(),
      totalFailed: this.totalFailed,
      triaged: triaged.length,
      skipped,
      ...this.computeFlakeStats(triaged),
      failures: triaged,
    };
  }

  private computeFlakeStats(triaged: TriagedFailure[]) {
    return {
      flakeDetectionsRun: triaged.filter(t => t.flake !== null).length,
      flakeDetectionsFailed: triaged.filter(t => t.flakeError !== null).length,
      flakeDetectionsSkipped: triaged.filter(
        t =>
          t.hypothesis !== null &&
          t.flake === null &&
          t.flakeError === null &&
          shouldConsiderFlake(t.hypothesis)
      ).length,
    };
  }
}
