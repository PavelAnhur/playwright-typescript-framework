import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';


test.describe('Seller API -- GET /api/v1/products/seller/mine', () => {
  test('seller can get their own listings', async ({ authedSeller1 }) => {
    const response = await authedSeller1.get('products/seller/mine');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.products).toBeDefined();
    expect(Array.isArray(body.products)).toBe(true);
    body.products.forEach((product: Product) => {
      expect(product.sellerId).toBeDefined();
      expect(product.sellerName).toBe('Atelier Maison');
      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.priceCents).toBeDefined();
      expect(product.effectiveCents).toBeDefined();
      expect(product.onSale).toBeDefined();
    });
  });

  test('buyer cannot access seller listings', async ({ authedBuyer }) => {
    const response = await authedBuyer.get('products/seller/mine');
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('FORBIDDEN_ROLE');
    expect(body.error.message).toContain('seller');
  });

  test('unauthenticated user cannot access seller listings', async ({ api }) => {
    const response = await api.get('products/seller/mine');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});
