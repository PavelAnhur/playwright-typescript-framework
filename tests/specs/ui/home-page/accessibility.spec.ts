import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../../fixtures';


test.describe('Accessibility', () => {
  test('home page has no serious violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude('.pagination')
      .analyze();
    const serious = results.violations.filter(v =>
      v.impact === 'serious' || v.impact === 'critical'
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
