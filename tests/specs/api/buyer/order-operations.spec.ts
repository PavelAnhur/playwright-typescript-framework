import { expect, test } from '@fixtures';
import type { Cart } from '@src/types/cart';
import type { Order } from '@src/types/order';
import type { Product } from '@src/types/product';


test.describe('Buyer API -- Order Operations', () => {

  test.beforeAll(async ({ api, authedBuyer }) => {
    await api.post('_reset');
    await authedBuyer.delete('cart');
  });

  test('should get order history', async ({ api, authedBuyer, createOrder }) => {
    const products = await api.get('products');
    const data = await products.json();
    const testProduct = data.products[6];
    await createOrder([
      { productId: testProduct.id, quantity: 1 }
    ]);
    const response = await authedBuyer.get('orders');
    expect(response.ok()).toBeTruthy();
    const { orders } = await response.json();
    expect(Array.isArray(orders)).toBeTruthy();
    expect(orders.length).toBeGreaterThanOrEqual(1);
    expect(orders[0]).toMatchObject({
      reference: expect.any(String),
      totalCents: expect.any(Number),
      status: 'confirmed',
      items: expect.any(Array),
    });
  });

  test('should get single order by reference', async ({
    api,
    authedBuyer,
    createOrder
  }) => {
    const products = await api.get('products');
    const data = await products.json();
    const testProductId = data.products[5].id;
    const orderResponse = await createOrder([
      { productId: testProductId, quantity: 1 }
    ]);
    const createdOrder: Order = await orderResponse.json()
      .then(responseData => responseData.order);
    const reference = createdOrder.reference;
    const response = await authedBuyer.get(`orders/${reference}`);
    expect(response.ok()).toBeTruthy();
    const order: Order = await response.json()
      .then(responseData => responseData.order);
    expect(order.reference).toBe(reference);
    expect(order.totalCents).toBe(createdOrder.totalCents);
    expect(order.status).toBe('confirmed');
  });

  test('should return 404 for non-existent order reference', async ({ authedBuyer }) => {
    const response = await authedBuyer.get('orders/NONEXISTENT-123');
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error.error.code).toBe('ORDER_NOT_FOUND');
  });

  test('should not create order with empty cart', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('orders');
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error.code).toBe('INVALID_SHIPPING');
  });

  test('should not allow order if stock is insufficient', async ({ api, authedBuyer }) => {
    const productResponse = await api.get('products/1');
    const stock = await productResponse.json()
      .then(responseData => responseData.product.stock);
    const response = await authedBuyer.post('cart/items', {
      data: { productId: 1, quantity: stock + 1 },
    });
    expect(response.status()).toBe(409);
    const error = await response.json();
    expect(error.error.code).toBe('INSUFFICIENT_STOCK');
  });

  test('should return 403 when accessing another buyers order', async ({
    api,
    createOrder,
    authedSeller1
  }) => {
    const products = await api.get('products');
    const testProductId = await products.json()
      .then(responseData => responseData.products[5].id);
    const orderResponse = await createOrder([
      { productId: testProductId, quantity: 2 }
    ]);
    const data = await orderResponse.json();
    const createdOrder = data.order;
    const reference = createdOrder.reference;
    // Try to access order with invalid token (simulating different user)
    const response = await authedSeller1.get(`orders/${reference}`);
    expect(response.status()).toBe(403);
  });

  test('should decrement stock when order is created', async ({ api, createOrder }) => {
    const productId = 3;
    const productResponse = await api.get(`products/${productId}`);
    const initialStock = await productResponse.json()
      .then(responseData => responseData.product.stock);
    await createOrder([
      { productId, quantity: 2 }
    ]);
    const updatedProductResponse = await api.get(`products/${productId}`);
    const updatedProduct: Product = await updatedProductResponse.json()
      .then(responseData => responseData.product);
    expect(updatedProduct.stock).toBe(initialStock - 2);
  });

  test('should create order from cart', async ({ api, authedBuyer, createOrder }) => {
    const response = await api.get('products');
    const product = await response.json()
      .then(responseData => responseData.products[2]);
    const responseOrder = await createOrder([
      { productId: product.id, quantity: 2 }
    ]);
    expect(responseOrder.ok()).toBeTruthy();
    const order: Order = await responseOrder.json()
      .then(responseData => responseData.order);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]?.quantity).toBe(2);
    expect(order.totalCents).toBe(product.effectiveCents! * 2 || product.priceCents! * 2);
    expect(order.status).toBe('confirmed');
    expect(order.reference).toBeDefined();
    const cartResponse = await authedBuyer.get('cart');
    const cart: Cart = await cartResponse.json()
      .then(responseData => responseData.cart);
    expect(cart.items).toHaveLength(0);
  });
});
