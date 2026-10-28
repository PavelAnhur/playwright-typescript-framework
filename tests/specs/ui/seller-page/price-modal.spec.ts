import { expect, test } from '@fixtures';

test.describe('Seller price modal', () => {
  test('saves a new price for a listing', async ({ sellerHomePage, authedSeller1 }) => {
    const productId = await sellerHomePage.firstProductId();
    const before = await authedSeller1.get(`products/${productId}`);
    const originalPriceCents: number = (await before.json()).product.priceCents;
    try {
      await sellerHomePage.openPriceModal(productId);
      await expect(sellerHomePage.priceModal.root).toBeVisible();
      const newPrice = '999';
      await sellerHomePage.setPrice(newPrice);
      await sellerHomePage.priceModal.save();
      await expect(sellerHomePage.priceModal.root).toBeHidden();
      await expect(sellerHomePage.listingPrice(productId)).toContainText(newPrice);
      await sellerHomePage.openPriceModal(productId);
      await expect(sellerHomePage.priceInput).toHaveValue(/^999(\.00)?$/);
    } finally {
      const restored = await authedSeller1.patch(`products/${productId}`, {
        data: { priceCents: originalPriceCents },
      });
      expect(restored.status()).toBe(200);
    }
  });
});
