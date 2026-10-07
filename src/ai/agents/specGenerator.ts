import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aiConfig } from '../config';
import { callModel } from '../dshClient';
import {
  buildSpecGeneratorUser,
  specGeneratorSystem,
  type SpecGeneratorInput,
} from '../prompts/specGenerator';

const AGENT = 'spec-generator';

interface SpecGeneratorOutput {
  fileName: string;
  code: string;
}

export interface GeneratedSpec {
  fileName: string;
  outputPath: string;
  code: string;
}

function parseOutput(raw: string): SpecGeneratorOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Spec generator returned non-JSON: ${msg}\n\nRaw:\n${raw.slice(0, 500)}`, {
      cause: error,
    });
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Spec generator returned a non-object');
  }
  const obj = parsed as Record<string, unknown>;
  const fileName = obj['fileName'];
  const code = obj['code'];
  if (typeof fileName !== 'string' || !fileName.endsWith('.spec.ts')) {
    throw new Error(`Invalid fileName from spec generator: ${String(fileName)}`);
  }
  if (typeof code !== 'string' || code.length === 0) {
    throw new Error('Empty code from spec generator');
  }
  return { fileName, code };
}

export async function generateSpec(input: SpecGeneratorInput): Promise<GeneratedSpec> {
  const result = await callModel({
    agent: AGENT,
    messages: [
      { role: 'system', content: specGeneratorSystem },
      { role: 'user', content: buildSpecGeneratorUser(input) },
    ],
    metadata: { caseId: input.caseId, caseTitle: input.caseTitle },
  });
  const output = parseOutput(result.content);
  const targetDir = join(aiConfig.projectRoot, 'tests', 'specs', 'review');
  await mkdir(targetDir, { recursive: true });
  const outputPath = join(targetDir, output.fileName);
  await writeFile(outputPath, output.code, 'utf8');
  return { fileName: output.fileName, outputPath, code: output.code };
}
