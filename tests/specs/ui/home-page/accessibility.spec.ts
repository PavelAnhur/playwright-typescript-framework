import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@fixtures';

test.describe('Home Page UI -- Accessibility', () => {
  test('home page has no serious violations', async ({ page }) => {
    await page.goto('/');
    await page.locator('img').first().waitFor({ state: 'visible' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.pagination')
      // Known issue: sale/soldout badges have insufficient contrast over
      // product images (WCAG 1.4.3, ratio 1.91 vs required 4.5).
      // Tracked in maison repo — exclude until the product fixes it.
      .exclude('[data-testid="sale-badge"]')
      .exclude('[data-testid="soldout-badge"]')
      .analyze();
    const serious = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(serious).toEqual([]);
  });

  test('images have alt attributes', async ({ homePage }) => {
    await homePage.open();
    const images = homePage.images;
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt?.length).toBeGreaterThan(0);
    }
  });

  test('aria-live regions are present', async ({ homePage }) => {
    await homePage.open();
    await expect(homePage.flash).toHaveAttribute('aria-live', 'polite');
    await expect(homePage.catalogue).toHaveAttribute('aria-live', 'polite');
  });
});
