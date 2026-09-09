import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';


test.describe('Login Page UI -- User Experience', () => {
  const buyer = getTestUser('buyer');

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should allow login with Enter key', async ({ loginPage }) => {
    await loginPage.fillLoginForm(buyer.email, buyer.password);
    await loginPage.passwordInput.press('Enter');
    await loginPage.waitForLoginSuccess();
    await expect(loginPage.currentUser).toBeVisible();
  });

  test('should not clear error on new input', async ({ loginPage }) => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await expect(loginPage.alertContainer).toBeVisible();
    await loginPage.emailInput.fill(buyer.email);
    await expect(loginPage.alertContainer).toBeVisible();
  });
});
