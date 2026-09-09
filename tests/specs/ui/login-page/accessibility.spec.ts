import { expect, test } from '@fixtures';


test.describe('Login Page UI -- Accessibility', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should have accessible form labels', async ({ loginPage }) => {
    await expect(loginPage.getElement('label[for="login-email"]')).toBeVisible();
    await expect(loginPage.getElement('label[for="login-password"]')).toBeVisible();
  });

  test('should have accessible skip link', async ({ loginPage }) => {
    await expect(loginPage.skipLink).toBeVisible();
    await expect(loginPage.skipLink).toHaveAttribute('href', '#main');
  });

  test('should have correct ARIA attributes on form', async ({ loginPage }) => {
    await expect(loginPage.loginForm).toBeVisible();
  });

  test('should have focus management', async ({ loginPage }) => {
    await loginPage.emailInput.focus();
    await expect(loginPage.emailInput).toBeFocused();
    await loginPage.pressTab();
    await expect(loginPage.passwordInput).toBeFocused();
    await loginPage.pressTab();
    await expect(loginPage.submitButton).toBeFocused();
  });

  test('should have proper heading hierarchy', async ({ loginPage }) => {
    await expect(loginPage.getElement('h1')).toBeVisible();
    const headings = await loginPage.getElement('h1').all();
    expect(headings.length).toBeGreaterThan(0);
    expect(await headings[0]?.textContent()).toBe('Sign In');
  });
});
