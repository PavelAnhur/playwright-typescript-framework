import { expect, test } from '@fixtures';


test.describe('Login Page UI -- Responsive Design', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should display properly on mobile viewport', async ({ loginPage }) => {
    await loginPage.setMobileViewport();
    await loginPage.open();
    await expect(loginPage.loginForm).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    const buttonWidth = await loginPage.submitButton.evaluate(
      (el: HTMLElement) => el.getBoundingClientRect().width
    );
    expect(buttonWidth).toBeGreaterThan(200);
  });

  test('should display properly on tablet viewport', async ({ loginPage }) => {
    await loginPage.setMobileViewport(768, 1024);
    await loginPage.open();
    await expect(loginPage.loginForm).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should display properly on desktop viewport', async ({ loginPage }) => {
    await loginPage.setMobileViewport(1440, 900);
    await loginPage.open();
    await expect(loginPage.loginForm).toBeVisible();
    const formWidth = await loginPage.loginForm.evaluate(
      (el: HTMLElement) => el.getBoundingClientRect().width
    );
    expect(formWidth).toBeLessThan(800);
  });
});
