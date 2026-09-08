import { expect, test } from '@fixtures';


test.describe('Home Page API -- GET /api/v1/health', () => {
  test('should return ok status', async ({ api }) => {
    const response = await api.get('health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toEqual({
      service: 'maison',
      status: 'ok',
      time: expect.any(String),
    });
  });
});
