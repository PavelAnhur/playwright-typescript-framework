import { expect, test } from '@fixtures';


test.beforeEach(async ({ homePage }) => {
  await homePage.open();
});

test.describe('Product Cards', () => {
  test('product cards are displayed', async ({ homePage }) => {
    await expect(homePage.productCards).toHaveCount(22);
  });

  test('product card contains all required elements', async ({ homePage }) => {
    const firstCard = homePage.productCards.first();
    await expect(firstCard.getByTestId('product-name')).toBeVisible();
    await expect(firstCard.locator('.card__cat')).toBeVisible();
    await expect(firstCard.getByTestId('price')).toBeVisible();
    await expect(firstCard.locator('.card__media img')).toBeVisible();
  });

  test('product card links to product detail', async ({ homePage, page }) => {
    const firstCard = homePage.productCards.first();
    const productName = await firstCard.getByTestId('product-name').textContent();
    await firstCard.locator('.card__media').click();
    await expect(page).toHaveURL(/\/product\/\d+/);
    // Verify product name on detail page
    await expect(page.locator('h1')).toContainText(productName || '');
  });

  test('sale badge appears on sale items', async ({ homePage }) => {
    await expect(homePage.saleBadges).toHaveCount(2); // Products 1 and 5
  });

  test('sold out badge appears correctly', async ({ homePage }) => {
    await expect(homePage.soldoutBadge).toHaveCount(1); // Product 6
  });

  test('price-was is present for sale items', async ({ homePage }) => {
    const firstSaleItem = homePage.productCards.nth(17); // Product 18
    await expect(firstSaleItem.getByTestId('price-was')).toBeVisible();
    // Verify sale price is lower than original
    const priceNow = await firstSaleItem.getByTestId('price').textContent();
    const priceWas = await firstSaleItem.getByTestId('price-was').textContent();
    const nowNumber = parseFloat(priceNow?.replace(/[$,]/g, '') || '0');
    const wasNumber = parseFloat(priceWas?.replace(/[$,]/g, '') || '0');
    expect(nowNumber).toBeLessThan(wasNumber);
  });
});
