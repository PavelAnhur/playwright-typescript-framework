import { describe, expect, it } from 'vitest';

import type {
  PlaywrightJsonReport,
  PlaywrightJsonSpec,
  PlaywrightJsonSuite,
} from '@ai/tools/runPlaywrightTest';
import { extractFailures, parseJsonReport } from '@ai/tools/runPlaywrightTest';

function makeSpec(
  title: string,
  status: string,
  error?: string,
  file = 'tests/specs/ui/home-page.spec.ts',
  line = 10
): PlaywrightJsonSpec {
  const result: { status: string; error?: { message?: string } } = { status };
  if (error) {
    result.error = { message: error };
  }
  return {
    title,
    file,
    line,
    tests: [{ results: [result] }],
  };
}

function makeSuite(
  title: string,
  specs?: PlaywrightJsonSpec[],
  suites?: PlaywrightJsonSuite[]
): PlaywrightJsonSuite {
  return { title, specs, suites };
}
const emptyReport: PlaywrightJsonReport = {};
const noSpecsSuite: PlaywrightJsonReport = {
  suites: [makeSuite('Empty Suite')],
};
const buildStdout = (report: PlaywrightJsonReport): string => {
  const json = JSON.stringify(report, null, 2);
  return `some preamble\nchatter\n${json}`;
};
const validReport = {
  config: {},
  suites: [
    {
      title: 'tests/specs/ui/home-page.spec.ts',
      specs: [
        {
          title: 'Home Page',
          file: 'tests/specs/ui/home-page.spec.ts',
          line: 10,
          tests: [
            { results: [{ status: 'passed' }] },
            {
              results: [{ status: 'failed', error: { message: 'Element not found' } }],
            },
          ],
        },
      ],
      suites: [
        {
          title: 'Checkout flow',
          specs: [
            {
              title: 'should checkout',
              file: 'tests/specs/ui/checkout.spec.ts',
              line: 5,
              tests: [
                {
                  results: [
                    {
                      status: 'failed',
                      error: { message: 'cart empty' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as unknown as PlaywrightJsonReport;

describe('unit', () => {
  describe('parseJsonReport', () => {
    it('should parse a valid report embedded in stdout with leading chatter', () => {
      const stdout = buildStdout(validReport);
      const result = parseJsonReport(stdout);
      expect(result).not.toBeNull();
      expect(result!.suites).toHaveLength(1);
      expect(result!.suites![0]!.title).toBe('tests/specs/ui/home-page.spec.ts');
      expect(result!.suites![0]!.suites).toHaveLength(1);
      expect(result!.suites![0]!.suites![0]!.title).toBe('Checkout flow');
    });

    it('should return null when the anchor is absent', () => {
      const result = parseJsonReport('just some text without JSON');
      expect(result).toBeNull();
    });

    it('should return null when the anchor is present but JSON is malformed', () => {
      const stdout = `preamble\n{\n  "config":{broken`;
      const result = parseJsonReport(stdout);
      expect(result).toBeNull();
    });

    it('should return null when there is no opening brace after the anchor', () => {
      // Anchor requires '{\n  "config":' — if config key is missing, no match.
      const stdout = `preamble\n{\n  "other":true`;
      const result = parseJsonReport(stdout);
      expect(result).toBeNull();
    });
  });

  describe('extractFailures', () => {
    it('should include a FAILED test in names and capture its error message', () => {
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/a.spec.ts', [
            makeSpec('should pass', 'passed', undefined, 'tests/specs/ui/a.spec.ts'),
            makeSpec('should fail', 'failed', 'boom', 'tests/specs/ui/a.spec.ts'),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.names).toContain('tests/specs/ui/a.spec.ts:10:3 > should fail');
      expect(result.firstMessage).toBe('boom');
    });

    it('should include a TIMEDOUT test in names', () => {
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/b.spec.ts', [
            makeSpec('should timeout', 'timedOut', 'Time exceeded', 'tests/specs/ui/b.spec.ts'),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.names).toContain('tests/specs/ui/b.spec.ts:10:3 > should timeout');
      expect(result.firstMessage).toBe('Time exceeded');
    });

    it('should NOT include passed or skipped tests', () => {
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/c.spec.ts', [
            makeSpec('pass', 'passed'),
            makeSpec('skip', 'skipped'),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.names).toEqual([]);
      expect(result.firstMessage).toBeNull();
    });

    it('should traverse nested suites and collect failures at depth', () => {
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/nested.spec.ts', undefined, [
            makeSuite('Parent', undefined, [
              makeSuite('Child', [
                makeSpec('deep fail', 'failed', 'boom', 'tests/specs/ui/nested.spec.ts'),
              ]),
            ]),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.names).toContain(
        'tests/specs/ui/nested.spec.ts:10:3 > Parent > Child > deep fail'
      );
      expect(result.firstMessage).toBe('boom');
    });

    it('should NOT add a path segment for file-path suites (ending .spec.ts/.test.ts)', () => {
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/home-page.spec.ts', [
            makeSpec('Home Page', 'failed', 'err', 'tests/specs/ui/home-page.spec.ts', 10),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.names).toContain('tests/specs/ui/home-page.spec.ts:10:3 > Home Page');
      expect(result.names[0]).not.toContain('home-page.spec.ts > Home Page');
    });

    it('should add a path segment for describe-style suites', () => {
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/a.spec.ts', undefined, [
            makeSuite('Describe Block', [
              makeSpec('spec title', 'failed', 'err', 'tests/specs/ui/a.spec.ts', 5),
            ]),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.names).toContain('tests/specs/ui/a.spec.ts:5:3 > Describe Block > spec title');
    });

    it('should use the FIRST failure message in traversal order', () => {
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/multi.spec.ts', [
            makeSpec('first', 'failed', 'first-err'),
            makeSpec('second', 'failed', 'second-err'),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.firstMessage).toBe('first-err');
    });

    it('should return empty names and null firstMessage when there are no failures', () => {
      const result = extractFailures(emptyReport);
      expect(result.names).toEqual([]);
      expect(result.firstMessage).toBeNull();
    });

    it('should return empty names and null firstMessage when a suite has no specs', () => {
      const result = extractFailures(noSpecsSuite);
      expect(result.names).toEqual([]);
      expect(result.firstMessage).toBeNull();
    });

    it('should handle a suite with only passed tests', () => {
      const report: PlaywrightJsonReport = {
        suites: [makeSuite('tests/specs/ui/pass.spec.ts', [makeSpec('all good', 'passed')])],
      };
      const result = extractFailures(report);
      expect(result.names).toEqual([]);
      expect(result.firstMessage).toBeNull();
    });

    it('should handle multiple top-level suites, collecting failures from all', () => {
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/a.spec.ts', [
            makeSpec('a-fail', 'failed', 'err-a', 'tests/specs/ui/a.spec.ts'),
          ]),
          makeSuite('tests/specs/ui/b.spec.ts', [
            makeSpec('b-fail', 'failed', 'err-b', 'tests/specs/ui/b.spec.ts'),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.names).toHaveLength(2);
      expect(result.names).toContain('tests/specs/ui/a.spec.ts:10:3 > a-fail');
      expect(result.names).toContain('tests/specs/ui/b.spec.ts:10:3 > b-fail');
      expect(result.firstMessage).toBe('err-a');
    });

    it('should handle a spec without file/line (location omitted)', () => {
      const spec: PlaywrightJsonSpec = {
        title: 'bare spec',
        tests: [{ results: [{ status: 'failed', error: { message: 'oops' } }] }],
      };
      const report: PlaywrightJsonReport = {
        suites: [makeSuite('Root', [spec])],
      };
      const result = extractFailures(report);
      expect(result.names).toContain('Root > bare spec');
      expect(result.firstMessage).toBe('oops');
    });

    it('should pin CURRENT behavior: file-path suite rule (KNOWN_LIMITATIONS)', () => {
      // A suite titled ending '.spec.ts' does NOT add '> <title>' prefix.
      // This is current behavior per KNOWN_LIMITATIONS.md — we document it, don't fix it.
      const report: PlaywrightJsonReport = {
        suites: [
          makeSuite('tests/specs/ui/path.spec.ts', undefined, [
            makeSuite('Describe Inside File', [
              makeSpec('inner', 'failed', 'e', 'tests/specs/ui/path.spec.ts', 1),
            ]),
          ]),
        ],
      };
      const result = extractFailures(report);
      expect(result.names).toContain(
        'tests/specs/ui/path.spec.ts:1:3 > Describe Inside File > inner'
      );
    });
  });
});
