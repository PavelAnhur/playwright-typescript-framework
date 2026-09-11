import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';


test.describe('Login Page UI -- Edge Cases', () => {
  const buyer = getTestUser('buyer');

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should handle very long email input', async ({ loginPage }) => {
    const longEmail = 'a'.repeat(100) + '@example.com';
    await loginPage.fillLoginForm(longEmail, buyer.password);
    const value = await loginPage.emailInput.inputValue();
    expect(value).toBe(longEmail);
  });

  test('should handle special characters in password', async ({ loginPage }) => {
    const specialPassword = '!@#$%^&*()_+{}|:<>?~';
    await loginPage.fillLoginForm('test@example.com', specialPassword);
    const value = await loginPage.passwordInput.inputValue();
    expect(value).toBe(specialPassword);
  });

  test('should handle XSS attempts in input fields', async ({ loginPage }) => {
    const xssAttempt = '<script>alert("xss")</script>';
    await loginPage.fillLoginForm(xssAttempt, xssAttempt);
    const emailValue = await loginPage.emailInput.inputValue();
    const passwordValue = await loginPage.passwordInput.inputValue();
    // This tests that the form accepts the values without breaking
    expect(emailValue).toBe(xssAttempt);
    expect(passwordValue).toBe(xssAttempt);
  });

  test('should handle unicode characters in email', async ({ loginPage }) => {
    test.skip(true, 'Known Bug: unicode characters in email');
    const unicodeEmail = 'test@éxample.com';
    await loginPage.fillLoginForm(unicodeEmail, buyer.password);
    const value = await loginPage.emailInput.inputValue();
    expect(value).toBe(unicodeEmail);
  });
});
