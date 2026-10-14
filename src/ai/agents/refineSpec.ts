import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { callModel } from '../dshClient';
import type { SpecGeneratorInput } from '../prompts/specGenerator';
import { buildSpecRefinerUser, specRefinerSystem } from '../prompts/specGenerator';
import { logRefineAttempt } from '../tools/refineLogger';
import { runPlaywrightTest, type TestRunResult } from '../tools/runPlaywrightTest';
import { validateTestSelectors, type ValidationResult } from '../tools/validateTestSelectors';
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
  /** Only meaningful when passed is true. On a failed run this is false and carries no signal — it does not mean a clean pass. */
  hollowPass: boolean;
  selectorValidation: ValidationResult | null;
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
  if (/[/\\]/.test(fileName) || fileName.includes('..')) {
    throw new Error(
      `Refusing fileName with path separators or traversal sequences: ${String(fileName)}`
    );
  }
  if (typeof code !== 'string' || code.length === 0) {
    throw new Error('Empty code from spec refiner');
  }
  return { fileName, code };
}

interface FinalizeInput {
  passed: boolean;
  iterations: RefineIteration[];
  fileName: string;
  outputPath: string;
  code: string;
}

async function finalizeResult(input: FinalizeInput): Promise<RefineResult> {
  let hollowPass = false;
  let selectorValidation: ValidationResult | null = null;
  if (input.passed) {
    selectorValidation = await validateTestSelectors(input.outputPath);
    hollowPass = !selectorValidation.allValid;
  }
  return {
    passed: input.passed,
    hollowPass,
    selectorValidation,
    iterations: input.iterations,
    finalFileName: input.fileName,
    finalOutputPath: input.outputPath,
    finalCode: input.code,
  };
}

async function recordAndLogAttempt(
  iterations: RefineIteration[],
  caseId: string,
  attemptNumber: number,
  fileName: string,
  outputPath: string,
  code: string,
  testResult: TestRunResult
): Promise<void> {
  iterations.push({
    attemptNumber,
    fileName,
    outputPath,
    code,
    testResult,
  });
  await logRefineAttempt({
    timestamp: new Date().toISOString(),
    caseId,
    attemptNumber,
    fileName,
    durationMs: testResult.durationMs,
    passed: testResult.passed,
    errorMessageFirstLine: testResult.errorMessage?.split('\n')[0] ?? null,
    codeLength: code.length,
    fullCode: code,
  });
}

async function runRefinementIteration(
  input: SpecGeneratorInput,
  attempt: number,
  currentCode: string,
  currentOutputPath: string,
  testResult: TestRunResult,
  iterations: RefineIteration[],
  caseId: string
): Promise<{ code: string; passed: boolean; fileName: string }> {
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
    metadata: { caseId, attempt },
  });
  const parsed = parseRefinerOutput(modelResult.content);
  const newCode = parsed.code;
  const fileName = basename(currentOutputPath);
  await writeFile(currentOutputPath, newCode, 'utf8');
  const newTestResult = await runPlaywrightTest(currentOutputPath);
  recordAndLogAttempt(
    iterations,
    caseId,
    attempt,
    fileName,
    currentOutputPath,
    newCode,
    newTestResult
  );
  return { code: newCode, passed: newTestResult.passed, fileName };
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
  recordAndLogAttempt(
    iterations,
    input.caseId,
    1,
    currentFileName,
    currentOutputPath,
    currentCode,
    testResult
  );
  if (testResult.passed) {
    return finalizeResult({
      passed: true,
      iterations,
      fileName: currentFileName,
      outputPath: currentOutputPath,
      code: currentCode,
    });
  }
  // Refinement iterations
  for (let attempt = 2; attempt <= maxIterations; attempt++) {
    const result = await runRefinementIteration(
      input,
      attempt,
      currentCode,
      currentOutputPath,
      testResult,
      iterations,
      input.caseId
    );
    currentCode = result.code;
    // Invariant: keep the reported name in sync with the written file. In production
    // basename(outputPath) === fileName (generateSpec derives one from the other), so this
    // reassignment is a no-op there; it is kept so the loop explicitly preserves the
    // invariant rather than relying on that coincidence. See KNOWN_LIMITATIONS.md.
    currentFileName = result.fileName;
    if (result.passed) {
      return finalizeResult({
        passed: true,
        iterations,
        fileName: currentFileName,
        outputPath: currentOutputPath,
        code: currentCode,
      });
    }
  }
  return finalizeResult({
    passed: false,
    iterations,
    fileName: currentFileName,
    outputPath: currentOutputPath,
    code: currentCode,
  });
}
