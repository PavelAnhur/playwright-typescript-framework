import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';


test.describe('Buyer API -- Error Envelope Compliance', () => {
  let testProduct: Product;

  test.beforeEach(async ({ api, authedBuyer }) => {
    await api.post('_reset');
    const response = await api.get('products');
    const data = await response.json();
    testProduct = data.products[0];
    await authedBuyer.delete('cart');
  });

  test('should return consistent error envelope for validation errors', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('cart/items', {
      data: { productId: 'invalid', quantity: 1 },
    });
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toHaveProperty('code');
    expect(error.error).toHaveProperty('message');
    expect(error.error.code).toMatch(/^[A-Z_]+$/); // SCREAMING_SNAKE_CASE
  });

  test('should return 404 error envelope for non-existent product', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('cart/items', {
      data: { productId: 99999, quantity: 1 },
    });
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error.error.code).toBe('PRODUCT_NOT_FOUND');
    expect(error.error.message).toBeDefined();
  });

  test('should return consistent error envelope for invalid quantity', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('cart/items', {
      data: { productId: testProduct.id, quantity: 0 },
    });
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toHaveProperty('code', 'INVALID_QUANTITY');
    expect(error.error).toHaveProperty('message');
  });

  test('should return consistent error envelope for insufficient stock', async ({ api, authedBuyer }) => {
    const productResponse = await api.get('products/1');
    const stock = await productResponse.json()
      .then(responseData => responseData.product.stock);
    const response = await authedBuyer.post('cart/items', {
      data: { productId: 1, quantity: stock + 1 },
    });
    expect(response.status()).toBe(409);
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toHaveProperty('code', 'INSUFFICIENT_STOCK');
    expect(error.error).toHaveProperty('message');
  });

  test('should return consistent error envelope for unauthorized access', async ({ api }) => {
    const response = await api.get('cart');
    expect(response.status()).toBe(401);
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toHaveProperty('code', 'UNAUTHENTICATED');
    expect(error.error).toHaveProperty('message');
  });

  test('should return consistent error envelope for order not found', async ({ authedBuyer }) => {
    const response = await authedBuyer.get('orders/NONEXISTENT-123');
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toHaveProperty('code', 'ORDER_NOT_FOUND');
    expect(error.error).toHaveProperty('message');
  });
});
