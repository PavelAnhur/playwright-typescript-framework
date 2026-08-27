import { expect, test } from '@fixtures';


test.beforeEach(async ({ homePage }) => {
  await homePage.goto();
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
    const options = await homePage.sortOptions.allTextContents();
    const expectedOpts = [
      'Newest',
      'Price: Low to High',
      'Price: High to Low',
      'Name',
    ];
    options.forEach(opt => expect(opt in expectedOpts).toBeTruthy());
  });

  test('search submit button works', async ({ homePage }) => {
    await homePage.searchInput.fill('watch');
    await homePage.searchSubmit.click();
    await expect(homePage.catalogue).toBeVisible();
  });

  test('filter by category works', async ({ homePage }) => {
    await homePage.categorySelect.selectOption('Watches');
    await homePage.productCards.first().waitFor({ state: 'attached' });
    const productNames = await homePage.getProductNames();
    for (const name of productNames) {
      expect(name).toMatch(/Watch$/);
    }
  });
});
