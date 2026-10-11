import { analyzeFailure, analyzeFailures } from '@ai/agents/failureAnalyst';
import type { FailureHypothesis } from '@ai/schemas';
import type { FlakeDecisionGate } from '@ai/tools/flakeDecisionGate';
import type { ContextInput, RawFailure, TriagedFailure } from './aiTriageTypes';

const MAX_TRIAGE = 10;
const MAX_ERROR_MESSAGE = 2000;
const MAX_STACK_TRACE = 4000;

export class TriageEngine {
  constructor(private readonly flakeGate: FlakeDecisionGate) {}

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
    return toTriage.map(({ test, result }) => {
      const errorMessage = result.error?.message ?? '';
      const truncatedMessage = this.truncate(errorMessage, MAX_ERROR_MESSAGE);
      const stackTrace = result.error?.stack;
      const truncatedStack = stackTrace ? this.truncate(stackTrace, MAX_STACK_TRACE) : undefined;
      return {
        testTitle: test.title,
        testFile: test.location.file,
        errorMessage: truncatedMessage,
        stackTrace: truncatedStack,
      };
    });
  }

  private truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '…[truncated]';
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
      return this.fallbackToSingleTriage(contexts, toTriage);
    }
  }

  private async fallbackToSingleTriage(
    contexts: ContextInput[],
    toTriage: RawFailure[]
  ): Promise<TriagedFailure[]> {
    const triaged: TriagedFailure[] = [];
    for (let i = 0; i < contexts.length; i++) {
      const ctx = contexts[i];
      const failure = toTriage[i];
      if (!ctx || !failure) continue;
      try {
        const { hypothesis } = await analyzeFailure(ctx);
        const flake = await this.flakeGate.maybeDetect(failure.test, hypothesis);
        console.log(
          `  ✅ ${failure.test.title} → ${hypothesis.category} (${hypothesis.confidence})`
        );
        triaged.push({
          testTitle: failure.test.title,
          testFile: failure.test.location.file,
          errorMessage: failure.result.error?.message ?? '',
          hypothesis,
          triageError: null,
          flake: flake.result,
          flakeError: flake.error,
        });
      } catch (singleError) {
        const singleMsg = singleError instanceof Error ? singleError.message : String(singleError);
        console.log(
          `  ⚠️  ${failure.test.title} → single triage failed: ${singleMsg.slice(0, 80)}`
        );
        triaged.push(this.createFallbackEntry(failure, singleMsg));
      }
    }
    return triaged;
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
