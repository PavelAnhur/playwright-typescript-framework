import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';


test.describe('Seller API -- Pagination and Filtering for Seller Products', () => {
  test('seller can paginate their listings', async ({ authedSeller1 }) => {
    test.skip(true, 'Known Bug: listing pagination');
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

  test('seller can filter their listings by category', async ({ authedSeller1 }) => {
    test.skip(true, 'Known Bug: filter listings by category');
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
