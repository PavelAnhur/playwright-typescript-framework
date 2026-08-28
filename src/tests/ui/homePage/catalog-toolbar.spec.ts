import { expect, test } from '@fixtures';


test.beforeEach(async ({ homePage }) => {
  await homePage.open();
});

test.describe('Catalogue Toolbar', () => {
  test('search input is visible', async ({ homePage }) => {
    await expect(homePage.searchInput).toBeVisible();
  });

  test('category filter options are correct', async ({ homePage }) => {
    await expect(homePage.categorySelect).toBeVisible();
    const options = await homePage.categorySelect.locator('option')
      .allTextContents();
    const expectedOpts = [
      'All categories',
      'Accessories',
      'Apparel',
      'Bags',
      'Footwear',
      'Fragrance',
      'Jewellery',
      'Watches',
    ];
    expect(options).toEqual(expectedOpts);
  });

  test('sort options are correct', async ({ homePage }) => {
    await expect(homePage.sortSelect).toBeVisible();
    const options = await homePage.getSortOptions();
    const expectedOpts = [
      'Newest',
      'Price: Low to High',
      'Price: High to Low',
      'Name',
    ];
    expect(options).toEqual(expectedOpts);
  });

  test('search submit button works', async ({ homePage }) => {
    await homePage.searchFor('watch');
    await expect(homePage.catalogue).toBeVisible();
  });

  test('filter by category works', async ({ homePage }) => {
    await homePage.filterByCategory('Watches');
    const productNames = await homePage.getProductNames();
    for (const name of productNames) {
      expect(name).toMatch(/Watch$/);
    }
  });
});
