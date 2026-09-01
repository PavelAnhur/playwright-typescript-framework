import { ENV } from '@config/env';
import { expect, test } from '@fixtures';
import type { User } from '@src/types/account';
import type { Cart, Order, Product } from '@src/types/product';

test.describe('Buyer API - Authenticated Scenarios', () => {
  test.beforeEach(async ({ api }) => {
    // Reset the database to a clean state before each test
    await api.post('_reset');
  });

  test.describe.serial('Cart Operations', () => {
    test('should get empty cart for new user', async ({ authedBuyer }) => {
      const response = await authedBuyer.get('cart');
      expect(response.ok()).toBeTruthy();
      const responseData = await response.json();
      const cart: Cart = responseData.cart;
      expect(cart.items).toHaveLength(0);
      expect(cart.subtotalCents).toBe(0);
      expect(cart.count).toBe(0);
    });

    test('should add item to cart', async ({ authedBuyer, api }) => {
      // Get a product first
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product: Product = productsData.products[0];
      // Add to cart
      const response = await authedBuyer.post('cart/items', {
        data: {
          productId: product.id,
          quantity: 2,
        },
      });
      expect(response.ok()).toBeTruthy();
      const responseData = await response.json();
      const cart: Cart = responseData.cart;
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]?.productId).toBe(product.id);
      expect(cart.items[0]?.quantity).toBe(2);
      expect(cart.items[0]?.unitCents).toBe(product.effectiveCents || product.priceCents);
      expect(cart.subtotalCents).toBe(product.priceCents * 2);
    });

    test('should update item quantity in cart', async ({ api, authedBuyer }) => {
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product: Product = productsData.products[0];
      // Add to cart
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 1 },
      });
      // Update quantity
      const response = await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 5 },
      });
      expect(response.ok()).toBeTruthy();
      const responseData = await response.json();
      const cart: Cart = responseData.cart;
      expect(cart.items[0]?.quantity).toBe(5);
      expect(cart.subtotalCents).toBe(product.priceCents * 5);
    });

    test('should remove item from cart', async ({ api, authedBuyer }) => {
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product: Product = productsData.products[0];
      // Add to cart
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 1 },
      });
      // Get cart to get item ID
      const getCartResponse = await authedBuyer.get('cart');
      const cart: Cart = await getCartResponse.json()
        .then(resData => resData.cart);
      const itemId = cart.items[0]?.itemId;
      // Remove item
      const response = await authedBuyer.delete(`cart/items/${itemId}`);
      expect(response.ok()).toBeTruthy();
      const updatedCart: Cart = await response.json()
        .then(resData => resData.cart);
      expect(updatedCart.items).toHaveLength(0);
      expect(updatedCart.subtotalCents).toBe(0);
    });

    test('should clear entire cart', async ({ api, authedBuyer }) => {
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product = productsData.products[0];
      // Add to cart
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 1 }
      });
      // Clear cart
      const response = await authedBuyer.delete('cart');
      expect(response.ok()).toBeTruthy();
      const cart: Cart = await response.json()
        .then(resData => resData.cart);
      expect(cart.items).toHaveLength(0);
      expect(cart.subtotalCents).toBe(0);
    });

    test('should return 400 when adding product with invalid quantity', async ({ api, authedBuyer }) => {
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product = productsData.products[0];

      const response = await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 0 },
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
      // Add to cart
      const cartResponse = await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 1 },
      });
      expect(cartResponse.ok()).toBeTruthy();
      const cart: Cart = await cartResponse.json()
        .then(resData => resData.cart);
      expect(cart.items[0]?.unitCents).toBe(product.effectiveCents);
      expect(cart.subtotalCents).toBe(product.effectiveCents);
    });
  });

  test.describe('Order Operations', () => {
    test.fixme('should create order from cart', async ({ api, authedBuyer }) => {
      // Get a product
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product = productsData.products[0];
      // Add to cart
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 2 },
      });
      // Create order
      const response = await authedBuyer.post('orders');
      expect(response.ok()).toBeTruthy();
      const order: Order = await response.json()
        .then(resData => resData.order);
      expect(order.items).toHaveLength(1);
      expect(order.items[0]?.productId).toBe(product.id);
      expect(order.items[0]?.quantity).toBe(2);
      expect(order.totalCents).toBe(product.effectiveCents * 2 || product.priceCents * 2);
      expect(order.status).toBe('confirmed');
      expect(order.reference).toBeDefined();
      // Verify cart is cleared after order
      const cartResponse = await authedBuyer.get('cart');
      const cart: Cart = await cartResponse.json()
        .then(resData => resData.cart);
      expect(cart.items).toHaveLength(0);
    });

    test.fixme('should get order history', async ({ api, authedBuyer }) => {
      // Create an order first
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product = productsData.products[0];
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 1 },
      });
      await authedBuyer.post('orders');
      // Get order history
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

    test.fixme('should get single order by reference', async ({ api, authedBuyer }) => {
      // Create an order
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product = productsData.products[0];
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 1 },
      });
      const orderResponse = await authedBuyer.post('orders');
      const createdOrder = await orderResponse.json();
      const reference = createdOrder.reference;
      // Get specific order
      const response = await authedBuyer.get(`orders/${reference}`);
      expect(response.ok()).toBeTruthy();
      const order: Order = await response.json()
        .then(resData => resData.order);
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

    test.fixme('should return 403 when accessing another buyers order', async ({ api, authedBuyer, authedSeller1 }) => {
      // Create an order as buyer
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product = productsData.products[0];
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 1 },
      });
      const orderResponse = await authedBuyer.post('orders');
      const { createdOrder } = await orderResponse.json();
      const reference = createdOrder.reference;
      // Try to access order with invalid token (simulating different user)
      const response = await authedSeller1.get(`orders/${reference}`);
      expect(response.status()).toBe(401);
    });

    test('should not create order with empty cart', async ({ authedBuyer }) => {
      const response = await authedBuyer.post('orders');
      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.error.code).toBe('INVALID_SHIPPING');
    });

    test.fixme('should decrement stock when order is created', async ({ api, authedBuyer }) => {
      // Get a product and check initial stock
      const productResponse = await api.get('products/1');
      const product: Product = await productResponse.json()
        .then(resData => resData.product);
      const initialStock = product.stock || 0;
      // Add to cart
      await authedBuyer.post('cart/items', {
        data: { productId: 1, quantity: 2 },
      });
      // Create order
      await authedBuyer.post('orders');
      // Verify stock decreased
      const updatedProductResponse = await api.get('products/1');
      const updatedProduct: Product = await updatedProductResponse.json()
        .then(resData => resData.product);
      expect(updatedProduct.stock).toBe(initialStock - 2);
    });

    test('should not allow order if stock is insufficient', async ({ api, authedBuyer }) => {
      // Get a product with limited stock
      const productResponse = await api.get('products/1');
      const stock = await productResponse.json()
        .then(resData => resData.product.stock);
      // Try to add more than available stock
      const response = await authedBuyer.post('cart/items', {
        data: { productId: 1, quantity: stock + 1 },
      });
      expect(response.status()).toBe(409);
      const error = await response.json();
      expect(error.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should return 401 when accessing cart without token', async ({ api }) => {
      const response = await api.get('cart');
      expect(response.status()).toBe(401);
      const error = await response.json();
      expect(error.error.code).toBe('UNAUTHENTICATED');
    });

    test('should return 401 when accessing orders without token', async ({ api }) => {
      const response = await api.get('orders');
      expect(response.status()).toBe(401);

      const error = await response.json();
      expect(error.error.code).toBe('UNAUTHENTICATED');
    });

    test('should return 401 with invalid token', async ({ api }) => {
      const response = await api.get('cart', {
        headers: { 'Authorization': 'Bearer invalid-token' },
      });
      expect(response.status()).toBe(401);
      const error = await response.json();
      expect(error.error.code).toBe('UNAUTHENTICATED');
    });

    test('should return user info from /auth/me', async ({ authedBuyer }) => {
      const response = await authedBuyer.get('auth/me');
      expect(response.ok()).toBeTruthy();
      const user: User = await response.json()
        .then(resData => resData.user);
      expect(user.email).toBe(ENV.testUsers[0].testBuyer.email);
      expect(user.role).toBe('buyer');
      expect(user.id).toBeDefined();
    });

    test.fixme('should logout successfully', async ({ authedBuyer }) => {
      const response = await authedBuyer.post('auth/logout');
      expect(response.ok()).toBeTruthy();
      // Verify token is invalidated
      const meResponse = await authedBuyer.get('auth/me');
      expect(meResponse.status()).toBe(401);
    });
  });

  test.describe('Error Envelope Compliance', () => {
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
  });
});
