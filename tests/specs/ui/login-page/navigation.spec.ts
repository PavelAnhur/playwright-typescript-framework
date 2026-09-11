import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';


test.describe('Login Page UI -- Navigation', () => {
  const buyer = getTestUser('buyer');

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should navigate to register page', async ({ loginPage }) => {
    await loginPage.goToRegister();
    await loginPage.expectUrlToBe('#/register');
    const registerHeading = loginPage.getElement('h1', {
      hasText: /Create Account|Register/i
    });
    await expect(registerHeading).toBeVisible();
  });

  test('should navigate to shop page from login page', async ({ loginPage }) => {
    await loginPage.goToShop();
    await loginPage.expectUrlToBe('#/');
    await expect(loginPage.getElement('[data-testId="catalogue"]')).toBeVisible();
  });

  test('should preserve login form data when navigating back', async ({ loginPage }) => {
    test.skip(true, 'Known Bug: preserve login form data when navigating back');
    await loginPage.fillLoginForm(buyer.email, buyer.password);
    await loginPage.goToShop();
    await loginPage.expectUrlToBe('#/');
    await loginPage.goToLogin();
    await loginPage.expectUrlToBe('#/login');
    const emailValue = await loginPage.emailInput.inputValue();
    const passwordValue = await loginPage.passwordInput.inputValue();
    expect(emailValue).toBe(buyer.email);
    expect(passwordValue).toBe(buyer.password);
  });
});
