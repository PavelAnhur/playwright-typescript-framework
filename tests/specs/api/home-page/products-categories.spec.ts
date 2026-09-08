import { expect, test } from '@fixtures';


test.describe('Home Page API -- GET /api/v1/products/categories', () => {
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
