import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aiConfig } from '../config';

export interface SelectorValidation {
  testId: string;
  found: boolean;
  foundIn: string[];
}

export interface ValidationResult {
  allValid: boolean;
  checked: SelectorValidation[];
}

const SOURCE_DIRS = [
  'maison/web/src',
  'maison/server/src',
];

const TEST_ID_REGEX = /data-testid="([^"]+)"/g;
const GET_BY_TEST_ID_REGEX = /getByTestId\(['"]([^'"]+)['"]\)/g;

async function walkDir(dir: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkDir(full)));
    } else if (entry.isFile() && /\.(ts|tsx|html|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export async function validateTestSelectors(specPath: string): Promise<ValidationResult> {
  const specContent = await readFile(specPath, 'utf8');
  const testIdsInSpec = new Set<string>();
  for (const match of specContent.matchAll(TEST_ID_REGEX)) {
    if (match[1]) testIdsInSpec.add(match[1]);
  }
  for (const match of specContent.matchAll(GET_BY_TEST_ID_REGEX)) {
    if (match[1]) testIdsInSpec.add(match[1]);
  }
  if (testIdsInSpec.size === 0) {
    return { allValid: true, checked: [] };
  }
  const sourceFiles: string[] = [];
  for (const dir of SOURCE_DIRS) {
    const absDir = join(aiConfig.projectRoot, dir);
    try {
      sourceFiles.push(...(await walkDir(absDir)));
    } catch {
      // directory missing — skip
    }
  }
  const checked: SelectorValidation[] = [];
  for (const testId of testIdsInSpec) {
    const foundIn: string[] = [];
    for (const sourceFile of sourceFiles) {
      const content = await readFile(sourceFile, 'utf8');
      if (content.includes(`data-testid="${testId}"`)) {
        foundIn.push(sourceFile.replace(aiConfig.projectRoot + '/', ''));
      }
    }
    checked.push({ testId, found: foundIn.length > 0, foundIn });
  }
  return {
    allValid: checked.every((c) => c.found),
    checked,
  };
}
