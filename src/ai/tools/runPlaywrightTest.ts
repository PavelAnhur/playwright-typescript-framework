import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aiConfig } from '../config';

export interface TestRunResult {
  passed: boolean;
  exitCode: number;
  errorMessage: string | null;
  errorContext: string | null;
  durationMs: number;
  stdout: string;
}

const ERROR_CONTEXT_MAX_AGE_MS = 30_000;

function runProcess(
  command: string,
  args: string[],
  cwd: string
): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code: code ?? 1, stdout });
    });
  });
}

async function findLatestErrorContext(): Promise<string | null> {
  const testResultsDir = join(aiConfig.projectRoot, 'test-results');
  const { stdout } = await runProcess(
    'find',
    [testResultsDir, '-name', 'error-context.md', '-printf', '%T@ %p\n'],
    aiConfig.projectRoot
  );
  if (stdout.trim() === '') return null;
  const lines = stdout
    .trim()
    .split('\n')
    .map(line => {
      const spaceIdx = line.indexOf(' ');
      return {
        ts: Number(line.slice(0, spaceIdx)),
        path: line.slice(spaceIdx + 1),
      };
    })
    .sort((a, b) => b.ts - a.ts);
  const newest = lines[0];
  if (!newest) return null;
  const ageMs = Date.now() - newest.ts * 1000;
  if (ageMs > ERROR_CONTEXT_MAX_AGE_MS) return null;
  try {
    return await readFile(newest.path, 'utf8');
  } catch {
    return null;
  }
}

function extractErrorMessage(stdout: string): string | null {
  const idx = stdout.indexOf('Error:');
  if (idx === -1) return null;
  const fromError = stdout.slice(idx);
  const endIdx = fromError.search(/\n\n\s*\n/);
  const block = endIdx === -1 ? fromError.slice(0, 2000) : fromError.slice(0, endIdx);
  return block.trim();
}

export async function runPlaywrightTest(specFile: string): Promise<TestRunResult> {
  const start = Date.now();
  const { code, stdout } = await runProcess(
    'npx',
    ['playwright', 'test', specFile, '--project=review', '--reporter=line'],
    aiConfig.projectRoot
  );
  const durationMs = Date.now() - start;
  const passed = code === 0;
  return {
    passed,
    exitCode: code,
    errorMessage: passed ? null : extractErrorMessage(stdout),
    errorContext: passed ? null : await findLatestErrorContext(),
    durationMs,
    stdout,
  };
}
