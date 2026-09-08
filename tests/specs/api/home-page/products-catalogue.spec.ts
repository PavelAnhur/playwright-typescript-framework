import { expect, test } from '@fixtures';
import type { Product, ProductCsvRow } from '@src/types/product';


test.describe('Home Page API -- GET /api/v1/products - Catalogue', () => {
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

  test('should sort products by price ascending', async ({ api }) => {
    const response = await api.get('products?sort=price_asc');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const products = data.products;
    const prices = products.map((p: Product) => p.priceCents);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  test('should sort products by price descending', async ({ api }) => {
    const response = await api.get('products?sort=price_desc');
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

  test('should handle invalid sort parameter', async ({ api }) => {
    const response = await api.get('products?sort=invalid');
    expect(response.ok()).toBeFalsy();
    const data = await response.json();
    expect(data.error).toBe('INVALID_SORT_OPTION');
    expect(data.message).toContain('Invalid sort option:');
  });

  test('should handle invalid price filters', async ({ api }) => {
    const response = await api.get('products?minPrice=not-a-number');
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('INVALID_MIN_PRICE');
  });
});
