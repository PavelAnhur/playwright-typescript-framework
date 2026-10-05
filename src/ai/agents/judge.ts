import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { aiConfig } from '../config';
import { callModel } from '../dshClient';
import { buildJudgeUser, judgeSystem } from '../prompts/judge';
import {
  FailureHypothesisSchema,
  JudgeVerdictSchema,
  type JudgeVerdict,
} from '../schemas';

const AGENT = 'judge';

export async function judgeTriage(
  triageFile: string,
  originalFixtureFile: string
): Promise<{ verdict: JudgeVerdict; outputPath: string }> {
  const triageRaw = await readFile(triageFile, 'utf8');
  const fixtureRaw = await readFile(originalFixtureFile, 'utf8');

  const parsed = JSON.parse(triageRaw) as unknown;
  const hypothesis = FailureHypothesisSchema.safeParse(parsed);
  if (!hypothesis.success) {
    throw new Error(`Triage file ${triageFile} is not a valid hypothesis: ${hypothesis.error.message}`);
  }

  const userPrompt = buildJudgeUser({
    originalContext: fixtureRaw,
    hypothesis: hypothesis.data.hypothesis,
    category: hypothesis.data.category,
    confidence: hypothesis.data.confidence,
    evidence: hypothesis.data.evidence,
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
    throw new Error(`Judge returned non-JSON output: ${msg}\n\nRaw:\n${result.content.slice(0, 500)}`);
  }

  const validated = JudgeVerdictSchema.safeParse(responseParsed);
  if (!validated.success) {
    throw new Error(
      `Judge output failed schema validation: ${validated.error.message}\n\nRaw:\n${result.content.slice(0, 500)}`
    );
  }

  const outputName = basename(triageFile).replace(/\.triage\.json$/, '.judge.json');
  const outputPath = join(aiConfig.generatedCasesDir, outputName);
  await writeFile(outputPath, JSON.stringify(validated.data, null, 2), 'utf8');

  return { verdict: validated.data, outputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const triageFile =
    process.argv[2] ?? join(aiConfig.generatedCasesDir, 'checkout-button-disabled.triage.json');
  const fixtureFile =
    process.argv[3] ?? join(aiConfig.projectRoot, 'fixtures', 'failures', 'checkout-button-disabled.txt');

  judgeTriage(triageFile, fixtureFile)
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
