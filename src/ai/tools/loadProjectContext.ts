import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aiConfig } from '../config';

const CONTEXT_FILES = [
  'AGENTS.md',
  'tests/fixtures/index.ts',
  'tests/fixtures/auth.browser.fixture.ts',
  'tests/pages/BasePage.ts',
  'tests/pages/HomePage.ts',
  'tests/specs/ui/home-page/authenticated-buyer.spec.ts',
] as const;

async function readIfExists(absolutePath: string): Promise<string | null> {
  try {
    return await readFile(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

export async function loadProjectContext(): Promise<string> {
  const blocks: string[] = [];
  for (const relPath of CONTEXT_FILES) {
    const absPath = join(aiConfig.projectRoot, relPath);
    const content = await readIfExists(absPath);
    if (content === null) {
      blocks.push(`### ${relPath}\n(file not found — skipped)`);
      continue;
    }
    blocks.push(`### ${relPath}\n${content}`);
  }
  return blocks.join('\n\n');
}
