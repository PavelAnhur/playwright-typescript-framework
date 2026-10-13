import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { aiConfig } from '../config';
import { callModel } from '../dshClient';
import { buildJudgeUser, judgeSystem } from '../prompts/judge';
import {
  FailureHypothesisSchema,
  JudgeVerdictSchema,
  type FailureHypothesis,
  type JudgeVerdict,
} from '../schemas';

const AGENT = 'judge';

interface TriageSummary {
  failures?: Array<{ hypothesis: FailureHypothesis | null; errorMessage: string }>;
  hypothesis?: string;
  category?: string;
  confidence?: string;
  evidence?: string[];
  sourceContext?: string;
  sourceError?: string;
}

async function loadTriage(
  triageFile: string
): Promise<{ hypothesis: unknown; errorContext: string }> {
  const raw = await readFile(triageFile, 'utf8');
  const parsed = JSON.parse(raw) as TriageSummary;
  if (parsed.failures && parsed.failures.length > 0 && parsed.failures[0]) {
    const first = parsed.failures[0];
    if (!first.hypothesis) {
      throw new Error(`First failure in ${triageFile} has no hypothesis (triage unavailable)`);
    }
    return { hypothesis: first.hypothesis, errorContext: first.errorMessage };
  }
  return { hypothesis: parsed, errorContext: parsed.sourceContext ?? parsed.sourceError ?? '' };
}

interface JudgeInputs {
  analysis: FailureHypothesis;
  errorContext: string;
  testSource: string | undefined;
}

async function loadJudgeInputs(
  triageFile: string,
  errorContextFile: string | null,
  testSourceFile: string | null
): Promise<JudgeInputs> {
  const { hypothesis: rawHypothesis, errorContext: summaryError } = await loadTriage(triageFile);
  const validated = FailureHypothesisSchema.safeParse(rawHypothesis);
  if (!validated.success) {
    throw new Error(
      `Triage file ${triageFile} is not a valid hypothesis: ${validated.error.message}`
    );
  }
  let errorContext = summaryError;
  if (errorContextFile !== null) {
    try {
      errorContext = await readFile(errorContextFile, 'utf8');
    } catch {
      if (!errorContext) throw new Error(`Cannot read error context from ${errorContextFile}`);
    }
  }
  if (!errorContext) {
    throw new Error(
      'No error context available — pass an error context file or a summary with errorMessage'
    );
  }
  let testSource: string | undefined;
  if (testSourceFile !== null) {
    try {
      testSource = await readFile(testSourceFile, 'utf8');
    } catch {
      testSource = undefined;
    }
  }
  return { analysis: validated.data, errorContext, testSource };
}

async function requestVerdict(inputs: JudgeInputs, triageFile: string): Promise<JudgeVerdict> {
  const userPrompt = buildJudgeUser({
    errorContext: inputs.errorContext,
    ...(inputs.testSource !== undefined && { testSource: inputs.testSource }),
    hypothesis: inputs.analysis.hypothesis,
    category: inputs.analysis.category,
    confidence: inputs.analysis.confidence,
    evidence: inputs.analysis.evidence,
  });
  const result = await callModel({
    agent: AGENT,
    messages: [
      { role: 'system', content: judgeSystem },
      { role: 'user', content: userPrompt },
    ],
    metadata: { triageFile: basename(triageFile) },
  });
  let responseParsed: unknown;
  try {
    responseParsed = JSON.parse(result.content);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Judge returned non-JSON output: ${msg}\n\nRaw:\n${result.content.slice(0, 500)}`,
      { cause: error }
    );
  }
  const verdict = JudgeVerdictSchema.safeParse(responseParsed);
  if (!verdict.success) {
    throw new Error(
      `Judge output failed schema validation: ${verdict.error.message}\n\nRaw:\n${result.content.slice(0, 500)}`
    );
  }
  return verdict.data;
}

async function writeVerdict(triageFile: string, verdict: JudgeVerdict): Promise<string> {
  const outputName = basename(triageFile).replace(/\.triage\.json$/, '.judge.json');
  const outputPath = join(aiConfig.generatedCasesDir, outputName);
  const resolvedInput = resolve(dirname(resolve(triageFile)), basename(resolve(triageFile)));
  if (resolvedInput === outputPath) {
    throw new Error(`Refusing to overwrite the input file: ${outputPath}`);
  }
  await writeFile(outputPath, JSON.stringify(verdict, null, 2), 'utf8');
  return outputPath;
}

export async function judgeTriage(
  triageFile: string,
  errorContextFile: string | null,
  testSourceFile: string | null = null
): Promise<{ verdict: JudgeVerdict; outputPath: string }> {
  const inputs = await loadJudgeInputs(triageFile, errorContextFile, testSourceFile);
  const verdict = await requestVerdict(inputs, triageFile);
  const outputPath = await writeVerdict(triageFile, verdict);
  return { verdict, outputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const triageFile =
    process.argv[2] ?? join(aiConfig.generatedCasesDir, 'checkout-button-disabled.triage.json');
  const errorContextFile = process.argv[3] ?? null;
  const testSourceFile = process.argv[4] ?? null;
  judgeTriage(triageFile, errorContextFile, testSourceFile)
    .then(({ verdict, outputPath }) => {
      console.log(`✅ score: ${verdict.score}/10, verdict: ${verdict.verdict}`);
      if (verdict.hallucinations.length > 0) {
        console.log(`⚠️  hallucinations: ${verdict.hallucinations.length}`);
        for (const h of verdict.hallucinations) console.log(`   - ${h}`);
      } else {
        console.log('✅ no hallucinations detected');
      }
      console.log(`📄 written: ${outputPath}`);
      console.log('');
      console.log(verdict.reasoning);
    })
    .catch(error => {
      console.error('❌', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
