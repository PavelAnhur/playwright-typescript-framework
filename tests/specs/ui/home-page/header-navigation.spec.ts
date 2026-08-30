import { test, expect } from '../../../fixtures';


test.beforeEach(async ({ homePage }) => {
  await homePage.open();
});

test.describe('Header and Navigation', () => {
  test('brand logo is visible and links to home', async ({ homePage }) => {
    await expect(homePage.brandContainer).toContainText('MAISON');
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
    await expect(homePage.loginLink).toBeVisible();
    await homePage.goToLogin();
  });

  test('shop link is visible and clickable', async ({ homePage }) => {
    await expect(homePage.shopLink).toBeVisible();
    // Shop link might be on the same page (hash routing)
    await homePage.shopLink.click();
    // Verify we're still on home page (since it's #/)
    await homePage.expectAtHomePage();
  });
});
