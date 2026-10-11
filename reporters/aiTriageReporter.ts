import { aiConfig } from '@ai/config';
import { FlakeDecisionGate } from '@ai/tools/flakeDecisionGate';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import type { RawFailure } from './aiTriageTypes';
import { OutputFormatter } from './outputFormatter';
import { SummaryEngine } from './summaryEngine';
import { TriageEngine } from './triageEngine';

const OUTPUT_DIR = 'test-results';
const ROOT_DIR = process.cwd();

class AiTriageReporter implements Reporter {
  private failures: RawFailure[] = [];
  private flakeGate: FlakeDecisionGate;
  private triageEngine: TriageEngine;
  private summaryEngine: SummaryEngine;
  private outputFormatter = new OutputFormatter();

  constructor(options?: { enableFlakeDetection?: boolean; maxFlakeDetections?: number }) {
    this.flakeGate = new FlakeDecisionGate(
      options?.enableFlakeDetection ?? true,
      options?.maxFlakeDetections ?? 3
    );
    this.triageEngine = new TriageEngine(this.flakeGate);
    this.summaryEngine = new SummaryEngine(ROOT_DIR, OUTPUT_DIR, 0);
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.failures = [];
    this.flakeGate.reset();
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
    const triaged = await this.triageEngine.run(this.failures);
    const skipped = this.failures.length - triaged.length;
    const summaryPath = await this.summaryEngine.write(triaged, skipped);
    this.outputFormatter.print(triaged, skipped, summaryPath);
  }
}

export default AiTriageReporter;
