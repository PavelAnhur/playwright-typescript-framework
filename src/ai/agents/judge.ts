import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
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
}

async function loadTriage(triageFile: string): Promise<{ hypothesis: unknown; errorContext: string }> {
  const raw = await readFile(triageFile, 'utf8');
  const parsed = JSON.parse(raw) as TriageSummary;
  if (parsed.failures && parsed.failures.length > 0 && parsed.failures[0]) {
    const first = parsed.failures[0];
    if (!first.hypothesis) {
      throw new Error(`First failure in ${triageFile} has no hypothesis (triage unavailable)`);
    }
    return { hypothesis: first.hypothesis, errorContext: first.errorMessage };
  }
  return { hypothesis: parsed, errorContext: '' };
}

export async function judgeTriage(
  triageFile: string,
  errorContextFile: string | null,
  testSourceFile: string | null = null
): Promise<{ verdict: JudgeVerdict; outputPath: string }> {
  const { hypothesis: rawHypothesis, errorContext: summaryError } = await loadTriage(triageFile);
  const validated = FailureHypothesisSchema.safeParse(rawHypothesis);
  if (!validated.success) {
    throw new Error(`Triage file ${triageFile} is not a valid hypothesis: ${validated.error.message}`);
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
    throw new Error('No error context available — pass an error context file or a summary with errorMessage');
  }
  let testSource: string | undefined;
  if (testSourceFile !== null) {
    try {
      testSource = await readFile(testSourceFile, 'utf8');
    } catch {
      testSource = undefined;
    }
  }
  const userPrompt = buildJudgeUser({
    errorContext,
    ...(testSource !== undefined && { testSource }),
    hypothesis: validated.data.hypothesis,
    category: validated.data.category,
    confidence: validated.data.confidence,
    evidence: validated.data.evidence,
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
  const outputName = basename(triageFile).replace(/\.(triage|summary)\.json$/, '.judge.json');
  const outputPath = join(aiConfig.generatedCasesDir, outputName);
  await writeFile(outputPath, JSON.stringify(verdict.data, null, 2), 'utf8');
  return { verdict: verdict.data, outputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const triageFile = process.argv[2];
  const errorContextFile = process.argv[3] ?? null;
  const testSourceFile = process.argv[4] ?? null;
  if (!triageFile) {
    console.error('usage: judge.ts <triage-file> [<error-context-file>] [<test-source-file>]');
    process.exit(1);
  }
  judgeTriage(triageFile, errorContextFile, testSourceFile)
  judgeTriage(triageFile, errorContextFile)
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
    .catch((error) => {
      console.error('❌', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
