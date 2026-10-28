import { expect, test } from '@fixtures';

test.describe('Login Page UI -- Mobile Menu', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('opens the mobile menu via the base page method', async ({ loginPage }) => {
    await loginPage.setMobileViewport();
    await loginPage.open();
    await loginPage.openMobileMenu();
    await expect(loginPage.navShop).toBeVisible();
    await expect(loginPage.navLogin).toBeVisible();
    await expect(loginPage.navToggle).toHaveAttribute('aria-expanded', 'true');
  });
});
