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
import { aiConfig } from '../src/ai/config';
import type { FailureContext } from '../src/ai/prompts/failureAnalyst.ts';
import type { FailureHypothesis } from '../src/ai/schemas.ts';
import { detectFlake, type FlakeDetectionResult } from '../src/ai/tools/detectFlake';

interface TriagedFailure {
  testTitle: string;
  testFile: string;
  errorMessage: string;
  hypothesis: FailureHypothesis | null;
  triageError: string | null;
  flake: FlakeDetectionResult | null;
  flakeError: string | null;
}

interface SummaryFile {
  generatedAt: string;
  totalFailed: number;
  triaged: number;
  skipped: number;
  flakeDetectionsRun: number;
  flakeDetectionsFailed: number;
  flakeDetectionsSkipped: number;
  failures: TriagedFailure[];
}

interface ReporterOptions {
  enableFlakeDetection?: boolean;
  maxFlakeDetections?: number;
}

const MAX_TRIAGE = 10;

class AiTriageReporter implements Reporter {
  private failures: Array<{ test: TestCase; result: TestResult }> = [];
  private outputDir = 'test-results';
  private rootDir = process.cwd();
  private enableFlakeDetection: boolean;
  private maxFlakeDetections: number;
  private flakeRunsSoFar = 0;

  constructor(options: ReporterOptions = {}) {
    this.enableFlakeDetection = options.enableFlakeDetection ?? true;
    this.maxFlakeDetections = options.maxFlakeDetections ?? 3;
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.failures = [];
    this.flakeRunsSoFar = 0;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.failures.push({ test, result });
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (!aiConfig.hasValidConfig) {
      console.log('\n🤖 ai-triage: AI configuration not available, skipping failure analysis\n');
      return;
    }
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
      const entry = await this.triageOne(test, result);
      triaged.push(entry);
    }
    const flakeDetectionsRun = triaged.filter(t => t.flake !== null).length;
    const flakeDetectionsFailed = triaged.filter(t => t.flakeError !== null).length;
    const flakeDetectionsSkipped = triaged.filter(
      t =>
        t.hypothesis !== null &&
        t.flake === null &&
        t.flakeError === null &&
        this.shouldConsiderFlake(t.hypothesis)
    ).length;
    const summary: SummaryFile = {
      generatedAt: new Date().toISOString(),
      totalFailed: this.failures.length,
      triaged: triaged.length,
      skipped,
      flakeDetectionsRun,
      flakeDetectionsFailed,
      flakeDetectionsSkipped,
      failures: triaged,
    };
    await mkdir(join(this.rootDir, this.outputDir), { recursive: true });
    const summaryPath = join(this.rootDir, this.outputDir, 'ai-triage-summary.json');
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    this.printSummary(triaged, skipped, summaryPath);
  }

  private shouldConsiderFlake(hypothesis: FailureHypothesis): boolean {
    const isFlakeCategory = hypothesis.category === 'test_issue' || hypothesis.category === 'flake';
    const isLowConfidenceProductBug =
      hypothesis.category === 'product_bug' &&
      (hypothesis.confidence === 'low' || hypothesis.confidence === 'medium');
    return isFlakeCategory || isLowConfidenceProductBug;
  }

  private async triageOne(test: TestCase, result: TestResult): Promise<TriagedFailure> {
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
      console.log(`  ✅ ${test.title} → ${hypothesis.category} (${hypothesis.confidence})`);
      const flake = await this.maybeDetectFlake(test, hypothesis);
      return {
        testTitle: test.title,
        testFile: test.location.file,
        errorMessage,
        hypothesis,
        triageError: null,
        flake: flake.result,
        flakeError: flake.error,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ⚠️  ${test.title} → triage unavailable (${msg.slice(0, 80)})`);
      return {
        testTitle: test.title,
        testFile: test.location.file,
        errorMessage,
        hypothesis: null,
        triageError: msg,
        flake: null,
        flakeError: null,
      };
    }
  }

  private async maybeDetectFlake(
    test: TestCase,
    hypothesis: FailureHypothesis
  ): Promise<{ result: FlakeDetectionResult | null; error: string | null }> {
    if (!this.enableFlakeDetection) return { result: null, error: null };
    if (!this.shouldConsiderFlake(hypothesis)) {
      return { result: null, error: null };
    }
    if (this.flakeRunsSoFar >= this.maxFlakeDetections) {
      console.log(`  ⏭️  ${test.title} → flake detection skipped (cap ${this.maxFlakeDetections})`);
      return { result: null, error: null };
    }
    this.flakeRunsSoFar++;
    const project = test.parent.project()?.name ?? 'api';
    const suitePath = test.parent.project()?.testDir;
    try {
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
        const flakeNote =
          s.flake !== null && s.flake.classification !== 'not_reproduced'
            ? ` (flake detected: ${s.flake.classification} — likely not a product bug)`
            : '';
        console.log(`    • ${s.testTitle}${flakeNote}`);
        console.log(`      ${s.hypothesis?.hypothesis.slice(0, 140)}...`);
      }
    }
    const withFlake = triaged.filter(t => t.flake !== null);
    if (withFlake.length > 0) {
      console.log('\n  flake detection results:');
      for (const f of withFlake) {
        console.log(
          `    • ${f.testTitle} → ${f.flake?.classification} (${f.flake?.totalDurationMs}ms)`
        );
      }
    }
    const flakeFailed = triaged.filter(t => t.flakeError !== null);
    if (flakeFailed.length > 0) {
      console.log('\n  flake detection failures:');
      for (const f of flakeFailed) {
        console.log(`    • ${f.testTitle} → ${f.flakeError?.slice(0, 100)}`);
      }
    }
    console.log(`\n  full summary: ${summaryPath}`);
    console.log('─── end ai-triage ───\n');
  }
}

export default AiTriageReporter;
