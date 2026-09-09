import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';


test.describe('Login Page UI -- Layout and Elements', () => {
  const buyer = getTestUser('buyer');

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should display all login page elements', async ({ loginPage }) => {
    await expect(loginPage.loginForm).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toHaveText('Sign In');
    await expect(loginPage.gotoRegisterLink).toBeVisible();
    await expect(loginPage.gotoRegisterLink).toHaveText('Create an account');
    await expect(loginPage.demoHint).toBeVisible();
    await expect(loginPage.demoHint).toContainText('Demo:');
  });

  test('should have correct page title and heading', async ({ loginPage }) => {
    await expect(loginPage.loginHeading).toBeVisible();
    await expect(loginPage.loginPageHead.filter({ hasText: 'Welcome back' })).toBeVisible();
  });

  test('should have email field with type email', async ({ loginPage }) => {
    await expect(loginPage.emailInput).toHaveAttribute('type', 'email');
    await expect(loginPage.emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(loginPage.emailInput).toHaveAttribute('required');
  });

  test('should have password field with type password', async ({ loginPage }) => {
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await expect(loginPage.passwordInput).toHaveAttribute('autocomplete', 'current-password');
    await expect(loginPage.passwordInput).toHaveAttribute('required');
  });

  test('should have submit button enabled initially', async ({ loginPage }) => {
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test('should display demo account hint', async ({ loginPage }) => {
    const hint = await loginPage.getDemoHint();
    expect(hint).toContain(buyer.email);
    expect(hint).toContain(getTestUser('seller1').email);
    expect(hint).toContain(buyer.password);
  });
});
