import { expect, test } from '@fixtures';
import type { Certificate } from '@src/types/certificate';


test.describe('Seller API -- POST /api/v1/products/:id/certificate', () => {
  let productId: number;

  test.beforeEach(async ({ createProduct }) => {
    productId = await createProduct({
      name: 'Certificate Test Product',
      description: 'Product for certificate testing',
      priceCents: 5000,
      category: 'art',
      stock: 1,
    }).then(product => product.id);
  });

  test('seller can issue certificate for their product', async ({ authedSeller1 }) => {
    const response = await authedSeller1.post(`products/${productId}/certificate`);
    expect(response.status()).toBe(201);
    const certificateResponse = await authedSeller1.get(`products/${productId}/certificate`);
    const certificate: Certificate = await certificateResponse.json()
      .then(resData => resData.certificate);
    expect(certificate.productId).toBe(productId);
    expect(certificate.issuedAt).toEqual('2024-01-01');
    expect(certificate.issuer).toBe('Maison Atelier');
    expect(certificate.serialNo).toBe(`MAISON-AC-00${productId}`);
  });

  test('seller cannot issue certificate for another seller\'s product', async ({ authedSeller2 }) => {
    const response = await authedSeller2.post(`products/${productId}/certificate`);
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN_NOT_OWNER');
  });

  test.fixme('seller cannot issue duplicate certificate for same product', async ({ authedSeller1 }) => {
    // First certificate
    await authedSeller1.post(`products/${productId}/certificate`);
    // Second certificate (should fail)
    const response = await authedSeller1.post(`products/${productId}/certificate`);
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('already has a certificate');
  });

  test('buyer cannot issue certificate', async ({ authedBuyer }) => {
    const response = await authedBuyer.post(`products/${productId}/certificate`);
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN_ROLE');
  });
});
