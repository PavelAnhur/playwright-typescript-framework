import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aiConfig } from '../config';

export interface TestRunResult {
  passed: boolean;
  exitCode: number;
  errorMessage: string | null;
  errorContext: string | null;
  failedTestNames: string[];
  durationMs: number;
  stdout: string;
}

export interface RunOptions {
  project?: string;
  workers?: number;
  repeatEach?: number;
}

interface PlaywrightJsonTestResult {
  status: string;
  error?: { message?: string };
}

interface PlaywrightJsonTest {
  results: PlaywrightJsonTestResult[];
}

interface PlaywrightJsonSpec {
  title: string;
  file?: string;
  line?: number;
  tests: PlaywrightJsonTest[];
}

interface PlaywrightJsonSuite {
  title: string;
  specs?: PlaywrightJsonSpec[];
  suites?: PlaywrightJsonSuite[];
}

interface PlaywrightJsonReport {
  suites?: PlaywrightJsonSuite[];
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

function parseJsonReport(stdout: string): PlaywrightJsonReport | null {
  const idx = stdout.indexOf('{\n  "config":');
  if (idx === -1) return null;
  try {
    return JSON.parse(stdout.slice(idx)) as PlaywrightJsonReport;
  } catch {
    return null;
  }
}

function collectFailures(
  suite: PlaywrightJsonSuite,
  prefix: string,
  out: { title: string; message: string | null }[]
): void {
  const isFilePathSuite = suite.title.endsWith('.spec.ts') || suite.title.endsWith('.test.ts');
  const currentPath = isFilePathSuite
    ? prefix
    : prefix
      ? `${prefix} › ${suite.title}`
      : suite.title;
  if (suite.specs) {
    for (const spec of suite.specs) {
      const failedResult = spec.tests
        .flatMap(t => t.results)
        .find(r => r.status === 'failed' || r.status === 'timedOut');
      if (failedResult) {
        const location = spec.file && spec.line ? `${spec.file}:${spec.line}:3` : (spec.file ?? '');
        const describePath = currentPath ? `${currentPath} › ${spec.title}` : spec.title;
        out.push({
          title: location ? `${location} › ${describePath}` : describePath,
          message: failedResult.error?.message ?? null,
        });
      }
    }
  }
  if (suite.suites) {
    for (const child of suite.suites) {
      collectFailures(child, currentPath, out);
    }
  }
}

function extractFailures(report: PlaywrightJsonReport): {
  names: string[];
  firstMessage: string | null;
} {
  const failures: { title: string; message: string | null }[] = [];
  if (report.suites) {
    for (const suite of report.suites) {
      collectFailures(suite, '', failures);
    }
  }
  const names = failures.map(f => f.title);
  const firstMessage = failures.find(f => f.message !== null)?.message ?? null;
  return { names, firstMessage };
}

export async function runPlaywrightTest(
  specFile: string,
  options: RunOptions = {}
): Promise<TestRunResult> {
  const { project = 'review', workers, repeatEach } = options;
  const args = ['playwright', 'test', specFile, `--project=${project}`, '--reporter=json'];
  if (workers !== undefined) {
    args.push(`--workers=${workers}`);
  }
  if (repeatEach !== undefined && repeatEach > 1) {
    args.push(`--repeat-each=${repeatEach}`);
  }
  const start = Date.now();
  const { code, stdout } = await runProcess('npx', args, aiConfig.projectRoot);
  const durationMs = Date.now() - start;
  const passed = code === 0;
  if (passed) {
    return {
      passed: true,
      exitCode: code,
      errorMessage: null,
      errorContext: null,
      failedTestNames: [],
      durationMs,
      stdout,
    };
  }
  const report = parseJsonReport(stdout);
  const failures = report ? extractFailures(report) : { names: [], firstMessage: null };
  return {
    passed: false,
    exitCode: code,
    errorMessage: failures.firstMessage,
    errorContext: await findLatestErrorContext(),
    failedTestNames: failures.names,
    durationMs,
    stdout,
  };
}
