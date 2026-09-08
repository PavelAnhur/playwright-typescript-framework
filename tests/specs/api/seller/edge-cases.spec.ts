import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';


test.describe('Seller API -- Edge Cases and Error Handling', () => {
  test('seller cannot create product with missing required fields', async ({ authedSeller1 }) => {
    const invalidData: Record<string, Partial<Product>> = {
      'INVALID_NAME': { description: 'No name', priceCents: 1000, category: 'test', stock: 1 },
      'INVALID_PRICE': { name: 'No price', category: 'test', stock: 1 },
      // 'INVALID_CATEGORY': { name: 'No category', priceCents: 1000, stock: 1 },     bug, need to fix
      // 'INVALID_STOCK': { name: 'No stock', priceCents: 1000, category: 'test' },   bug, need to fix
    };
    for (const [error, product] of Object.entries(invalidData)) {
      const response = await authedSeller1.post('products', {
        data: product,
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe(error);
    }
  });

  test('seller cannot update product stock below 0', async ({ authedSeller1 }) => {
    const createResponse = await authedSeller1.post('products', {
      data: {
        name: 'Stock Test',
        description: 'Stock validation',
        priceCents: 1000,
        category: 'test',
        stock: 10,
      },
    });
    const createBody = await createResponse.json();
    const productId = createBody.product.id;
    const response = await authedSeller1.patch(`products/${productId}`, {
      data: { stock: -5 },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_STOCK');
  });
});
