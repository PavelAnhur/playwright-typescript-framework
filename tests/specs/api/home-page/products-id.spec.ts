import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';


test.describe('Hoem Page API -- GET /api/v1/products/:id', () => {
  test('should return a single product by ID', async ({ api }) => {
    const productId = 5;
    const response = await api.get(`products/${productId}`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const product: Product = data.product;
    expect(product.category).toBe('Footwear');
    expect(product.discount?.type).toBe('fixed');
    expect(product.discount?.value).toEqual(20000);
  });

  test('should return 404 for non-existent product', async ({ api }) => {
    const response = await api.get('products/99999');
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      message: 'That product does not exist.',
    });
  });

  test('should handle invalid product ID format', async ({ api }) => {
    const response = await api.get('products/invalid');
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
