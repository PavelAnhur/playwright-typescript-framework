import { expect, test } from '@fixtures';
import type { Certificate } from '@src/types/certificate';


test.describe('Home Page API -- GET /api/v1/products/:id/certificate', () => {
  test('should return certificate for product owned by seller1', async ({ api }) => {
    const productId = 1;
    const response = await api.get(`products/${productId}/certificate`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const cert: Certificate = data.certificate;
    expect(cert.id).toEqual(1);
    expect(cert.issuedAt).toEqual('2024-01-01');
    expect(cert.material).toEqual('Full-grain leather');
  });

  test('should return 404 for product without certificate (seller2)', async ({ api }) => {
    // Product 12+ are owned by seller2 and have no certificate per seed
    const productId = 12;
    const response = await api.get(`products/${productId}/certificate`);
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toMatchObject({
      code: 'CERTIFICATE_NOT_FOUND',
      message: expect.stringContaining('certificate'),
    });
  });

  test('should return 404 for non-existent product certificate', async ({ api }) => {
    const response = await api.get('products/9999999999/certificate');
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error.code).toBe('CERTIFICATE_NOT_FOUND');
  });
});
