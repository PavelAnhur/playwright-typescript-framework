import { analyzeFailures } from '@ai/agents/failureAnalyst';
import type { FailureHypothesis } from '@ai/schemas';
import type { FlakeDecisionGate } from '@ai/tools/flakeDecisionGate';
import type { ContextInput, RawFailure, TriagedFailure } from './aiTriageTypes';

const MAX_TRIAGE = 10;

export class TriageEngine {
  constructor(
    private readonly flakeGate: FlakeDecisionGate
  ) {}

  async run(rawFailures: RawFailure[]): Promise<TriagedFailure[]> {
    const { toTriage } = this.prepareInput(rawFailures);
    const contexts = this.buildContexts(toTriage);
    return this.executeBatch(contexts, toTriage);
  }

  private prepareInput(failures: RawFailure[]) {
    const toTriage = failures.slice(0, MAX_TRIAGE);
    console.log(
      `\n🤖 ai-triage: analyzing ${toTriage.length} failure(s)${failures.length > MAX_TRIAGE ? ` (${failures.length - MAX_TRIAGE} more skipped, cap ${MAX_TRIAGE})` : ''}...\n`
    );
    return { toTriage };
  }

  private buildContexts(toTriage: RawFailure[]): ContextInput[] {
    return toTriage.map(({ test, result }) => ({
      testTitle: test.title,
      testFile: test.location.file,
      errorMessage: result.error?.message ?? '',
      stackTrace: result.error?.stack ?? undefined,
    }));
  }

  private async executeBatch(
    contexts: ContextInput[],
    toTriage: RawFailure[]
  ): Promise<TriagedFailure[]> {
    try {
      const hypotheses = await this.runBatchTriage(contexts);
      return this.pairResults(hypotheses, toTriage);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ⚠️  batch triage failed: ${msg.slice(0, 80)}`);
      return toTriage.map(f => this.createFallbackEntry(f, msg));
    }
  }

  private async runBatchTriage(contexts: ContextInput[]): Promise<FailureHypothesis[]> {
    const { hypotheses } = await analyzeFailures(contexts);
    return hypotheses;
  }

  private async pairResults(
    hypotheses: FailureHypothesis[],
    toTriage: RawFailure[]
  ): Promise<TriagedFailure[]> {
    const triaged: TriagedFailure[] = [];
    for (let i = 0; i < hypotheses.length; i++) {
      const failure = toTriage[i];
      if (!failure || !hypotheses[i]) continue;
      const { test, result } = failure;
      const hypothesis = hypotheses[i]!;
      console.log(`  ✅ ${test.title} → ${hypothesis.category} (${hypothesis.confidence})`);
      const flake = await this.flakeGate.maybeDetect(test, hypothesis);
      triaged.push({
        testTitle: test.title,
        testFile: test.location.file,
        errorMessage: result.error?.message ?? '',
        hypothesis,
        triageError: null,
        flake: flake.result,
        flakeError: flake.error,
      });
    }
    return triaged;
  }

  private createFallbackEntry(failure: RawFailure, errorMsg: string): TriagedFailure {
    const { test, result } = failure;
    return {
      testTitle: test.title,
      testFile: test.location.file,
      errorMessage: result.error?.message ?? '',
      hypothesis: null,
      triageError: errorMsg,
      flake: null,
      flakeError: null,
    };
  }
}
