import { ENV } from '@config/env';
import { resolve } from 'node:path';

if (!ENV.hasAiConfig && !ENV.isCI) {
  throw new Error(
    'AI configuration is missing. Please set DSH_BASE_URL, DSH_MODEL, and DSH_API_KEY in your environment.\n' +
      'Make sure they are present in .env.local or appropriate environment file.'
  );
}

const projectRoot = process.cwd();

const DEFAULT_TIMEOUT_MS = 60_000;

function readTimeoutMs(): number {
  const parsed = Number.parseInt(process.env['DSH_TIMEOUT_MS'] ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export const aiConfig = {
  baseUrl: ENV.aiConfig.baseUrl || 'http://localhost:8080',
  model: ENV.aiConfig.model || 'deepseek-model',
  apiKey: ENV.aiConfig.apiKey || 'dummy-key-for-ci',
  timeoutMs: readTimeoutMs(),
  projectRoot,
  logsDir: resolve(projectRoot, 'logs', 'ai'),
  requirementsDir: resolve(projectRoot, 'fixtures', 'requirements'),
  generatedCasesDir: resolve(projectRoot, 'generated-cases'),
  hasValidConfig: ENV.hasAiConfig,
} as const;
