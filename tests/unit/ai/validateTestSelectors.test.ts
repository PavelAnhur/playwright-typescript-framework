import { readdir, readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));
vi.mock('@ai/config', () => ({
  aiConfig: { projectRoot: '/project-root' },
}));

const mockReadFile = vi.mocked(readFile);
const mockReaddir = vi.mocked(readdir);

let _specContent = '';
let _sourceFiles: Record<string, string> = {};

mockReadFile.mockImplementation((async (path: unknown) => {
  const p = typeof path === 'string' ? path : '';
  if (p.includes('tests/specs/') && p.endsWith('.spec.ts')) return _specContent;
  const relPath = p.replace('/project-root/', '');
  if (relPath in _sourceFiles) return _sourceFiles[relPath];
  return '';
}) as unknown as typeof readFile);

mockReaddir.mockImplementation((async (path: unknown) => {
  const dir = typeof path === 'string' ? path : '';
  const dirents = (name: string) => [{ name, isDirectory: () => false, isFile: () => true }];
  if (dir === '/project-root/maison/web/src') return dirents('App.tsx');
  if (dir === '/project-root/maison/server/src') return dirents('server.ts');
  return [];
}) as unknown as typeof readdir);

function resetSpec() {
  _specContent = '';
}

beforeEach(resetSpec);

function mockSpecContent(content: string) {
  _specContent = content;
}

function mockSourceFiles(files: Record<string, string>) {
  _sourceFiles = files;
}

describe('validateTestSelectors - spec extraction', () => {
  it('should collect test-ids from data-testid attributes', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    const specContent = `
      test('login flow', async ({ page }) => {
        await page.getByTestId('username').fill('admin');
        await page.getByTestId('password').fill('secret');
        await page.getByTestId('submit-btn').click();
      });
    `;
    mockSpecContent(specContent);
    mockSourceFiles({});

    const result = await validateTestSelectors('/project-root/tests/specs/ui/login.spec.ts');
    const ids = result.checked.map(c => c.testId).sort();
    expect(ids).toEqual(['password', 'submit-btn', 'username']);
  });

  it('should collect test-ids from getByTestId with single quotes', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    const specContent = `
      test('cart', async ({ page }) => {
        await page.getByTestId('cart-icon').click();
        await page.getByTestId('checkout-btn').click();
      });
    `;
    mockSpecContent(specContent);
    mockSourceFiles({});

    const result = await validateTestSelectors('/project-root/tests/specs/ui/cart.spec.ts');
    const ids = result.checked.map(c => c.testId).sort();
    expect(ids).toEqual(['cart-icon', 'checkout-btn']);
  });

  it('should collect test-ids from getByTestId with double quotes', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    const specContent = `
      test('search', async ({ page }) => {
        await page.getByTestId("search-input").fill("laptop");
        await page.getByTestId("search-button").click();
      });
    `;
    mockSpecContent(specContent);
    mockSourceFiles({});

    const result = await validateTestSelectors('/project-root/tests/specs/ui/search.spec.ts');
    const ids = result.checked.map(c => c.testId).sort();
    expect(ids).toEqual(['search-button', 'search-input']);
  });

  it('should collect test-ids from both data-testid and getByTestId in the same spec', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    const specContent = `
      test('mixed selectors', async ({ page }) => {
        await page.getByTestId('btn-add').click();
        const el = page.locator('[data-testid="product-card"]');
        await el.click();
      });
    `;
    mockSpecContent(specContent);
    mockSourceFiles({});

    const result = await validateTestSelectors('/project-root/tests/specs/ui/mixed.spec.ts');
    const ids = result.checked.map(c => c.testId).sort();
    expect(ids).toEqual(['btn-add', 'product-card']);
  });

  it('should deduplicate test-ids appearing in both data-testid and getByTestId', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    const specContent = `
      test('duplicate', async ({ page }) => {
        await page.getByTestId('shared-id').click();
        await page.locator('[data-testid="shared-id"]').click();
      });
    `;
    mockSpecContent(specContent);
    mockSourceFiles({});

    const result = await validateTestSelectors('/project-root/tests/specs/ui/duplicate.spec.ts');
    expect(result.checked.length).toBe(1);
    expect(result.checked[0]!.testId).toBe('shared-id');
  });
});

describe('validateTestSelectors - vacuous empty spec', () => {
  it('should return { allValid: true, checked: [] } when spec has no test-ids', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    mockSpecContent(`
      test('no test ids here', async ({ page }) => {
        await page.goto('/');
        await page.title();
      });
    `);
    mockSourceFiles({});

    const result = await validateTestSelectors('/project-root/tests/specs/ui/no-testids.spec.ts');
    expect(result).toEqual({ allValid: true, checked: [] });
  });
});

