import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { aiConfig } from '../config';
import { callModel } from '../dshClient';
import {
  batchFailureAnalystSystem,
  buildBatchFailureAnalystUser,
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
  ctx: FailureContext,
  metadata: Record<string, unknown> = {}
): Promise<{ hypothesis: FailureHypothesis; outputPath: string | null }> {
  if (!ctx.errorMessage) {
    throw new Error('FailureContext is missing errorMessage');
  }
  const result = await callModel({
    agent: AGENT,
    messages: [
      { role: 'system', content: failureAnalystSystem },
      { role: 'user', content: buildFailureAnalystUser(ctx) },
    ],
    metadata: { ...metadata, testTitle: ctx.testTitle },
  });
  const validated = validateSingleHypothesis(result.content, result.content);
  const outputName = typeof metadata['outputName'] === 'string' ? metadata['outputName'] : null;
  let outputPath: string | null = null;
  if (outputName !== null) {
    await mkdir(aiConfig.generatedCasesDir, { recursive: true });
    outputPath = join(aiConfig.generatedCasesDir, outputName);
    const enriched = {
      ...validated,
      sourceContext: [
        `Test title: ${ctx.testTitle}`,
        `Test file: ${ctx.testFile}`,
        '',
        '--- ERROR MESSAGE ---',
        ctx.errorMessage,
        ...(ctx.stackTrace ? ['', '--- STACK TRACE ---', ctx.stackTrace] : []),
        ...(ctx.extraContext ? ['', '--- EXTRA CONTEXT ---', ctx.extraContext] : []),
      ].join('\n'),
    };
    await writeFile(outputPath, JSON.stringify(enriched, null, 2), 'utf8');
  }
  return { hypothesis: validated, outputPath };
}

export async function analyzeFailures(
  contexts: FailureContext[]
): Promise<{ hypotheses: FailureHypothesis[] }> {
  if (contexts.length === 0) {
    throw new Error('analyzeFailures requires at least one FailureContext');
  }
  const result = await callModel({
    agent: AGENT,
    messages: [
      { role: 'system', content: batchFailureAnalystSystem },
      { role: 'user', content: buildBatchFailureAnalystUser(contexts) },
    ],
  });
  const parsed = parseJsonResult(result.content);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Model output is not an array. Expected array of FailureHypothesis objects.\n\nRaw:\n${result.content.slice(0, 500)}`
    );
  }
  const validated = parsed.map((item, index) => {
    try {
      return validateSingleHypothesis(item, JSON.stringify(item, null, 2).slice(0, 500));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Item #${index + 1}: ${msg}`, { cause: error });
    }
  });
  return { hypotheses: validated };
}

function parseJsonResult(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Model returned non-JSON output: ${msg}\n\nRaw:\n${content.slice(0, 500)}`, {
      cause: error,
    });
  }
}

function validateSingleHypothesis(parsed: unknown, rawContext?: string): FailureHypothesis {
  const result = FailureHypothesisSchema.safeParse(parsed);
  if (!result.success) {
    const raw = rawContext ?? JSON.stringify(parsed, null, 2).slice(0, 500);
    throw new Error(
      `Model output failed schema validation: ${result.error.message}\n\nRaw:\n${raw}`
    );
  }
  return result.data;
}

async function analyzeFailureFromFile(fixtureFile: string) {
  const raw = await readFile(fixtureFile, 'utf8');
  const ctx = parseFixture(raw);
  const outputName = basename(fixtureFile).replace(/\.txt$/, '.triage.json');
  return analyzeFailure(ctx, { fixtureFile: basename(fixtureFile), outputName });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target =
    process.argv[2] ??
    join(aiConfig.projectRoot, 'fixtures', 'failures', 'checkout-button-disabled.txt');

  analyzeFailureFromFile(target)
    .then(({ hypothesis, outputPath }) => {
      console.log(`✅ category: ${hypothesis.category}, confidence: ${hypothesis.confidence}`);
      if (outputPath) console.log(`📄 written: ${outputPath}`);
      console.log('');
      console.log(hypothesis.hypothesis);
    })
    .catch(error => {
      console.error('❌', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
