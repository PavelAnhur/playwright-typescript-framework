import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';
import type { Account } from '@src/types/account';
import type { Certificate } from '@src/types/certificate';
import type { Product, ProductCsvRow } from '@src/types/product';


test.describe('Home Page API - Public Endpoints', () => {
  test.describe('GET /api/v1/health', () => {
    test('should return ok status', async ({ api }) => {
      const response = await api.get('health');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toEqual({
        service: 'maison',
        status: 'ok',
        time: expect.any(String),
      });
    });
  });

  test.describe('GET /api/v1/seed-info', () => {
    test('should return demo account information', async ({ api }) => {
      const response = await api.get('seed-info');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('accounts');
      expect(data.accounts).toHaveLength(3); // seller, seller2, buyer
      const accounts = data.accounts;
      const seller = getTestUser('seller1');
      const sellerEmail = accounts.find((a: Account) => a.email === seller.email);
      const buyer = getTestUser('buyer');
      const buyerEmail = accounts.find((a: Account) => a.email === buyer.email);
      expect(sellerEmail).toBeDefined();
      expect(sellerEmail?.role).toBe('seller');
      expect(buyerEmail).toBeDefined();
      expect(buyerEmail?.role).toBe('buyer');
      expect(data).toHaveProperty('password', buyer.password);
    });
  });

  test.describe('GET /api/v1/products - Catalogue', () => {
    test('should return all products with correct shape - parameterized', async ({ api, csvData }) => {
      const productData = csvData<ProductCsvRow>('products.csv');
      const response = await api.get('products');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('count');
      const { products, count } = data;
      expect(count).toBe(22);
      expect(products).toHaveLength(22);
      for (const expected of productData) {
        const product: Product = products.find((p: Product) => p.id === expected.id);
        if (!product) {
          throw new Error(`Product with ID ${expected.id} not found in response`);
        }
        expect(product.name).toBe(expected.name);
        expect(product.sellerName).toBe(expected.sellerName);
        expect(product.category).toBe(expected.category);
        if (expected.discount) {
          expect(product.discount).toBeDefined();
          expect(product.discount?.type).toBe(expected.discount.type);
          expect(product.discount?.value).toBe(expected.discount.value);
          expect(product.effectiveCents).toBe(expected.effectiveCents);
        } else {
          expect(product.discount).toBeNull();
        }
      }
    });

    test('should filter products by category', async ({ api }) => {
      const response = await api.get('products?category=Bags');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const products = data.products;
      expect(products.length).toBeGreaterThan(0);
      expect(products.every((p: Product) => p.category === 'Bags')).toBeTruthy();
    });

    test('should filter products by search query', async ({ api }) => {
      const response = await api.get('products?q=watch');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const products = data.products;
      expect(products.length).toBeGreaterThan(0);
      expect(products.some((p: Product) =>
        p.category?.toLowerCase().includes('watches')
      )).toBeTruthy();
    });

    test.fixme('should sort products by price ascending', async ({ api }) => {
      const response = await api.get('products?sort=price');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const products = data.products;
      const prices = products.map((p: Product) => p.priceCents);
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
    });

    test.fixme('should sort products by price descending', async ({ api }) => {
      const response = await api.get('products?sort=-price');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const products = data.products;
      const prices = products.map((p: Product) => p.priceCents);
      const sorted = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sorted);
    });

    test('should filter by minPrice', async ({ api }) => {
      const minPrice = 100000; // $1000
      const response = await api.get(`products?minPrice=${minPrice}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const products = data.products;
      expect(products.every((p: Product) => p.priceCents! >= minPrice)).toBeTruthy();
    });

    test('should filter by maxPrice', async ({ api }) => {
      const maxPrice = 50000; // $500
      const response = await api.get(`products?maxPrice=${maxPrice}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const products = data.products;
      expect(products.every((p: Product) => p.priceCents! <= maxPrice)).toBeTruthy();
    });

    test('should combine price filters', async ({ api }) => {
      const minPrice = 50000;
      const maxPrice = 150000;
      const response = await api.get(
        `products?minPrice=${minPrice}&maxPrice=${maxPrice}`
      );
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const products = data.products;
      expect(products.every((p: Product) =>
        p.priceCents! >= minPrice && p.priceCents! <= maxPrice
      )).toBeTruthy();
    });

    test.fixme('should handle invalid sort parameter', async ({ api }) => {
      const response = await api.get('products?sort=invalid');
      expect(response.ok()).toBeFalsy();
      const data = await response.json();
      expect(data.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('sort'),
      });
    });

    test.fixme('should handle invalid price filters', async ({ api }) => {
      const response = await api.get('products?minPrice=not-a-number');
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  test.describe('GET /api/v1/products/categories', () => {
    test('should return distinct published categories', async ({ api }) => {
      const response = await api.get('products/categories');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('categories');
      expect(Array.isArray(data.categories)).toBeTruthy();
      // Should have at least one category from seed data
      expect(data.categories.length).toBeGreaterThan(0);
      // Verify categories are properly formatted
      data.categories.forEach((category: string) => {
        expect(typeof category).toBe('string');
        expect(category.length).toBeGreaterThan(0);
      });
      // Should include known seed categories
      expect(data.categories).toContain('Bags');
      expect(data.categories).toContain('Fragrance');
    });
  });

  test.describe('GET /api/v1/products/:id', () => {
    test('should return a single product by ID', async ({ api }) => {
      const productId = 5;
      const response = await api.get(`products/${productId}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const product: Product = data.product;
      expect(product.category).toBe('Footwear');
      expect(product.discount?.type).toBe('fixed');
      expect(product.discount?.value).toEqual(20000);
    });

    test('should return 404 for non-existent product', async ({ api }) => {
      const response = await api.get('products/99999');
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error).toMatchObject({
        code: 'PRODUCT_NOT_FOUND',
        message: 'That product does not exist.',
      });
    });

    test('should handle invalid product ID format', async ({ api }) => {
      const response = await api.get('products/invalid');
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  test.describe('GET /api/v1/products/:id/certificate', () => {
    test('should return certificate for product owned by seller1', async ({ api }) => {
      const productId = 1;
      const response = await api.get(`products/${productId}/certificate`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      const cert: Certificate = data.certificate;
      expect(cert.id).toEqual(1);
      expect(cert.issuedAt).toEqual('2024-01-01');
      expect(cert.material).toEqual('Full-grain leather');
    });

    test('should return 404 for product without certificate (seller2)', async ({ api }) => {
      // Product 12+ are owned by seller2 and have no certificate per seed
      const productId = 12;
      const response = await api.get(`products/${productId}/certificate`);
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error).toMatchObject({
        code: 'CERTIFICATE_NOT_FOUND',
        message: expect.stringContaining('certificate'),
      });
    });

    test('should return 404 for non-existent product certificate', async ({ api }) => {
      const response = await api.get('products/9999999999/certificate');
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe('CERTIFICATE_NOT_FOUND');
    });
  });

  test.describe('CORS Headers', () => {
    test('should include CORS headers for allowed origin', async ({ api }) => {
      const response = await api.get('products', {
        headers: {
          Origin: 'http://localhost:4000',
        },
      });
      expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:4000');
      expect(response.headers()['access-control-allow-credentials']).toBe('true');
    });

    test.fixme('should not include CORS headers for disallowed origin', async ({ api }) => {
      const response = await api.get('products', {
        headers: {
          Origin: 'https://evil.com',
        },
      });
      expect(response.headers()['access-control-allow-origin']).toBeUndefined();
    });
  });

  test.describe('Security Headers', () => {
    test('should have proper security headers', async ({ api }) => {
      const response = await api.get('products');
      const headers = response.headers();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['permissions-policy']).toBeDefined();
      expect(headers['content-security-policy']).toBeDefined();
    });

    test('should not expose X-Powered-By header', async ({ api }) => {
      const response = await api.get('products');
      expect(response.headers()['x-powered-by']).toBeUndefined();
    });
  });

  test.describe('API Error Envelope', () => {
    test('should return consistent error envelope', async ({ api }) => {
      const response = await api.get('products/999999999');
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      // Code should be SCREAMING_SNAKE_CASE
      expect(data.error.code).toMatch(/^[A-Z_]+$/);
    });
  });
});
