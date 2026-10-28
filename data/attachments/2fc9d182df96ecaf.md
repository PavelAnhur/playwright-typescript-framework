# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/buyer/cart-operations.spec.ts >> Buyer API -- Cart Operations >> should remove item from cart
- Location: tests/specs/api/buyer/cart-operations.spec.ts:26:3

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 1
Received length: 2
Received array:  [{"image": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22800%22%20viewBox%3D%220%200%20800%20800%22%3E%0A%20%20%20%20%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%22%20stop-color%3D%22%234a3d4f%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230c0b0a%22%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22url(%23g)%22%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22320%22%20r%3D%22150%22%20fill%3D%22none%22%20stroke%3D%22%23c8a96a%22%20stroke-width%3D%221.5%22%20opacity%3D%220.5%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22400%22%20y%3D%22360%22%20font-family%3D%22Georgia%2C%20serif%22%20font-size%3D%22160%22%20fill%3D%22%23c8a96a%22%0A%20%20%20%20%20%20text-anchor%3D%22middle%22%20opacity%3D%220.9%22%3ECO%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22400%22%20y%3D%22620%22%20font-family%3D%22Georgia%2C%20serif%22%20font-size%3D%2234%22%20fill%3D%22%23e8e2d6%22%0A%20%20%20%20%20%20text-anchor%3D%22middle%22%20letter-spacing%3D%226%22%20opacity%3D%220.85%22%3EMAISON%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E", "itemId": 2, "lineCents": 192000, "name": "Cashmere Opera Scarf", "productId": 3, "quantity": 2, "stock": 20, "unitCents": 96000}, {"image": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22800%22%20viewBox%3D%220%200%20800%20800%22%3E%0A%20%20%20%20%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23dedad4%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230c0b0a%22%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22url(%23g)%22%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22320%22%20r%3D%22150%22%20fill%3D%22none%22%20stroke%3D%22%23c8a96a%22%20stroke-width%3D%221.5%22%20opacity%3D%220.5%22%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22400%22%20y%3D%22360%22%20font-family%3D%22Georgia%2C%20serif%22%20font-size%3D%22160%22%20fill%3D%22%23c8a96a%22%0A%20%20%20%20%20%20text-anchor%3D%22middle%22%20opacity%3D%220.9%22%3EPC%3C%2Ftext%3E%0A%20%20%20%20%3Ctext%20x%3D%22400%22%20y%3D%22620%22%20font-family%3D%22Georgia%2C%20serif%22%20font-size%3D%2234%22%20fill%3D%22%23e8e2d6%22%0A%20%20%20%20%20%20text-anchor%3D%22middle%22%20letter-spacing%3D%226%22%20opacity%3D%220.85%22%3EMAISON%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E", "itemId": 1, "lineCents": 720000, "name": "Pearl Cuff Bracelet", "productId": 22, "quantity": 3, "stock": 5, "unitCents": 240000}]
```

# Test source

```ts
  1   | import { expect, test } from '@fixtures';
  2   | import type { Cart } from '@src/types/cart';
  3   | import type { Product } from '@src/types/product';
  4   | import { parseErrorEnvelope } from '../schemas/error-envelope.schema';
  5   | 
  6   | test.describe('Buyer API -- Cart Operations', () => {
  7   |   let testProduct: Product;
  8   | 
  9   |   test.beforeEach(async ({ api }) => {
  10  |     await api.post('_reset');
  11  |     const response = await api.get('products');
  12  |     const data = await response.json();
  13  |     testProduct = data.products[0];
  14  |   });
  15  | 
  16  |   test('should get empty cart for new user', async ({ authedBuyer }) => {
  17  |     const response = await authedBuyer.get('cart');
  18  |     expect(response.ok()).toBeTruthy();
  19  |     const responseData = await response.json();
  20  |     const cart: Cart = responseData.cart;
  21  |     expect(cart.items).toHaveLength(0);
  22  |     expect(cart.subtotalCents).toBe(0);
  23  |     expect(cart.count).toBe(0);
  24  |   });
  25  | 
  26  |   test('should remove item from cart', async ({ authedBuyer }) => {
  27  |     const addResponse = await authedBuyer.post('cart/items', {
  28  |       data: { productId: testProduct.id, quantity: 3 },
  29  |     });
  30  |     expect(addResponse.ok()).toBeTruthy();
  31  |     const cartResponse = await authedBuyer.get('cart');
  32  |     expect(cartResponse.ok()).toBeTruthy();
  33  |     const cart: Cart = await cartResponse.json().then(responseData => responseData.cart);
> 34  |     expect(cart.items).toHaveLength(1);
      |                        ^ Error: expect(received).toHaveLength(expected)
  35  |     expect(cart.items[0]).toBeDefined();
  36  |     const itemId = cart.items[0]?.itemId;
  37  |     expect(itemId).toBeDefined();
  38  |     const response = await authedBuyer.delete(`cart/items/${itemId}`);
  39  |     expect(response.ok()).toBeTruthy();
  40  |     const updatedCart: Cart = await response.json().then(resData => resData.cart);
  41  |     expect(updatedCart.items).toHaveLength(0);
  42  |     expect(updatedCart.subtotalCents).toBe(0);
  43  |   });
  44  | 
  45  |   test('should add item to cart', async ({ authedBuyer }) => {
  46  |     const response = await authedBuyer.post('cart/items', {
  47  |       data: {
  48  |         productId: testProduct.id,
  49  |         quantity: 2,
  50  |       },
  51  |     });
  52  |     expect(response.ok()).toBeTruthy();
  53  |     const responseData = await response.json();
  54  |     const cart: Cart = responseData.cart;
  55  |     expect(cart.items).toHaveLength(1);
  56  |     expect(cart.items[0]?.productId).toBe(testProduct.id);
  57  |     expect(cart.items[0]?.quantity).toBe(2);
  58  |     expect(cart.items[0]?.unitCents).toBe(testProduct.effectiveCents || testProduct.priceCents);
  59  |     expect(cart.subtotalCents).toBe(testProduct.priceCents! * 2);
  60  |   });
  61  | 
  62  |   test('should update item quantity in cart', async ({ authedBuyer }) => {
  63  |     const response = await authedBuyer.post('cart/items', {
  64  |       data: { productId: testProduct.id, quantity: 5 },
  65  |     });
  66  |     expect(response.ok()).toBeTruthy();
  67  |     const responseData = await response.json();
  68  |     const cart: Cart = responseData.cart;
  69  |     expect(cart.items[0]?.quantity).toBe(5);
  70  |     expect(cart.subtotalCents).toBe(testProduct.priceCents! * 5);
  71  |   });
  72  | 
  73  |   test('should clear entire cart', async ({ authedBuyer }) => {
  74  |     await authedBuyer.post('cart/items', {
  75  |       data: { productId: testProduct.id, quantity: 2 },
  76  |     });
  77  |     const response = await authedBuyer.delete('cart');
  78  |     expect(response.ok()).toBeTruthy();
  79  |     const cart: Cart = await response.json().then(resData => resData.cart);
  80  |     expect(cart.items).toHaveLength(0);
  81  |     expect(cart.subtotalCents).toBe(0);
  82  |   });
  83  | 
  84  |   test('should return 400 when adding product with invalid quantity', async ({ authedBuyer }) => {
  85  |     const response = await authedBuyer.post('cart/items', {
  86  |       data: { productId: testProduct.id, quantity: 0 },
  87  |     });
  88  |     expect(response.status()).toBe(400);
  89  |     const error = await response.json();
  90  |     parseErrorEnvelope(error);
  91  |     expect(error.error.code).toBe('INVALID_QUANTITY');
  92  |   });
  93  | 
  94  |   test('should return 404 when adding non-existent product to cart', async ({ authedBuyer }) => {
  95  |     const response = await authedBuyer.post('cart/items', {
  96  |       data: { productId: 99999, quantity: 1 },
  97  |     });
  98  |     expect(response.status()).toBe(404);
  99  |     const error = await response.json();
  100 |     parseErrorEnvelope(error);
  101 |     expect(error.error.code).toBe('PRODUCT_NOT_FOUND');
  102 |   });
  103 | 
  104 |   test('should handle cart with discount correctly', async ({ api, authedBuyer }) => {
  105 |     // Get product with discount (product 1 has 15% discount)
  106 |     const response = await api.get('products/1');
  107 |     const product: Product = await response.json().then(resData => resData.product);
  108 |     const cartResponse = await authedBuyer.post('cart/items', {
  109 |       data: { productId: product.id, quantity: 1 },
  110 |     });
  111 |     expect(cartResponse.ok()).toBeTruthy();
  112 |     const cart: Cart = await cartResponse.json().then(resData => resData.cart);
  113 |     expect(cart.items[0]?.unitCents).toBe(product.effectiveCents);
  114 |     expect(cart.subtotalCents).toBe(product.effectiveCents);
  115 |   });
  116 | });
  117 | 
```