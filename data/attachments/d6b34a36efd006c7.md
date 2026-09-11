# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/buyer/order-operations.spec.ts >> Buyer API -- Order Operations >> should create order from cart
- Location: tests/specs/api/buyer/order-operations.spec.ts:27:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1   | import { expect, test } from '@fixtures';
  2   | import type { Cart } from '@src/types/cart';
  3   | import type { Order } from '@src/types/order';
  4   | import type { Product } from '@src/types/product';
  5   | 
  6   | 
  7   | test.describe('Buyer API -- Order Operations', () => {
  8   | 
  9   |   test.beforeEach(async ({ api }) => {
  10  |     await api.post('_reset');
  11  |   });
  12  | 
  13  |   test('should decrement stock when order is created', async ({ api, createOrder }) => {
  14  |     const productId = 3;
  15  |     const productResponse = await api.get(`products/${productId}`);
  16  |     const initialStock = await productResponse.json()
  17  |       .then(responseData => responseData.product.stock);
  18  |     await createOrder([
  19  |       { productId, quantity: 2 }
  20  |     ]);
  21  |     const updatedProductResponse = await api.get(`products/${productId}`);
  22  |     const updatedProduct: Product = await updatedProductResponse.json()
  23  |       .then(responseData => responseData.product);
  24  |     expect(updatedProduct.stock).toBe(initialStock - 2);
  25  |   });
  26  | 
  27  |   test('should create order from cart', async ({ api, authedBuyer, createOrder }) => {
  28  |     const response = await api.get('products');
  29  |     const product = await response.json()
  30  |       .then(responseData => responseData.products[2]);
  31  |     const responseOrder = await createOrder([
  32  |       { productId: product.id, quantity: 2 }
  33  |     ]);
> 34  |     expect(responseOrder.ok()).toBeTruthy();
      |                                ^ Error: expect(received).toBeTruthy()
  35  |     const order: Order = await responseOrder.json()
  36  |       .then(responseData => responseData.order);
  37  |     expect(order.items).toHaveLength(1);
  38  |     expect(order.items[0]?.quantity).toBe(2);
  39  |     expect(order.totalCents).toBe(product.effectiveCents! * 2 || product.priceCents! * 2);
  40  |     expect(order.status).toBe('confirmed');
  41  |     expect(order.reference).toBeDefined();
  42  |     const cartResponse = await authedBuyer.get('cart');
  43  |     const cart: Cart = await cartResponse.json()
  44  |       .then(responseData => responseData.cart);
  45  |     expect(cart.items).toHaveLength(0);
  46  |   });
  47  | 
  48  |   test('should get order history', async ({ api, authedBuyer, createOrder }) => {
  49  |     const products = await api.get('products');
  50  |     const data = await products.json();
  51  |     const testProduct = data.products[6];
  52  |     await createOrder([
  53  |       { productId: testProduct.id, quantity: 1 }
  54  |     ]);
  55  |     const response = await authedBuyer.get('orders');
  56  |     expect(response.ok()).toBeTruthy();
  57  |     const { orders } = await response.json();
  58  |     expect(Array.isArray(orders)).toBeTruthy();
  59  |     expect(orders.length).toBeGreaterThanOrEqual(1);
  60  |     expect(orders[0]).toMatchObject({
  61  |       reference: expect.any(String),
  62  |       totalCents: expect.any(Number),
  63  |       status: 'confirmed',
  64  |       items: expect.any(Array),
  65  |     });
  66  |   });
  67  | 
  68  |   test('should get single order by reference', async ({
  69  |     api,
  70  |     authedBuyer,
  71  |     createOrder
  72  |   }) => {
  73  |     const products = await api.get('products');
  74  |     const data = await products.json();
  75  |     const testProductId = data.products[5].id;
  76  |     const orderResponse = await createOrder([
  77  |       { productId: testProductId, quantity: 1 }
  78  |     ]);
  79  |     const createdOrder: Order = await orderResponse.json()
  80  |       .then(responseData => responseData.order);
  81  |     const reference = createdOrder.reference;
  82  |     const response = await authedBuyer.get(`orders/${reference}`);
  83  |     expect(response.ok()).toBeTruthy();
  84  |     const order: Order = await response.json()
  85  |       .then(responseData => responseData.order);
  86  |     expect(order.reference).toBe(reference);
  87  |     expect(order.totalCents).toBe(createdOrder.totalCents);
  88  |     expect(order.status).toBe('confirmed');
  89  |   });
  90  | 
  91  |   test('should return 404 for non-existent order reference', async ({ authedBuyer }) => {
  92  |     const response = await authedBuyer.get('orders/NONEXISTENT-123');
  93  |     expect(response.status()).toBe(404);
  94  |     const error = await response.json();
  95  |     expect(error.error.code).toBe('ORDER_NOT_FOUND');
  96  |   });
  97  | 
  98  |   test('should not create order with empty cart', async ({ authedBuyer }) => {
  99  |     const response = await authedBuyer.post('orders');
  100 |     expect(response.status()).toBe(400);
  101 |     const error = await response.json();
  102 |     expect(error.error.code).toBe('INVALID_SHIPPING');
  103 |   });
  104 | 
  105 |   test('should not allow order if stock is insufficient', async ({ api, authedBuyer }) => {
  106 |     const productResponse = await api.get('products/1');
  107 |     const stock = await productResponse.json()
  108 |       .then(responseData => responseData.product.stock);
  109 |     const response = await authedBuyer.post('cart/items', {
  110 |       data: { productId: 1, quantity: stock + 1 },
  111 |     });
  112 |     expect(response.status()).toBe(409);
  113 |     const error = await response.json();
  114 |     expect(error.error.code).toBe('INSUFFICIENT_STOCK');
  115 |   });
  116 | 
  117 |   test('should return 403 when accessing another buyers order', async ({
  118 |     api,
  119 |     createOrder,
  120 |     authedSeller1
  121 |   }) => {
  122 |     const products = await api.get('products');
  123 |     const testProductId = await products.json()
  124 |       .then(responseData => responseData.products[5].id);
  125 |     const orderResponse = await createOrder([
  126 |       { productId: testProductId, quantity: 2 }
  127 |     ]);
  128 |     const data = await orderResponse.json();
  129 |     const createdOrder = data.order;
  130 |     const reference = createdOrder.reference;
  131 |     // Try to access order with invalid token (simulating different user)
  132 |     const response = await authedSeller1.get(`orders/${reference}`);
  133 |     expect(response.status()).toBe(403);
  134 |   });
```