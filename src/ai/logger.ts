import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { aiConfig } from './config';

export interface LogEntry {
  timestamp: string;
  agent: string;
  model: string;
  prompt: string;
  response: string;
  durationMs: number;
  status: 'ok' | 'error';
  error?: string;
  metadata?: Record<string, unknown>;
}

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = join(aiConfig.logsDir, `run-${runId}.jsonl`);

let dirReady: Promise<void> | null = null;

async function ensureDir(): Promise<void> {
  if (!dirReady) {
    dirReady = mkdir(aiConfig.logsDir, { recursive: true }).then(() => undefined);
  }
  return dirReady;
}

export async function logCall(entry: LogEntry): Promise<void> {
  await ensureDir();
  await appendFile(logFile, JSON.stringify(entry) + '\n', 'utf8');
}
