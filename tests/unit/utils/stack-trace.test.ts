/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectSpecPath } from '../../utils/stack-trace';

describe('stack-trace', () => {
  describe('detectSpecPath', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it('should detect spec file path from file:// URL pattern', () => {
      const mockStack = `
        Error
            at detectSpecPath (src/utils/stack-trace.ts:10:15)
            at tests/specs/ui/home-page/catalog-toolbar.spec.ts:5:10
            at file:///home/project/tests/specs/ui/home-page/catalog-toolbar.spec.ts:12:20
            at async Promise.all (index 0)
      `;
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = mockStack;
        }
      } as any;
      const result = detectSpecPath();
      expect(result).toBe('tests/specs/ui/home-page/catalog-toolbar.spec.ts');
      global.Error = originalError;
    });

    it('should detect spec file path from relative path pattern', () => {
      const mockStack = `
        Error
            at detectSpecPath (src/utils/stack-trace.ts:10:15)
            at tests/specs/api/articles.spec.ts:5:10
            at async Promise.all (index 0)
      `;
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = mockStack;
        }
      } as any;
      const result = detectSpecPath();
      expect(result).toBe('tests/specs/api/articles.spec.ts');
      global.Error = originalError;
    });

    it('should fallback to any .spec.ts file pattern', () => {
      const mockStack = `
        Error
            at detectSpecPath (src/utils/stack-trace.ts:10:15)
            at /home/project/tests/specs/ui/home-page/hero-section.spec.ts:12:20
            at async Promise.all (index 0)
      `;
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = mockStack;
        }
      } as any;
      const result = detectSpecPath();
      expect(result).toBe('/home/project/tests/specs/ui/home-page/hero-section.spec.ts');
      global.Error = originalError;
    });

    it('should throw error when no spec file path can be detected', () => {
      const mockStack = `
        Error
            at detectSpecPath (src/utils/stack-trace.ts:10:15)
            at some/other/file.ts:5:10
            at async Promise.all (index 0)
      `;
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = mockStack;
        }
      } as any;
      expect(() => detectSpecPath()).toThrow();
      global.Error = originalError;
    });

    it('should handle empty stack trace', () => {
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = '';
        }
      } as any;
      expect(() => detectSpecPath()).toThrow();
      global.Error = originalError;
    });

    it('should handle undefined stack trace', () => {
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = undefined;
        }
      } as any;
      expect(() => detectSpecPath()).toThrow();
      global.Error = originalError;
    });

    it('should detect spec file path with Windows-style paths', () => {
      const mockStack = `
        Error
            at detectSpecPath (src\\utils\\stack-trace.ts:10:15)
            at file:///C:/project/tests/specs/ui/home-page/catalog-toolbar.spec.ts:12:20
            at async Promise.all (index 0)
      `;
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = mockStack;
        }
      } as any;
      const result = detectSpecPath();
      expect(result).toContain('tests/specs/ui/home-page/catalog-toolbar.spec.ts');
      global.Error = originalError;
    });

    it('should detect spec file path from different spec extensions', () => {
      const mockStack = `
        Error
            at detectSpecPath (src/utils/stack-trace.ts:10:15)
            at tests/specs/ui/home-page/feature.spec.ts:12:20
      `;
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = mockStack;
        }
      } as any;
      const result = detectSpecPath();
      expect(result).toBe('tests/specs/ui/home-page/feature.spec.ts');
      global.Error = originalError;
    });

    it('should detect first spec file path in stack', () => {
      const mockStack = `
        Error
            at detectSpecPath (src/utils/stack-trace.ts:10:15)
            at tests/specs/api/products.spec.ts:5:10
            at tests/specs/ui/home-page/catalog-toolbar.spec.ts:12:20
      `;

      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = mockStack;
        }
      } as any;
      const result = detectSpecPath();
      expect(result).toBe('tests/specs/api/products.spec.ts');
      global.Error = originalError;
    });

    it('should detect spec file path with additional query params', () => {
      const mockStack = `
        Error
            at detectSpecPath (src/utils/stack-trace.ts:10:15)
            at file:///home/project/tests/specs/ui/home-page/catalog.spec.ts?test=1:12:20
      `;
      const originalError = global.Error;
      global.Error = class extends originalError {
        constructor() {
          super();
          this.stack = mockStack;
        }
      } as any;
      const result = detectSpecPath();
      expect(result).toContain('tests/specs/ui/home-page/catalog.spec.ts');
      global.Error = originalError;
    });
  });
});
