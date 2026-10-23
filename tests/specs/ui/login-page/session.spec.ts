import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';

test.describe('Login Page UI -- Session Management', () => {
  const buyer = getTestUser('buyer');

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should maintain session after page refresh', async ({ loginPage }) => {
    await loginPage.login(buyer.email, buyer.password);
    await loginPage.waitForLoginSuccess();
    await loginPage.reload();
    await loginPage.getElement('[data-app-ready="true"]').waitFor({ state: 'attached' });
    await expect(loginPage.currentUser).toContainText('Aurelie Dupont');
  });

  test('should logout successfully', async ({ loginPage }) => {
    await loginPage.login(buyer.email, buyer.password);
    await loginPage.waitForLoginSuccess();
    if (await loginPage.navToggle.isVisible()) {
      await loginPage.navToggle.click();
    }
    await loginPage.logoutLink.click();
    await loginPage.expectUrlToBe('#/');
    await expect(loginPage.getElement('#flash')).toBeVisible();
  });
});
