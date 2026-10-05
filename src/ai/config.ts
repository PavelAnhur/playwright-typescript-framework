import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..', '..');

loadEnv({ path: resolve(projectRoot, '.env.local'), override: true, quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}. Add it to .env.local`);
  }
  return value;
}

export const aiConfig = {
  baseUrl: required('DSH_BASE_URL'),
  model: required('DSH_MODEL'),
  apiKey: required('DSH_API_KEY'),
  projectRoot,
  logsDir: resolve(projectRoot, 'logs', 'ai'),
  requirementsDir: resolve(projectRoot, 'fixtures', 'requirements'),
  generatedCasesDir: resolve(projectRoot, 'generated-cases'),
} as const;
