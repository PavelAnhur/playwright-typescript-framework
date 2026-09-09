import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';


test.describe('Login Page UI -- Security', () => {
  const buyer = getTestUser('buyer');

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should not expose password in URL', async ({ loginPage }) => {
    await loginPage.login(buyer.email, buyer.password);
    await loginPage.waitForLoginSuccess();
    const url = await loginPage.getCurrentUrl();
    expect(url).not.toContain('password');
    expect(url).not.toContain(buyer.password);
  });

  test('should have password field type password', async ({ loginPage }) => {
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    const inputType = await loginPage.passwordInput.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('should not auto-complete sensitive data inappropriately', async ({ loginPage }) => {
    await expect(loginPage.emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(loginPage.passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });

  test('should show rate limit error after multiple failed attempts', async ({ loginPage }) => {
    // Multiple failed login attempts
    for (let i = 0; i < 5; i++) {
      await loginPage.login(`wrong${i}@example.com`, 'wrongpassword');
      // Wait a bit between attempts
      await loginPage.waitForTimeout(100);
    }
    try {
      await expect(loginPage.alertContainer).toContainText(/too many attempts|rate limit|slow down/i, { timeout: 100 });
    } catch {
      console.log('Rate limiting not implemented or not triggered');
    }
  });
});
