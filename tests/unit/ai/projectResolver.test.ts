import { describe, expect, it } from 'vitest';

import { deriveProject } from '@ai/tools/projectResolver';

describe('deriveProject', () => {
  it('derives "ui" from a spec under tests/specs/ui/', () => {
    expect(deriveProject('tests/specs/ui/home-page/accessibility.spec.ts')).toBe('ui');
  });

  it('derives "api" from a spec under tests/specs/api/', () => {
    expect(deriveProject('tests/specs/api/home-page/cors-headers.spec.ts')).toBe('api');
  });

  it('derives "review" from a spec under tests/specs/review/', () => {
    expect(deriveProject('tests/specs/review/something.spec.ts')).toBe('review');
  });

  it('returns null when spec path does not contain /specs/<project>/', () => {
    expect(deriveProject('some/random/path.spec.ts')).toBeNull();
  });

  it('returns null for an unknown project directory name', () => {
    expect(deriveProject('tests/specs/unknown/file.spec.ts')).toBeNull();
  });

  it('strips leading ./ from the path before matching', () => {
    expect(deriveProject('./tests/specs/ui/login.spec.ts')).toBe('ui');
  });

  it('strips leading . from the path before matching', () => {
    expect(deriveProject('.tests/specs/api/users.spec.ts')).toBe('api');
  });

  it('handles absolute-looking paths with /specs/', () => {
    expect(deriveProject('/home/user/project/tests/specs/ui/dashboard.spec.ts')).toBe('ui');
  });

  it('handles deeply nested paths', () => {
    expect(deriveProject('tests/specs/api/seller/products-certificate.spec.ts')).toBe('api');
  });

  it('returns null for empty string', () => {
    expect(deriveProject('')).toBeNull();
  });

  it('returns null for a path with no /specs/ segment', () => {
    expect(deriveProject('src/ai/tools/projectResolver.ts')).toBeNull();
  });
});
