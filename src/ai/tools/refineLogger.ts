import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { aiConfig } from '../config';

export interface RefineLogEntry {
  timestamp: string;
  caseId: string;
  attemptNumber: number;
  fileName: string;
  durationMs: number;
  passed: boolean;
  errorMessageFirstLine: string | null;
  codeLength: number;
  fullCode: string;
}

const runId = new Date().toISOString().replace(/[:.]/g, '-');

let dirReady: Promise<void> | null = null;
let logFile: string | null = null;

async function ensureDir(): Promise<void> {
  if (!dirReady) {
    dirReady = mkdir(aiConfig.logsDir, { recursive: true }).then(() => undefined);
  }
  return dirReady;
}

function resolveLogFile(caseId: string): string {
  if (logFile === null) {
    logFile = join(aiConfig.logsDir, `refine-${caseId}-${runId}.jsonl`);
  }
  return logFile;
}

export async function logRefineAttempt(entry: RefineLogEntry): Promise<void> {
  await ensureDir();
  const path = resolveLogFile(entry.caseId);
  await appendFile(path, JSON.stringify(entry) + '\n', 'utf8');
}

export function getRefineLogPath(caseId: string): string {
  return resolveLogFile(caseId);
}
