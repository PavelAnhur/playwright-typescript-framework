import { describe, expect, it } from 'vitest';

import { deriveProject } from '@ai/tools/projectResolver';

type Row = [string, string | null, string];

describe('unit', () => {
  describe('deriveProject', () => {
    it.each<Row>([
      ['tests/specs/ui/home-page/accessibility.spec.ts', 'ui', 'ui path'],
      ['tests/specs/api/home-page/cors-headers.spec.ts', 'api', 'api path'],
      ['tests/specs/review/something.spec.ts', 'review', 'review path'],
      ['some/random/path.spec.ts', null, 'no /specs/ segment'],
      ['tests/specs/unknown/file.spec.ts', null, 'unknown project dir'],
      ['./tests/specs/ui/login.spec.ts', 'ui', 'leading ./'],
      ['.tests/specs/api/users.spec.ts', 'api', 'leading . no slash'],
      ['/home/user/project/tests/specs/ui/dashboard.spec.ts', 'ui', 'absolute-looking'],
      ['tests/specs/api/seller/products-certificate.spec.ts', 'api', 'deeply nested'],
      ['', null, 'empty string'],
      ['src/ai/tools/projectResolver.ts', null, 'no /specs/ segment'],
    ])('deriveProject(%p) -> %s (case: %s)', (inputPath, expected, _desc) => {
      expect(deriveProject(inputPath)).toBe(expected);
    });
  });
});
