import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';
import { addAllureAttachment, addAllureEnvironment, addAllureMetadata } from '@utils/allure-helper';
import { ContentType, Severity } from "allure-js-commons";


test.describe('Login Page UI -- Functionality', () => {
  const buyer = getTestUser('buyer');

  test.beforeEach(async ({ loginPage }, testInfo) => {
    await loginPage.open();
    addAllureEnvironment(testInfo);
  });

  test('should successfully login with buyer credentials', async ({ loginPage }) => {
    addAllureMetadata({ severity: Severity.CRITICAL });
    await loginPage.login(buyer.email, buyer.password);
    await loginPage.waitForLoginSuccess();
    await expect(loginPage.currentUser).toBeVisible();
    await expect(loginPage.currentUser).toContainText('Aurelie Dupont');
    await expect(loginPage.logoutLink).toBeVisible();
    await expect(loginPage.navCart).toBeVisible();
  });

  test('should successfully login with seller credentials', async ({ loginPage }) => {
    addAllureMetadata({ severity: Severity.CRITICAL });
    const seller = getTestUser('seller1');
    await loginPage.login(seller.email, seller.password);
    await loginPage.waitForLoginSuccess();
    await expect(loginPage.currentUser).toBeVisible();
    await expect(loginPage.currentUser).toContainText('Atelier Maison');
    await expect(loginPage.sellerListing).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await expect(loginPage.alertContainer).toBeVisible();
    await expect(loginPage.alertContainer).toContainText('Email or password is incorrect.');
    const currentPath = await loginPage.getCurrentPath();
    addAllureAttachment('Current path', currentPath, ContentType.TEXT);
    expect(currentPath).toContain('login');
  });

  test('should show error for non-existent email', async ({ loginPage }) => {
    await loginPage.login('nonexistent@maison.test', buyer.password);
    await expect(loginPage.alertContainer).toBeVisible();
    await expect(loginPage.alertContainer).toContainText('Email or password is incorrect.');
  });

  test('should show error for incorrect password', async ({ loginPage }) => {
    await loginPage.login(buyer.email, 'wrongpassword');
    await expect(loginPage.alertContainer).toBeVisible();
    await expect(loginPage.alertContainer).toContainText('Email or password is incorrect.');
  });

  test('should handle empty email submission', async ({ loginPage }) => {
    await loginPage.login('', buyer.password);
    const emailElement = loginPage.emailInput;
    const isValid = await emailElement.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should handle empty password submission', async ({ loginPage }) => {
    await loginPage.login(buyer.email, '');
    const passwordElement = loginPage.passwordInput;
    const isValid = await passwordElement.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });
});
