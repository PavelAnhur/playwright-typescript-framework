import { ENV, expect, test } from '@fixtures';
import { request } from '@playwright/test';
import type { Certificate } from '@src/types/certificate';
import type { Product } from '@src/types/product';


test.describe('Seller API Tests', () => {
  test.beforeAll(async ({ api }) => {
    await api.post('_reset');
  });

  test.describe('GET /api/v1/products/seller/mine', () => {
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

  test.describe('POST /api/v1/products', () => {
    test('seller can create a new product', async ({ authedSeller1 }) => {
      const productData = {
        name: 'Handcrafted Leather Wallet',
        description: 'Premium full-grain leather wallet with RFID protection',
        priceCents: 4500,
        category: 'accessories',
        stock: 25,
      };
      const response = await authedSeller1.post('products', {
        data: productData,
      });
      expect(response.status()).toBe(201);
      const product: Product = await response.json()
        .then(resData => resData.product);
      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe(productData.name);
      expect(product.priceCents).toBe(productData.priceCents);
      expect(product.effectiveCents).toBe(productData.priceCents);
      expect(product.onSale).toBe(false);
      expect(product.sellerName).toBe('Atelier Maison');
      expect(product.stock).toBe(productData.stock);
    });

    test('seller cannot create product with invalid price', async ({ authedSeller1 }) => {
      const invalidProducts = [
        { name: 'Invalid', priceCents: -100, category: 'test', stock: 1 },
        // { name: 'Invalid', priceCents: 0, category: 'test', stock: 1 }, bug, need to fix
        { name: 'Invalid', priceCents: 1.5, category: 'test', stock: 1 },
      ];
      for (const product of invalidProducts) {
        const response = await authedSeller1.post('products', {
          data: product,
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error.code).toBe('INVALID_PRICE');
      }
    });

    test('seller cannot create product with negative stock', async ({ authedSeller1 }) => {
      const response = await authedSeller1.post('products', {
        data: {
          name: 'Invalid Stock',
          description: 'Negative stock test',
          priceCents: 1000,
          category: 'test',
          stock: -5,
        },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('INVALID_STOCK');
    });

    test('buyer cannot create product', async ({ authedBuyer }) => {
      const response = await authedBuyer.post('products', {
        data: {
          name: 'Buyer Product',
          description: 'Should fail',
          priceCents: 1000,
          category: 'test',
          stock: 1,
        },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  test.describe('PATCH /api/v1/products/:id', () => {
    test('seller can update their own product', async ({ createProduct, authedSeller1 }) => {
      const preProduct = await createProduct({
        name: 'Update Test Product',
        description: 'Initial description',
        priceCents: 5000,
        category: 'furniture',
        stock: 10,
      });
      const updates = {
        name: 'Updated Product Name',
        description: 'Updated description',
        priceCents: 5500,
        category: 'lighting',
        stock: 15,
      };
      const response = await authedSeller1.patch(`products/${preProduct.id}`, {
        data: updates,
      });
      expect(response.status()).toBe(200);
      const product: Product = await response.json()
        .then(resData => resData.product);
      expect(product.id).toBe(preProduct.id);
      expect(product.name).toBe(updates.name);
      expect(product.description).toBe(updates.description);
      expect(product.priceCents).toBe(updates.priceCents);
      expect(product.category).toBe(updates.category);
      expect(product.stock).toBe(updates.stock);
      expect(product.effectiveCents).toBe(updates.priceCents);
    });

    test('seller cannot update another seller\'s product', async ({ createProduct, authedSeller1, authedSeller2 }) => {
      const preProduct = await createProduct({
        name: 'Update Test Product',
        description: 'Initial description',
        priceCents: 5000,
        category: 'furniture',
        stock: 10,
        seller: authedSeller1
      });
      const response = await authedSeller2.patch(`products/${preProduct.id}`, {
        data: { name: 'Attempted Hijack' },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('NOT_OWNER');
      expect(body.error.message).toContain('You can only modify products you own.');
    });

    test('seller cannot update non-existent product', async ({ authedSeller1 }) => {
      const response = await authedSeller1.patch('products/99999', {
        data: { name: 'Does not exist' },
      });
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('buyer cannot update any product', async ({ createProduct, authedSeller1, authedBuyer }) => {
      const preProduct = await createProduct({
        name: 'Update Test Product',
        description: 'Initial description',
        priceCents: 5000,
        category: 'furniture',
        stock: 10,
        seller: authedSeller1
      });
      const response = await authedBuyer.patch(`products/${preProduct.id}`, {
        data: { name: 'Buyer Update Attempt' },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  test.describe('POST /api/v1/products/:id/images', () => {
    test('seller can add image to their product', async ({ createProduct, authedSeller1 }) => {
      const productId = await createProduct({
        name: 'Image Test Product',
        description: 'Product with images',
        priceCents: 3000,
        category: 'lighting',
        stock: 5,
      }).then(prod => prod.id);
      const imageUrl = 'https://example.com/product-image.jpg';
      const response = await authedSeller1.post(`products/${productId}/images`, {
        data: { url: imageUrl },
      });
      expect(response.status()).toBe(201);
      const product: Product = await response.json()
        .then(resData => resData.product);
      expect(product.id).toBe(productId);
      expect(product.images).toContain(imageUrl);
    });

    test('seller cannot add image to another seller\'s product', async ({ createProduct, authedSeller2 }) => {
      const productId = await createProduct({
        name: 'Image Test Product',
        description: 'Product with images',
        priceCents: 3000,
        category: 'lighting',
        stock: 5,
      }).then(prod => prod.id);
      const response = await authedSeller2.post(`products/${productId}/images`, {
        data: { url: 'https://example.com/evil-image.jpg' },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('NOT_OWNER');
    });

    test('seller cannot add invalid image URL', async ({ createProduct, authedSeller1 }) => {
      const productId = await createProduct({
        name: 'Image Test Product',
        description: 'Product with images',
        priceCents: 3000,
        category: 'lighting',
        stock: 5,
      }).then(prod => prod.id);
      const invalidUrls = [
        { url: '' },
        // { url: 'not-a-url' }, bug, need to fix
        // { url: 'ftp://invalid.com/image.jpg' }, bug, need to fix
      ];
      for (const data of invalidUrls) {
        const response = await authedSeller1.post(`products/${productId}/images`, {
          data,
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error.code).toBe('INVALID_IMAGE');
      }
    });
  });

  test.describe('PUT /api/v1/products/:id/discount', () => {
    let productId: number;
    test.beforeEach(async ({ authedSeller1 }) => {
      const response = await authedSeller1.post('products', {
        data: {
          name: 'Discount Test Product',
          description: 'Product for discount testing',
          priceCents: 10000,
          category: 'furniture',
          stock: 20,
        },
      });
      const body = await response.json();
      productId = body.product.id;
    });

    test('seller can add percentage discount to their product', async ({ createProduct, authedSeller1 }) => {
      const productId = await createProduct({
        name: 'Discount Test Product',
        description: 'Product for discount testing',
        priceCents: 10000,
        category: 'furniture',
        stock: 20,
      }).then(prod => prod.id);
      const discountData = {
        type: 'percentage',
        value: 20,
      };
      const response = await authedSeller1.put(`products/${productId}/discount`, {
        data: discountData,
      });
      expect(response.status()).toBe(200);
      const product: Product = await response.json()
        .then(resData => resData.product);
      expect(product.onSale).toBe(true);
      expect(product.effectiveCents).toBe(8000); // 20% off 10000
      expect(product.discount).toBeDefined();
      expect(product.discount?.type).toBe('percentage');
      expect(product.discount?.value).toBe(20);
    });

    test('seller can add fixed amount discount', async ({ authedSeller1 }) => {
      const discountData = {
        type: 'fixed',
        value: 1500,
      };
      const response = await authedSeller1.put(`products/${productId}/discount`, {
        data: discountData,
      });
      expect(response.status()).toBe(200);
      const product: Product = await response.json()
        .then(resData => resData.product);
      expect(product.onSale).toBe(true);
      expect(product.effectiveCents).toBe(8500); // 10000 - 1500
      expect(product.discount?.type).toBe('fixed');
      expect(product.discount?.value).toBe(1500);
    });

    test.fixme('seller cannot add discount exceeding product price', async ({ authedSeller1 }) => {
      const discountData = {
        type: 'fixed',
        value: 15000,
      };
      const response = await authedSeller1.put(`products/${productId}/discount`, {
        data: discountData,
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    test('seller cannot add discount with invalid percentage', async ({ authedSeller1 }) => {
      const invalidDiscounts = [
        // { type: 'percentage', value: 0 }, bug, need to fix
        { type: 'percentage', value: 101 },
        { type: 'percentage', value: -10 },
        { type: 'percentage', value: 150 },
      ];
      for (const discount of invalidDiscounts) {
        const response = await authedSeller1.put(`products/${productId}/discount`, {
          data: discount,
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error.code).toBe('INVALID_DISCOUNT_VALUE');
      }
    });

    test('seller cannot add discount to another seller\'s product', async ({ authedSeller2 }) => {
      const response = await authedSeller2.put(`products/${productId}/discount`, {
        data: { type: 'percentage', value: 10 },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('NOT_OWNER');
    });
  });

  test.describe('DELETE /api/v1/products/:id/discount', () => {
    let productId: number;
    test.beforeEach(async ({ createProduct, authedSeller1 }) => {
      productId = await createProduct({
        name: 'Remove Discount Test',
        description: 'Test discount removal',
        priceCents: 5000,
        category: 'lighting',
        stock: 10,
      }).then(prod => prod.id);
      await authedSeller1.put(`products/${productId}/discount`, {
        data: { type: 'percentage', value: 25 },
      });
    });

    test('seller can remove discount from their product', async ({ authedSeller1 }) => {
      const response = await authedSeller1.delete(`products/${productId}/discount`);
      expect(response.status()).toBe(200);
      const product = await response.json()
        .then(resData => resData.product);
      expect(product.onSale).toBe(false);
      expect(product.effectiveCents).toBe(5000);
      expect(product.discount).toBeNull();
    });

    test('seller cannot remove discount from another seller\'s product', async ({ authedSeller2 }) => {
      const response = await authedSeller2.delete(`products/${productId}/discount`);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('NOT_OWNER');
    });

    test('buyer cannot remove discount', async ({ authedBuyer }) => {
      const response = await authedBuyer.delete(`products/${productId}/discount`);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  test.describe('POST /api/v1/products/:id/certificate', () => {
    let productId: number;
    test.beforeEach(async ({ createProduct }) => {
      productId = await createProduct({
        name: 'Certificate Test Product',
        description: 'Product for certificate testing',
        priceCents: 5000,
        category: 'art',
        stock: 1,
      }).then(prod => prod.id);
    });

    test('seller can issue certificate for their product', async ({ authedSeller1 }) => {
      const response = await authedSeller1.post(`products/${productId}/certificate`);
      expect(response.status()).toBe(201);
      const certificateResponse = await authedSeller1.get(`products/${productId}/certificate`);
      const certificate: Certificate = await certificateResponse.json()
        .then(resData => resData.certificate);
      expect(certificate.productId).toBe(productId);
      expect(certificate.issuedAt).toEqual('2024-01-01');
      expect(certificate.issuer).toBe('Maison Atelier');
      expect(certificate.serialNo).toBe(`MAISON-AC-00${productId}`);
    });

    test('seller cannot issue certificate for another seller\'s product', async ({ authedSeller2 }) => {
      const response = await authedSeller2.post(`products/${productId}/certificate`);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('FORBIDDEN_NOT_OWNER');
    });

    test.fixme('seller cannot issue duplicate certificate for same product', async ({ authedSeller1 }) => {
      // First certificate
      await authedSeller1.post(`products/${productId}/certificate`);
      // Second certificate (should fail)
      const response = await authedSeller1.post(`products/${productId}/certificate`);
      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toContain('already has a certificate');
    });

    test('buyer cannot issue certificate', async ({ authedBuyer }) => {
      const response = await authedBuyer.post(`products/${productId}/certificate`);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  test.describe('IDOR and Security Tests', () => {
    let productIds: number[] = [];
    test.beforeEach(async ({ createProduct, authedSeller1, authedSeller2 }) => {
      // Create products with different sellers
      const productIdSeller1 = await createProduct({
        name: 'Seller 1 Product',
        description: 'IDOR test product',
        priceCents: 1000,
        category: 'test',
        stock: 5,
        seller: authedSeller1
      }).then(prod => prod.id);
      const productIdSeller2 = await createProduct({
        name: 'Seller 2 Product',
        description: 'IDOR test product',
        priceCents: 1000,
        category: 'test',
        stock: 5,
        seller: authedSeller2
      }).then(prod => prod.id);
      productIds = [productIdSeller1, productIdSeller2];
    });

    test('seller cannot access/modify other seller\'s products (IDOR protection)', async ({
      authedSeller1,
      authedSeller2,
    }) => {
      // Try to update seller2's product as seller1
      const response1 = await authedSeller1.patch(`products/${productIds[1]}`, {
        data: { name: 'Attempted update by seller1' },
      });
      expect(response1.status()).toBe(403);
      // Try to update seller1's product as seller2
      const response2 = await authedSeller2.patch(`products/${productIds[0]}`, {
        data: { name: 'Attempted update by seller2' },
      });
      expect(response2.status()).toBe(403);
      // Try to add image to seller2's product as seller1
      const response3 = await authedSeller1.post(`products/${productIds[1]}/images`, {
        data: { url: 'https://example.com/idor-image.jpg' },
      });
      expect(response3.status()).toBe(403);
      // Try to add discount to seller2's product as seller1
      const response4 = await authedSeller1.put(`products/${productIds[1]}/discount`, {
        data: { type: 'percentage', value: 10 },
      });
      expect(response4.status()).toBe(403);
      // Try to delete discount from seller2's product as seller1
      const response5 = await authedSeller1.delete(
        `products/${productIds[1]}/discount`
      );
      expect(response5.status()).toBe(403);
      // Try to issue certificate for seller2's product as seller1
      const response6 = await authedSeller1.post(`products/${productIds[1]}/certificate`);
      expect(response6.status()).toBe(403);
    });

    test('product detail endpoint does not leak sensitive information to buyers', async ({
      authedSeller1,
      authedBuyer,
    }) => {
      // Get product detail as seller (should include seller info)
      const sellerResponse = await authedSeller1.get(`products/${productIds[0]}`);
      const sellerData = await sellerResponse.json();
      expect(sellerData.product.sellerId).toBeDefined();
      expect(sellerData.product.sellerName).toBeDefined();
      expect(sellerData.product.stock).toBeDefined();
      // Get same product as buyer (should not include stock or sellerId)
      const buyerResponse = await authedBuyer.get(`products/${productIds[0]}`);
      const buyerData = await buyerResponse.json();
      // expect(buyerData.product.sellerId).toBeUndefined(); bug, need to fix
      expect(buyerData.product.sellerName).toBeDefined(); // Should still show seller name
      expect(buyerData.product.stock).toBeDefined();
    });

    test('unauthenticated users cannot access seller routes', async () => {
      const unauthenticatedContext = await request.newContext({
        baseURL: `${ENV.apiURL}/`
      });
      // Test GET
      let response = await unauthenticatedContext.get('products/seller/mine');
      expect(response.status()).toBe(401);
      let body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test POST
      response = await unauthenticatedContext.post('products');
      expect(response.status()).toBe(401);
      body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test PATCH
      response = await unauthenticatedContext.patch(`products/${productIds[0]}`);
      expect(response.status()).toBe(401);
      body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test POST image
      response = await unauthenticatedContext.post(`products/${productIds[0]}/images`);
      expect(response.status()).toBe(401);
      body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test PUT discount
      response = await unauthenticatedContext.put(`products/${productIds[0]}/discount`);
      expect(response.status()).toBe(401);
      body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test DELETE discount
      response = await unauthenticatedContext.delete(`products/${productIds[0]}/discount`);
      expect(response.status()).toBe(401);
      body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
      // Test POST certificate
      response = await unauthenticatedContext.post(`products/${productIds[0]}/certificate`);
      expect(response.status()).toBe(401);
      body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
      await unauthenticatedContext.dispose();
    });
  });

  test.describe('Pagination and Filtering for Seller Products', () => {
    test.fixme('seller can paginate their listings', async ({ authedSeller1 }) => {
      for (let i = 0; i < 10; i++) {
        await authedSeller1.post('products', {
          data: {
            name: `Pagination Test Product ${i}`,
            description: 'Product for pagination testing',
            priceCents: 1000 + i * 100,
            category: 'lighting',
            stock: 10,
          },
        });
      }
      // Test first page
      const response1 = await authedSeller1.get(
        'products/seller/mine?limit=3&offset=0'
      );
      const body1 = await response1.json();
      expect(body1.products.length).toBeLessThanOrEqual(3);
      expect(body1.pagination).toBeDefined();
      expect(body1.pagination.limit).toBe(3);
      expect(body1.pagination.offset).toBe(0);
      // Test second page
      const response2 = await authedSeller1.get(
        'products/seller/mine?limit=3&offset=3'
      );
      const body2 = await response2.json();
      expect(body2.products.length).toBeLessThanOrEqual(3);
      expect(body2.pagination.offset).toBe(3);
      if (body1.products.length > 0 && body2.products.length > 0) {
        expect(body1.products[0].id).not.toBe(body2.products[0].id);
      }
    });

    test.fixme('seller can filter their listings by category', async ({ authedSeller1 }) => {
      const categories = ['furniture', 'lighting', 'art'];
      for (const category of categories) {
        await authedSeller1.post('products', {
          data: {
            name: `Category Test ${category}`,
            description: `Product in ${category}`,
            priceCents: 1000,
            category,
            stock: 5,
          },
        });
      }
      const response = await authedSeller1.get(
        'products/seller/mine?category=furniture'
      );
      const body = await response.json();
      body.products.forEach((product: Product) => {
        expect(product.category).toBe('furniture');
      });
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('seller cannot create product with missing required fields', async ({ authedSeller1 }) => {
      const invalidData: Record<string, Partial<Product>> = {
        'INVALID_NAME': { description: 'No name', priceCents: 1000, category: 'test', stock: 1 },
        'INVALID_PRICE': { name: 'No price', category: 'test', stock: 1 },
        // 'INVALID_CATEGORY': { name: 'No category', priceCents: 1000, stock: 1 }, Bug, need to fix
        // 'INVALID_STOCK': { name: 'No stock', priceCents: 1000, category: 'test' }, Bug, need to fix
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
});
