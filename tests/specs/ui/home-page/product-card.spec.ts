import { expect, test } from '@fixtures';

test.describe('Home Page UI -- Product Cards', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test('product cards are displayed', async ({ homePage }) => {
    await expect(homePage.productCards).toHaveCount(22);
  });

  test('product card contains all required elements', async ({ homePage }) => {
    const card = homePage.firstCard;
    await expect(card.name()).toBeVisible();
    await expect(card.category()).toBeVisible();
    await expect(card.price()).toBeVisible();
    await expect(card.image()).toBeVisible();
  });

  test('product card links to product detail', async ({ homePage }) => {
    const card = homePage.firstCard;
    const productName = await card.name().textContent();
    await card.media().click();
    expect(await homePage.getCurrentUrl()).toMatch(/\/product\/\d+/);
    await expect(homePage.getElement('h1')).toContainText(productName || '');
  });

  test('sale badge appears on sale items', async ({ homePage }) => {
    await expect(homePage.saleBadges).toHaveCount(2); // Products 1 and 5
  });

  test('sold out badge appears correctly', async ({ homePage }) => {
    await expect(homePage.soldoutBadge).toHaveCount(1); // Product 6
  });

  test('price-was is present for sale items', async ({ homePage }) => {
    const firstSaleItem = homePage.productCards.filter({ hasText: 'Onyx Leather Derby' });
    await expect(firstSaleItem.getByTestId('price-was')).toBeVisible();
    const priceNow = await firstSaleItem.getByTestId('price').textContent();
    const priceWas = await firstSaleItem.getByTestId('price-was').textContent();
    const nowNumber = parseFloat(priceNow?.replace(/[$,]/g, '') || '0');
    const wasNumber = parseFloat(priceWas?.replace(/[$,]/g, '') || '0');
    expect(nowNumber).toBeLessThan(wasNumber);
  });
});
