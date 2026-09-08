import { expect, test } from '@fixtures';


test.describe('Home Page API -- API Error Envelope', () => {
  test('should return consistent error envelope', async ({ api }) => {
    const response = await api.get('products/999999999');
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code');
    expect(data.error).toHaveProperty('message');
    // Code should be SCREAMING_SNAKE_CASE
    expect(data.error.code).toMatch(/^[A-Z_]+$/);
  });
});
