# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/buyer/order-operations.spec.ts >> Buyer API -- Order Operations >> should create order from cart
- Location: tests/specs/api/buyer/order-operations.spec.ts:26:3

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 1
Received length: 2
Received array:  [{"name": "Stone Wool Trench Coat", "quantity": 2, "unitCents": 420000}, {"name": "Pearl Cuff Bracelet", "quantity": 3, "unitCents": 240000}]
```

# Test source

```ts
  1   | import { expect, test } from '@fixtures';
  2   | import type { Cart } from '@src/types/cart';
  3   | import type { Order } from '@src/types/order';
  4   | import type { Product } from '@src/types/product';
  5   | 
  6   | test.describe.configure({ mode: 'serial' });
  7   | test.describe('Buyer API -- Order Operations', () => {
  8   |   test.beforeEach(async ({ api }) => {
  9   |     await api.post('_reset');
  10  |   });
  11  | 
  12  |   test('should decrement stock when order is created', async ({ api, createOrder }) => {
  13  |     const productId = 3;
  14  |     const productResponse = await api.get(`products/${productId}`);
  15  |     const initialStock = await productResponse
  16  |       .json()
  17  |       .then(responseData => responseData.product.stock);
  18  |     await createOrder([{ productId, quantity: 2 }]);
  19  |     const updatedProductResponse = await api.get(`products/${productId}`);
  20  |     const updatedProduct: Product = await updatedProductResponse
  21  |       .json()
  22  |       .then(responseData => responseData.product);
  23  |     expect(updatedProduct.stock).toBe(initialStock - 2);
  24  |   });
  25  | 
  26  |   test('should create order from cart', async ({ api, authedBuyer, createOrder }) => {
  27  |     const response = await api.get('products');
  28  |     const product = await response.json().then(responseData => responseData.products[2]);
  29  |     const responseOrder = await createOrder([{ productId: product.id, quantity: 2 }]);
  30  |     expect(responseOrder.ok()).toBeTruthy();
  31  |     const order: Order = await responseOrder.json().then(responseData => responseData.order);
> 32  |     expect(order.items).toHaveLength(1);
      |                         ^ Error: expect(received).toHaveLength(expected)
  33  |     expect(order.items[0]?.quantity).toBe(2);
  34  |     expect(order.totalCents).toBe(product.effectiveCents! * 2 || product.priceCents! * 2);
  35  |     expect(order.status).toBe('confirmed');
  36  |     expect(order.reference).toBeDefined();
  37  |     const cartResponse = await authedBuyer.get('cart');
  38  |     const cart: Cart = await cartResponse.json().then(responseData => responseData.cart);
  39  |     expect(cart.items).toHaveLength(0);
  40  |   });
  41  | 
  42  |   test('should get order history', async ({ api, authedBuyer, createOrder }) => {
  43  |     const products = await api.get('products');
  44  |     const data = await products.json();
  45  |     const testProduct = data.products[6];
  46  |     await createOrder([{ productId: testProduct.id, quantity: 1 }]);
  47  |     const response = await authedBuyer.get('orders');
  48  |     expect(response.ok()).toBeTruthy();
  49  |     const { orders } = await response.json();
  50  |     expect(Array.isArray(orders)).toBeTruthy();
  51  |     expect(orders.length).toBeGreaterThanOrEqual(1);
  52  |     expect(orders[0]).toMatchObject({
  53  |       reference: expect.any(String),
  54  |       totalCents: expect.any(Number),
  55  |       status: 'confirmed',
  56  |       items: expect.any(Array),
  57  |     });
  58  |   });
  59  | 
  60  |   test('should get single order by reference', async ({ api, authedBuyer, createOrder }) => {
  61  |     const products = await api.get('products');
  62  |     const data = await products.json();
  63  |     const testProductId = data.products[5].id;
  64  |     const orderResponse = await createOrder([{ productId: testProductId, quantity: 1 }]);
  65  |     const createdOrder: Order = await orderResponse.json().then(responseData => responseData.order);
  66  |     const reference = createdOrder.reference;
  67  |     const response = await authedBuyer.get(`orders/${reference}`);
  68  |     expect(response.ok()).toBeTruthy();
  69  |     const order: Order = await response.json().then(responseData => responseData.order);
  70  |     expect(order.reference).toBe(reference);
  71  |     expect(order.totalCents).toBe(createdOrder.totalCents);
  72  |     expect(order.status).toBe('confirmed');
  73  |   });
  74  | 
  75  |   test('should return 404 for non-existent order reference', async ({ authedBuyer }) => {
  76  |     const response = await authedBuyer.get('orders/NONEXISTENT-123');
  77  |     expect(response.status()).toBe(404);
  78  |     const error = await response.json();
  79  |     expect(error.error.code).toBe('ORDER_NOT_FOUND');
  80  |   });
  81  | 
  82  |   test('should not create order with empty cart', async ({ authedBuyer }) => {
  83  |     const response = await authedBuyer.post('orders');
  84  |     expect(response.status()).toBe(400);
  85  |     const error = await response.json();
  86  |     expect(error.error.code).toBe('INVALID_SHIPPING');
  87  |   });
  88  | 
  89  |   test('should not allow order if stock is insufficient', async ({ api, authedBuyer }) => {
  90  |     const productResponse = await api.get('products/1');
  91  |     const stock = await productResponse.json().then(responseData => responseData.product.stock);
  92  |     const response = await authedBuyer.post('cart/items', {
  93  |       data: { productId: 1, quantity: stock + 1 },
  94  |     });
  95  |     expect(response.status()).toBe(409);
  96  |     const error = await response.json();
  97  |     expect(error.error.code).toBe('INSUFFICIENT_STOCK');
  98  |   });
  99  | 
  100 |   test('should return 403 when accessing another buyers order', async ({
  101 |     api,
  102 |     createOrder,
  103 |     authedSeller1,
  104 |   }) => {
  105 |     const products = await api.get('products');
  106 |     const testProductId = await products.json().then(responseData => responseData.products[5].id);
  107 |     const orderResponse = await createOrder([{ productId: testProductId, quantity: 2 }]);
  108 |     const data = await orderResponse.json();
  109 |     const createdOrder = data.order;
  110 |     const reference = createdOrder.reference;
  111 |     // Try to access order with invalid token (simulating different user)
  112 |     const response = await authedSeller1.get(`orders/${reference}`);
  113 |     expect(response.status()).toBe(403);
  114 |   });
  115 | });
  116 | 
```