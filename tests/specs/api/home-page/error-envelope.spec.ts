import { expect, test } from '@fixtures';
import { parseErrorEnvelope } from '../schemas/error-envelope.schema';

test.describe('Home Page API -- API Error Envelope', () => {
  test('should return consistent error envelope', async ({ api }) => {
    const response = await api.get('products/999999999');
    expect(response.status()).toBe(404);
    parseErrorEnvelope(await response.json());
  });
});
