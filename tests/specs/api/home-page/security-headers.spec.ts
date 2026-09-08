import { expect, test } from '@fixtures';


test.describe('Hoem Page API -- Security Headers', () => {
  test('should have proper security headers', async ({ api }) => {
    const response = await api.get('products');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toBeDefined();
    expect(headers['content-security-policy']).toBeDefined();
  });

  test('should not expose X-Powered-By header', async ({ api }) => {
    const response = await api.get('products');
    expect(response.headers()['x-powered-by']).toBeUndefined();
  });
});
