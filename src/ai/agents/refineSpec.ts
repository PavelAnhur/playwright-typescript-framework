import { callModel } from '../dshClient';
import type { SpecGeneratorInput } from '../prompts/specGenerator';
import { buildSpecRefinerUser, specRefinerSystem } from '../prompts/specGenerator';
import { logRefineAttempt } from '../tools/refineLogger';
import { runPlaywrightTest, type TestRunResult } from '../tools/runPlaywrightTest';
import { generateSpec } from './specGenerator';

const AGENT = 'spec-refiner';

export interface RefineIteration {
  attemptNumber: number;
  fileName: string;
  outputPath: string;
  code: string;
  testResult: TestRunResult;
}

export interface RefineResult {
  passed: boolean;
  iterations: RefineIteration[];
  finalFileName: string;
  finalOutputPath: string;
  finalCode: string;
}

interface SpecRefinerOutput {
  fileName: string;
  code: string;
}

function parseRefinerOutput(raw: string): SpecRefinerOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Spec refiner returned non-JSON: ${msg}\n\nRaw:\n${raw.slice(0, 500)}`, {
      cause: error,
    });
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Spec refiner returned a non-object');
  }
  const obj = parsed as Record<string, unknown>;
  const fileName = obj['fileName'];
  const code = obj['code'];
  if (typeof fileName !== 'string' || !fileName.endsWith('.spec.ts')) {
    throw new Error(`Invalid fileName from spec refiner: ${String(fileName)}`);
  }
  if (typeof code !== 'string' || code.length === 0) {
    throw new Error('Empty code from spec refiner');
  }
  return { fileName, code };
}

export async function refineSpec(
  input: SpecGeneratorInput,
  maxIterations: number = 3
): Promise<RefineResult> {
  const iterations: RefineIteration[] = [];
  // First iteration: fresh generation
  const generated = await generateSpec(input);
  let currentCode = generated.code;
  let currentFileName = generated.fileName;
  let currentOutputPath = generated.outputPath;
  let testResult = await runPlaywrightTest(currentOutputPath);
  iterations.push({
    attemptNumber: 1,
    fileName: currentFileName,
    outputPath: currentOutputPath,
    code: currentCode,
    testResult,
  });
  await logRefineAttempt({
    timestamp: new Date().toISOString(),
    caseId: input.caseId,
    attemptNumber: 1,
    fileName: currentFileName,
    durationMs: testResult.durationMs,
    passed: testResult.passed,
    errorMessageFirstLine: testResult.errorMessage?.split('\n')[0] ?? null,
    codeLength: currentCode.length,
    fullCode: currentCode,
  });
  if (testResult.passed) {
    return {
      passed: true,
      iterations,
      finalFileName: currentFileName,
      finalOutputPath: currentOutputPath,
      finalCode: currentCode,
    };
  }
  // Refinement iterations
  for (let attempt = 2; attempt <= maxIterations; attempt++) {
    const userPrompt = buildSpecRefinerUser({
      currentCode,
      errorMessage: testResult.errorMessage,
      errorContext: testResult.errorContext,
      projectContext: input.projectContext,
      attemptNumber: attempt,
    });
    const modelResult = await callModel({
      agent: AGENT,
      messages: [
        { role: 'system', content: specRefinerSystem },
        { role: 'user', content: userPrompt },
      ],
      metadata: { caseId: input.caseId, attempt },
    });
    const parsed = parseRefinerOutput(modelResult.content);
    // Same file, updated content
    currentCode = parsed.code;
    currentFileName = parsed.fileName;
    // Write the updated code to the same file the first iteration produced
    const { writeFile } = await import('node:fs/promises');
    await writeFile(currentOutputPath, currentCode, 'utf8');
    testResult = await runPlaywrightTest(currentOutputPath);
    iterations.push({
      attemptNumber: attempt,
      fileName: currentFileName,
      outputPath: currentOutputPath,
      code: currentCode,
      testResult,
    });
    await logRefineAttempt({
      timestamp: new Date().toISOString(),
      caseId: input.caseId,
      attemptNumber: attempt,
      fileName: currentFileName,
      durationMs: testResult.durationMs,
      passed: testResult.passed,
      errorMessageFirstLine: testResult.errorMessage?.split('\n')[0] ?? null,
      codeLength: currentCode.length,
      fullCode: currentCode,
    });
    if (testResult.passed) {
      return {
        passed: true,
        iterations,
        finalFileName: currentFileName,
        finalOutputPath: currentOutputPath,
        finalCode: currentCode,
      };
    }
  }
  return {
    passed: false,
    iterations,
    finalFileName: currentFileName,
    finalOutputPath: currentOutputPath,
    finalCode: currentCode,
  };
}
