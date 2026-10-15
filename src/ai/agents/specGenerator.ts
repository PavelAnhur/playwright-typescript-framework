import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { aiConfig } from '../config';
import { callModel } from '../dshClient';
import { stripFences } from '../tools/stripFences';
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

export function assertPathInsideTargetDir(resolvedOutput: string, resolvedTarget: string): void {
  const rel = relative(resolvedTarget, resolvedOutput);
  const normalizedRel = rel.replace(/\\/g, '/');
  if (!normalizedRel || normalizedRel.startsWith('../') || normalizedRel === '..') {
    throw new Error(`Refusing to write outside target directory: ${resolvedOutput}`);
  }
}

function parseOutput(raw: string): SpecGeneratorOutput {
  const cleaned = stripFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Spec generator returned non-JSON: ${msg}\n\nRaw:\n${cleaned.slice(0, 500)}`, {
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
  if (/[/\\]/.test(fileName) || fileName.includes('..')) {
    throw new Error(
      `Refusing fileName with path separators or traversal sequences: ${String(fileName)}`
    );
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
  const resolvedOutput = resolve(outputPath);
  const resolvedTarget = resolve(targetDir);
  assertPathInsideTargetDir(resolvedOutput, resolvedTarget);
  await writeFile(outputPath, output.code, 'utf8');
  return { fileName: output.fileName, outputPath, code: output.code };
}
