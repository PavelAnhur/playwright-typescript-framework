import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';


test.describe('Seller API -- Product Discount Management', () => {
  test.describe('PUT /api/v1/products/:id/discount', () => {
    test('seller can add percentage discount to their product', async ({ createProduct, authedSeller1 }) => {
      const productId = await createProduct({
        name: 'Discount Test Product',
        description: 'Product for discount testing',
        priceCents: 10000,
        category: 'furniture',
        stock: 20,
      }).then(product => product.id);
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

    test('seller can add fixed amount discount', async ({ createProduct, authedSeller1 }) => {
      const productId = await createProduct({
        name: 'Discount Test Product',
        description: 'Product for discount testing',
        priceCents: 10000,
        category: 'furniture',
        stock: 20,
      }).then(prod => prod.id);
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

    test.fixme('seller cannot add discount exceeding product price', async ({ createProduct, authedSeller1 }) => {
      const productId = await createProduct({
        name: 'Discount Test Product',
        description: 'Product for discount testing',
        priceCents: 10000,
        category: 'furniture',
        stock: 20,
      }).then(prod => prod.id);
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

    test('seller cannot add discount with invalid percentage', async ({ createProduct, authedSeller1 }) => {
      const productId = await createProduct({
        name: 'Discount Test Product',
        description: 'Product for discount testing',
        priceCents: 10000,
        category: 'furniture',
        stock: 20,
      }).then(prod => prod.id);
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

    test('seller cannot add discount to another seller\'s product', async ({ createProduct, authedSeller2 }) => {
      const productId = await createProduct({
        name: 'Discount Test Product',
        description: 'Product for discount testing',
        priceCents: 10000,
        category: 'furniture',
        stock: 20,
      }).then(prod => prod.id);
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
});
