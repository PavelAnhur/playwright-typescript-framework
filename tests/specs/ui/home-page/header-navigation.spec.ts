import { expect, test } from '@fixtures';

test.describe('Home Page UI -- Header and Navigation', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test('brand logo is visible and links to home', async ({ homePage }) => {
    await expect(homePage.brand).toContainText('MAISON');
    await homePage.clickBrand();
  });

  test('skip link works correctly', async ({ homePage }) => {
    await expect(homePage.skipLink).toBeVisible();
    await homePage.focusSkipLink();
    await expect(homePage.skipLink).toBeFocused();
  });

  test('nav toggle works on mobile', async ({ homePage }) => {
    await homePage.setMobileViewport();
    await homePage.open(); // Re-navigate after viewport change
    await expect(homePage.navToggle).toBeVisible();
    await homePage.navToggle.click();
    await homePage.expectMobileMenuVisible();
    await homePage.expectNavToggleAriaExpanded('true');
  });

  test('nav toggle closes mobile menu on second click', async ({ homePage }) => {
    await homePage.setMobileViewport();
    await homePage.open();
    await homePage.openMobileMenu();
    await homePage.closeMobileMenu();
  });

  test('login link navigates to login page', async ({ homePage }) => {
    await expect(homePage.navLogin).toBeVisible();
    await homePage.openLoginPage();
  });

  test('shop link is visible and clickable', async ({ homePage }) => {
    await expect(homePage.navShop).toBeVisible();
    await homePage.navShop.click();
    await homePage.expectAtHomePage();
  });
});
