import { ENV } from '@config/env';
import { resolve } from 'node:path';
if (!ENV.hasAiConfig) {
  throw new Error(
    'AI configuration is missing. Please set DSH_BASE_URL, DSH_MODEL, and DSH_API_KEY in your environment.\n' +
      'Make sure they are present in .env.local or appropriate environment file.'
  );
}
const projectRoot = process.cwd();
export const aiConfig = {
  baseUrl: ENV.aiConfig.baseUrl!,
  model: ENV.aiConfig.model!,
  apiKey: ENV.aiConfig.apiKey!,
  projectRoot,
  logsDir: resolve(projectRoot, 'logs', 'ai'),
  requirementsDir: resolve(projectRoot, 'fixtures', 'requirements'),
  generatedCasesDir: resolve(projectRoot, 'generated-cases'),
} as const;