describe('validateTestSelectors - source scan', () => {
  it('should find a test-id in a source file and report relative path', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    mockSpecContent(`
      test('findable', async ({ page }) => {
        await page.getByTestId('nav-logo').click();
      });
    `);
    mockSourceFiles({
      'maison/web/src/App.tsx': '<img data-testid="nav-logo" src="/logo.png" />',
    });

    const result = await validateTestSelectors('/project-root/tests/specs/ui/findable.spec.ts');
    expect(result.checked.length).toBe(1);
    expect(result.checked[0]!.testId).toBe('nav-logo');
    expect(result.checked[0]!.found).toBe(true);
    expect(result.checked[0]!.foundIn).toContain('maison/web/src/App.tsx');
  });

  it('should report not found when test-id is absent from all source files', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    mockSpecContent(`
      test('missing', async ({ page }) => {
        await page.getByTestId('ghost-element').click();
      });
    `);
    mockSourceFiles({
      'maison/web/src/App.tsx': '<div>Hello</div>',
    });

    const result = await validateTestSelectors('/project-root/tests/specs/ui/missing.spec.ts');
    expect(result.checked).toHaveLength(1);
    expect(result.checked[0]!.found).toBe(false);
    expect(result.checked[0]!.foundIn).toEqual([]);
  });

  it('should set allValid to false when any selector is not found', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    mockSpecContent(`
      test('partial', async ({ page }) => {
        await page.getByTestId('found-id').click();
        await page.getByTestId('not-found-id').click();
      });
    `);
    mockSourceFiles({
      'maison/web/src/App.tsx': '<button data-testid="found-id">Click</button>',
    });

    const result = await validateTestSelectors('/project-root/tests/specs/ui/partial.spec.ts');
    expect(result.allValid).toBe(false);
    const found = result.checked.find(c => c.testId === 'found-id');
    const missing = result.checked.find(c => c.testId === 'not-found-id');
    expect(found?.found).toBe(true);
    expect(missing?.found).toBe(false);
  });

  it('should set allValid to true when all selectors are found', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    mockSpecContent(`
      test('all present', async ({ page }) => {
        await page.getByTestId('btn-save').click();
        await page.getByTestId('input-name').fill('test');
      });
    `);
    mockSourceFiles({
      'maison/web/src/App.tsx': `
        <input data-testid="input-name" />
        <button data-testid="btn-save">Save</button>
      `,
    });

    const result = await validateTestSelectors('/project-root/tests/specs/ui/allpresent.spec.ts');
    expect(result.allValid).toBe(true);
  });

  it('should match only double-quoted data-testid in source scan (quote asymmetry)', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    mockSpecContent(`
      test('quote asymmetry', async ({ page }) => {
        await page.getByTestId('asym-id').click();
      });
    `);
    // Source file has single-quoted data-testid — should NOT match
    mockSourceFiles({
      'maison/web/src/App.tsx': "<div data-testid='asym-id'>text</div>",
    });

    const result = await validateTestSelectors('/project-root/tests/specs/ui/quoteasym.spec.ts');
    expect(result.checked).toHaveLength(1);
    expect(result.checked[0]!.found).toBe(false);
  });

  it('should match double-quoted data-testid in source scan', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    mockSpecContent(`
      test('quote match', async ({ page }) => {
        await page.getByTestId('dbl-id').click();
      });
    `);
    mockSourceFiles({
      'maison/web/src/App.tsx': '<div data-testid="dbl-id">text</div>',
    });

    const result = await validateTestSelectors('/project-root/tests/specs/ui/quotematch.spec.ts');
    expect(result.checked).toHaveLength(1);
    expect(result.checked[0]!.found).toBe(true);
  });
});

describe('validateTestSelectors - walkDir error handling', () => {
  afterEach(() => {
    mockReaddir.mockReset();
  });

  it('should skip a missing source directory without throwing', async () => {
    const { validateTestSelectors } = await import('@ai/tools/validateTestSelectors');
    mockSpecContent(`
      test('skip missing dir', async ({ page }) => {
        await page.getByTestId('test-id').click();
      });
    `);
    mockSourceFiles({
      'maison/server/src/server.ts': '<button data-testid="test-id">Go</button>',
    });
    mockReaddir.mockImplementation((async (dir: unknown) => {
      const d = typeof dir === 'string' ? dir : '';
      if (d.includes('maison/web/src')) {
        throw new Error('ENOENT: no such file or directory');
      }
      const dirents = (name: string) => [{ name, isDirectory: () => false, isFile: () => true }];
      if (d.includes('maison/server/src')) return dirents('server.ts');
      return [];
    }) as unknown as typeof readdir);

    const result = await validateTestSelectors('/project-root/tests/specs/ui/skipmissing.spec.ts');
    expect(result.allValid).toBe(true);
    expect(result.checked.length).toBe(1);
    expect(result.checked[0]!.found).toBe(true);
    expect(result.checked[0]!.foundIn).toContain('maison/server/src/server.ts');
  });
});
