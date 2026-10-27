import { ENV, expect, test, request } from '@fixtures';
import { parseErrorEnvelope } from '../schemas/error-envelope.schema';

test.describe('Seller API -- IDOR and Security Tests', () => {
  let productIds: number[] = [];

  test.beforeEach(async ({ createProduct, authedSeller1, authedSeller2 }) => {
    // Create products with different sellers
    const productIdSeller1 = await createProduct({
      name: 'Seller 1 Product',
      description: 'IDOR test product',
      priceCents: 1000,
      category: 'test',
      stock: 5,
      seller: authedSeller1,
    }).then(product => product.id);
    const productIdSeller2 = await createProduct({
      name: 'Seller 2 Product',
      description: 'IDOR test product',
      priceCents: 1000,
      category: 'test',
      stock: 5,
      seller: authedSeller2,
    }).then(product => product.id);
    productIds = [productIdSeller1, productIdSeller2];
  });

  test("seller cannot access/modify other seller's products (IDOR protection)", async ({
    authedSeller1,
    authedSeller2,
  }) => {
    const response1 = await authedSeller1.patch(`products/${productIds[1]}`, {
      data: { name: 'Attempted update by seller1' },
    });
    expect(response1.status()).toBe(403);
    const response2 = await authedSeller2.patch(`products/${productIds[0]}`, {
      data: { name: 'Attempted update by seller2' },
    });
    expect(response2.status()).toBe(403);
    const response3 = await authedSeller1.post(`products/${productIds[1]}/images`, {
      data: { url: 'https://example.com/idor-image.jpg' },
    });
    expect(response3.status()).toBe(403);
    const response4 = await authedSeller1.put(`products/${productIds[1]}/discount`, {
      data: { type: 'percentage', value: 10 },
    });
    expect(response4.status()).toBe(403);
    const response5 = await authedSeller1.delete(`products/${productIds[1]}/discount`);
    expect(response5.status()).toBe(403);
    const response6 = await authedSeller1.post(`products/${productIds[1]}/certificate`);
    expect(response6.status()).toBe(403);
  });

  test('product detail endpoint does not leak sensitive information to buyers', async ({
    authedSeller1,
    authedBuyer,
  }) => {
    const sellerResponse = await authedSeller1.get(`products/${productIds[0]}`);
    const sellerData = await sellerResponse.json();
    expect(sellerData.product.sellerId).toBeDefined();
    expect(sellerData.product.sellerName).toBeDefined();
    expect(sellerData.product.stock).toBeDefined();
    const buyerResponse = await authedBuyer.get(`products/${productIds[0]}`);
    const buyerData = await buyerResponse.json();
    expect(buyerData.product.sellerName).toBeDefined();
    expect(buyerData.product.stock).toBeDefined();
  });

  test('unauthenticated users cannot access seller routes', async () => {
    const unauthenticatedContext = await request.newContext({
      baseURL: `${ENV.apiURL}/`,
    });
    try {
      // Test GET
      let response = await unauthenticatedContext.get('products/seller/mine');
      expect(response.status()).toBe(401);
      let body = await response.json();
      parseErrorEnvelope(body);
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test POST
      response = await unauthenticatedContext.post('products');
      expect(response.status()).toBe(401);
      body = await response.json();
      parseErrorEnvelope(body);
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test PATCH
      response = await unauthenticatedContext.patch(`products/${productIds[0]}`);
      expect(response.status()).toBe(401);
      body = await response.json();
      parseErrorEnvelope(body);
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test POST image
      response = await unauthenticatedContext.post(`products/${productIds[0]}/images`);
      expect(response.status()).toBe(401);
      body = await response.json();
      parseErrorEnvelope(body);
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test PUT discount
      response = await unauthenticatedContext.put(`products/${productIds[0]}/discount`);
      expect(response.status()).toBe(401);
      body = await response.json();
      parseErrorEnvelope(body);
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test DELETE discount
      response = await unauthenticatedContext.delete(`products/${productIds[0]}/discount`);
      expect(response.status()).toBe(401);
      body = await response.json();
      parseErrorEnvelope(body);
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test POST certificate
      response = await unauthenticatedContext.post(`products/${productIds[0]}/certificate`);
      expect(response.status()).toBe(401);
      body = await response.json();
      parseErrorEnvelope(body);
      expect(body.error.code).toBe('UNAUTHENTICATED');
    } finally {
      await unauthenticatedContext.dispose();
    }
  });
});
