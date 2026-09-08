import { expect, test } from '@fixtures';
import type { Cart } from '@src/types/cart';
import type { Product } from '@src/types/product';


test.describe('Buyer API -- Cart Operations', () => {
  let testProduct: Product;

  test.beforeEach(async ({ api, authedBuyer }) => {
    // Reset the database to a clean state before each test
    await api.post('_reset');
    const response = await api.get('products');
    const data = await response.json();
    testProduct = data.products[0];
    await authedBuyer.delete('cart');
  });

  test('should get empty cart for new user', async ({ authedBuyer }) => {
    const response = await authedBuyer.get('cart');
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    const cart: Cart = responseData.cart;
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotalCents).toBe(0);
    expect(cart.count).toBe(0);
  });

  test('should add item to cart', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('cart/items', {
      data: {
        productId: testProduct.id,
        quantity: 2,
      },
    });
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    const cart: Cart = responseData.cart;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.productId).toBe(testProduct.id);
    expect(cart.items[0]?.quantity).toBe(2);
    expect(cart.items[0]?.unitCents).toBe(testProduct.effectiveCents || testProduct.priceCents);
    expect(cart.subtotalCents).toBe(testProduct.priceCents! * 2);
  });

  test('should update item quantity in cart', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('cart/items', {
      data: { productId: testProduct.id, quantity: 5 },
    });
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    const cart: Cart = responseData.cart;
    expect(cart.items[0]?.quantity).toBe(5);
    expect(cart.subtotalCents).toBe(testProduct.priceCents! * 5);
  });

  test('should clear entire cart', async ({ authedBuyer }) => {
    await authedBuyer.post('cart/items', {
      data: { productId: testProduct.id, quantity: 2 }
    });
    const response = await authedBuyer.delete('cart');
    expect(response.ok()).toBeTruthy();
    const cart: Cart = await response.json()
      .then(resData => resData.cart);
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotalCents).toBe(0);
  });

  test('should return 400 when adding product with invalid quantity', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('cart/items', {
      data: { productId: testProduct.id, quantity: 0 },
    });
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error.code).toBe('INVALID_QUANTITY');
  });

  test('should return 404 when adding non-existent product to cart', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('cart/items', {
      data: { productId: 99999, quantity: 1 },
    });
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  test('should handle cart with discount correctly', async ({ api, authedBuyer }) => {
    // Get product with discount (product 1 has 15% discount)
    const response = await api.get('products/1');
    const product: Product = await response.json()
      .then(resData => resData.product);
    const cartResponse = await authedBuyer.post('cart/items', {
      data: { productId: product.id, quantity: 1 },
    });
    expect(cartResponse.ok()).toBeTruthy();
    const cart: Cart = await cartResponse.json()
      .then(resData => resData.cart);
    expect(cart.items[0]?.unitCents).toBe(product.effectiveCents);
    expect(cart.subtotalCents).toBe(product.effectiveCents);
  });

  test('should remove item from cart', async ({ api, authedBuyer }) => {
    const productsResponse = await api.get('products');
    const product = await productsResponse.json()
      .then(responseData => responseData.products[9]);
    await authedBuyer.post('cart/items', {
      data: { productId: product.id, quantity: 2 },
    });
    const cartResponse = await authedBuyer.get('cart');
    const cart: Cart = await cartResponse.json()
      .then(responseData => responseData.cart);
    const itemId = cart.items[0]?.itemId;
    const response = await authedBuyer.delete(`cart/items/${itemId}`);
    expect(response.ok()).toBeTruthy();
    const updatedCart: Cart = await response.json()
      .then(resData => resData.cart);
    expect(updatedCart.items).toHaveLength(0);
    expect(updatedCart.subtotalCents).toBe(0);
  });
});
