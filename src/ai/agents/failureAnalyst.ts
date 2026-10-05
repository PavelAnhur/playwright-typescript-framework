import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { aiConfig } from '../config';
import { callModel } from '../dshClient';
import {
  buildFailureAnalystUser,
  failureAnalystSystem,
  type FailureContext,
} from '../prompts/failureAnalyst';
import { FailureHypothesisSchema, type FailureHypothesis } from '../schemas';

const AGENT = 'failure-analyst';

/**
 * Parses a Playwright failure fixture: extracts "Test title", "Test file",
 * "--- ERROR MESSAGE ---", "--- STACK TRACE ---", "--- EXTRA CONTEXT ---".
 * Anything missing is left undefined.
 */
function parseFixture(raw: string): FailureContext {
  const lines = raw.split('\n');
  let testTitle = '';
  let testFile = '';
  const errorMessage: string[] = [];
  const stackTrace: string[] = [];
  const extraContext: string[] = [];
  type Section = 'errorMessage' | 'stackTrace' | 'extraContext';
  let current: Section | null = null;
  const sectionMap: Record<string, Section> = {
    '--- ERROR MESSAGE ---': 'errorMessage',
    '--- STACK TRACE ---': 'stackTrace',
    '--- EXTRA CONTEXT ---': 'extraContext',
  };
  const push = (section: Section, line: string): void => {
    if (section === 'errorMessage') errorMessage.push(line);
    else if (section === 'stackTrace') stackTrace.push(line);
    else extraContext.push(line);
  };
  for (const line of lines) {
    if (line.startsWith('Test title:')) {
      testTitle = line.replace('Test title:', '').trim();
      continue;
    }
    if (line.startsWith('Test file:')) {
      testFile = line.replace('Test file:', '').trim();
      continue;
    }
    const key = line.trim();
    const section = sectionMap[key];
    if (section !== undefined) {
      current = section;
      continue;
    }
    if (current !== null) {
      push(current, line);
    }
  }
  const stack = stackTrace.join('\n').trim();
  const extra = extraContext.join('\n').trim();
  return {
    testTitle,
    testFile,
    errorMessage: errorMessage.join('\n').trim(),
    ...(stack !== '' && { stackTrace: stack }),
    ...(extra !== '' && { extraContext: extra }),
  };
}

export async function analyzeFailure(
  fixtureFile: string
): Promise<{ hypothesis: FailureHypothesis; outputPath: string }> {
  const raw = await readFile(fixtureFile, 'utf8');
  const ctx = parseFixture(raw);

  if (!ctx.errorMessage) {
    throw new Error(`Fixture ${fixtureFile} has no error message section`);
  }

  const result = await callModel({
    agent: AGENT,
    messages: [
      { role: 'system', content: failureAnalystSystem },
      { role: 'user', content: buildFailureAnalystUser(ctx) },
    ],
    metadata: { fixtureFile: basename(fixtureFile), testTitle: ctx.testTitle },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.content);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Model returned non-JSON output: ${msg}\n\nRaw:\n${result.content.slice(0, 500)}`);
  }

  const validated = FailureHypothesisSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Model output failed schema validation: ${validated.error.message}\n\nRaw:\n${result.content.slice(0, 500)}`
    );
  }

  await mkdir(aiConfig.generatedCasesDir, { recursive: true });
  const outputName = basename(fixtureFile).replace(/\.txt$/, '.triage.json');
  const outputPath = join(aiConfig.generatedCasesDir, outputName);
  await writeFile(outputPath, JSON.stringify(validated.data, null, 2), 'utf8');

  return { hypothesis: validated.data, outputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target =
    process.argv[2] ?? join(aiConfig.projectRoot, 'fixtures', 'failures', 'checkout-button-disabled.txt');

  analyzeFailure(target)
    .then(({ hypothesis, outputPath }) => {
      console.log(`✅ category: ${hypothesis.category}, confidence: ${hypothesis.confidence}`);
      console.log(`📄 written: ${outputPath}`);
      console.log('');
      console.log(hypothesis.hypothesis);
    })
    .catch((error) => {
      console.error('❌', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
