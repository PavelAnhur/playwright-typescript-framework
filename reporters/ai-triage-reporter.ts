import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { analyzeFailure } from '../src/ai/agents/failureAnalyst';
import type { FailureContext } from '../src/ai/prompts/failureAnalyst.ts';
import type { FailureHypothesis } from '../src/ai/schemas.ts';

interface TriagedFailure {
  testTitle: string;
  testFile: string;
  errorMessage: string;
  hypothesis: FailureHypothesis | null;
  triageError: string | null;
}

interface SummaryFile {
  generatedAt: string;
  totalFailed: number;
  triaged: number;
  skipped: number;
  failures: TriagedFailure[];
}

const MAX_TRIAGE = 10;

class AiTriageReporter implements Reporter {
  private failures: Array<{ test: TestCase; result: TestResult }> = [];
  private outputDir = 'test-results';
  private rootDir = process.cwd();

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.failures = [];
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.failures.push({ test, result });
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (this.failures.length === 0) {
      console.log('\n🤖 ai-triage: no failures to analyze\n');
      return;
    }
    const toTriage = this.failures.slice(0, MAX_TRIAGE);
    const skipped = this.failures.length - toTriage.length;
    console.log(
      `\n🤖 ai-triage: analyzing ${toTriage.length} failure(s)${skipped > 0 ? ` (${skipped} more skipped, cap ${MAX_TRIAGE})` : ''}...\n`
    );
    const triaged: TriagedFailure[] = [];
    for (const { test, result } of toTriage) {
      const errorMessage = result.error?.message ?? 'Unknown error';
      const stackTrace = result.error?.stack ?? undefined;
      const ctx: FailureContext = {
        testTitle: test.title,
        testFile: test.location.file,
        errorMessage,
        stackTrace,
      };
      try {
        const { hypothesis } = await analyzeFailure(ctx, {
          source: 'playwright-reporter',
          testFile: test.location.file,
        });
        triaged.push({
          testTitle: test.title,
          testFile: test.location.file,
          errorMessage,
          hypothesis,
          triageError: null,
        });
        console.log(`  ✅ ${test.title} → ${hypothesis.category} (${hypothesis.confidence})`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        triaged.push({
          testTitle: test.title,
          testFile: test.location.file,
          errorMessage,
          hypothesis: null,
          triageError: msg,
        });
        console.log(`  ⚠️  ${test.title} → triage unavailable (${msg.slice(0, 80)})`);
      }
    }
    const summary: SummaryFile = {
      generatedAt: new Date().toISOString(),
      totalFailed: this.failures.length,
      triaged: triaged.length,
      skipped,
      failures: triaged,
    };
    await mkdir(join(this.rootDir, this.outputDir), { recursive: true });
    const summaryPath = join(this.rootDir, this.outputDir, 'ai-triage-summary.json');
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    this.printSummary(triaged, skipped, summaryPath);
  }

  private printSummary(triaged: TriagedFailure[], skipped: number, summaryPath: string): void {
    const byCategory = { product_bug: 0, flake: 0, test_issue: 0, environment: 0, unavailable: 0 };
    for (const t of triaged) {
      if (t.hypothesis) byCategory[t.hypothesis.category]++;
      else byCategory.unavailable++;
    }
    console.log('\n─── ai-triage summary ───');
    console.log(`  product_bug:  ${byCategory.product_bug}`);
    console.log(`  flake:        ${byCategory.flake}`);
    console.log(`  test_issue:   ${byCategory.test_issue}`);
    console.log(`  environment:  ${byCategory.environment}`);
    if (byCategory.unavailable > 0) console.log(`  unavailable:  ${byCategory.unavailable}`);
    if (skipped > 0) console.log(`  skipped:      ${skipped}`);
    const suspects = triaged.filter(t => t.hypothesis?.category === 'product_bug');
    if (suspects.length > 0) {
      console.log('\n  product bug suspects:');
      for (const s of suspects) {
        console.log(`    • ${s.testTitle}`);
        console.log(`      ${s.hypothesis?.hypothesis.slice(0, 140)}...`);
      }
    }
    console.log(`\n  full summary: ${summaryPath}`);
    console.log('─── end ai-triage ───\n');
  }
}

export default AiTriageReporter;
