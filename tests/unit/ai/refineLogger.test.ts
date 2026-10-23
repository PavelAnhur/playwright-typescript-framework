import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'refine-logger-test-'));
});

afterEach(() => {
  vi.resetModules();
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('unit', () => {
  describe('refineLogger per-case log file resolution', () => {
    it('writes separate entries for different caseIds into separate files', async () => {
      vi.doMock('../../../src/ai/config', () => ({
        aiConfig: { logsDir: tempDir },
      }));
      const { logRefineAttempt, getRefineLogPath } =
        await import('../../../src/ai/tools/refineLogger');
      const dummyEntry1 = {
        timestamp: new Date().toISOString(),
        caseId: 'C1',
        attemptNumber: 1,
        fileName: 'test.spec.ts',
        durationMs: 100,
        passed: true,
        errorMessageFirstLine: null,
        codeLength: 50,
        fullCode: 'console.log("hello");',
      };
      const dummyEntry2 = {
        timestamp: new Date().toISOString(),
        caseId: 'C2',
        attemptNumber: 1,
        fileName: 'test2.spec.ts',
        durationMs: 200,
        passed: false,
        errorMessageFirstLine: 'AssertionError: expected true to be false',
        codeLength: 75,
        fullCode: 'expect(true).toBe(false);',
      };
      await logRefineAttempt(dummyEntry1);
      await logRefineAttempt(dummyEntry2);
      const pathC1 = getRefineLogPath('C1');
      const pathC2 = getRefineLogPath('C2');
      expect(pathC1).not.toBe(pathC2);
      const contentC1 = await readFile(pathC1, 'utf8');
      const linesC1 = contentC1
        .trim()
        .split('\n')
        .filter(l => l.length > 0)
        .map(l => JSON.parse(l));
      const contentC2 = await readFile(pathC2, 'utf8');
      const linesC2 = contentC2
        .trim()
        .split('\n')
        .filter(l => l.length > 0)
        .map(l => JSON.parse(l));
      for (const entry of linesC1) {
        expect(entry.caseId).toBe('C1');
      }
      for (const entry of linesC2) {
        expect(entry.caseId).toBe('C2');
      }
    });
  });
});
