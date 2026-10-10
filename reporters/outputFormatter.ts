import type { TriagedFailure } from './aiTriageTypes';

export class OutputFormatter {
  print(triaged: TriagedFailure[], skipped: number, summaryPath: string): void {
    const byCategory = this.countByCategory(triaged);
    this.printHeader(byCategory, skipped);
    this.printProductBugSuspects(triaged);
    this.printFlakeResults(triaged);
    this.printFlakeFailures(triaged);
    console.log(`\n  full summary: ${summaryPath}`);
    console.log('─── end ai-triage ───\n');
  }

  private countByCategory(triaged: TriagedFailure[]) {
    const counts = { product_bug: 0, flake: 0, test_issue: 0, environment: 0, unavailable: 0 };
    for (const t of triaged) {
      if (t.hypothesis) counts[t.hypothesis.category]++;
      else counts.unavailable++;
    }
    return counts;
  }

  private printHeader(
    byCategory: {
      product_bug: number;
      flake: number;
      test_issue: number;
      environment: number;
      unavailable: number;
    },
    skipped: number
  ): void {
    console.log('\n─── ai-triage summary ───');
    console.log(`  product_bug:  ${byCategory.product_bug}`);
    console.log(`  flake:        ${byCategory.flake}`);
    console.log(`  test_issue:   ${byCategory.test_issue}`);
    console.log(`  environment:  ${byCategory.environment}`);
    if (byCategory.unavailable > 0) console.log(`  unavailable:  ${byCategory.unavailable}`);
    if (skipped > 0) console.log(`  skipped:      ${skipped}`);
  }

  private printProductBugSuspects(triaged: TriagedFailure[]): void {
    const suspects = triaged.filter(t => t.hypothesis?.category === 'product_bug');
    if (suspects.length === 0) return;
    console.log('\n  product bug suspects:');
    for (const s of suspects) {
      const flakeNote =
        s.flake !== null && s.flake.classification !== 'not_reproduced'
          ? ` (flake detected: ${s.flake.classification} — likely not a product bug)`
          : '';
      console.log(`    • ${s.testTitle}${flakeNote}`);
      console.log(`      ${s.hypothesis?.hypothesis.slice(0, 140)}...`);
    }
  }

  private printFlakeResults(triaged: TriagedFailure[]): void {
    const withFlake = triaged.filter(t => t.flake !== null);
    if (withFlake.length === 0) return;
    console.log('\n  flake detection results:');
    for (const f of withFlake) {
      console.log(
        `    • ${f.testTitle} → ${f.flake?.classification} (${f.flake?.totalDurationMs}ms)`
      );
    }
  }

  private printFlakeFailures(triaged: TriagedFailure[]): void {
    const flakeFailed = triaged.filter(t => t.flakeError !== null);
    if (flakeFailed.length === 0) return;
    console.log('\n  flake detection failures:');
    for (const f of flakeFailed) {
      console.log(`    • ${f.testTitle} → ${f.flakeError?.slice(0, 100)}`);
    }
  }
}
