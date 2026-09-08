import { expect, test } from '@fixtures';


test.describe('Home Page API -- CORS Headers', () => {
  test('should include CORS headers for allowed origin', async ({ api }) => {
    const response = await api.get('products', {
      headers: {
        Origin: 'http://localhost:4000',
      },
    });
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:4000');
    expect(response.headers()['access-control-allow-credentials']).toBe('true');
  });

  test.fixme('should not include CORS headers for disallowed origin', async ({ api }) => {
    const response = await api.get('products', {
      headers: {
        Origin: 'https://evil.com',
      },
    });
    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });
});
