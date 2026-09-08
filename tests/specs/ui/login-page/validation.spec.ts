import { expect, test } from '@fixtures';


test.describe('Login Page Form Validation', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('should show validation error for invalid email format', async ({ loginPage }) => {
    await loginPage.fillLoginForm('invalid-email', 'password123');
    await loginPage.submit();
    await expect(loginPage.emailInput).toHaveAttribute('type', 'email');
    const emailElement = loginPage.emailInput;
    const isValid = await emailElement.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should show validation error for empty email', async ({ loginPage }) => {
    await loginPage.fillLoginForm('', 'password123');
    await loginPage.submit();
    const emailElement = loginPage.emailInput;
    const isValid = await emailElement.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
    await expect(loginPage.emailInput).toHaveAttribute('required');
  });

  test('should show validation error for empty password', async ({ loginPage }) => {
    await loginPage.fillLoginForm('test@example.com', '');
    await loginPage.submit();
    const passwordElement = loginPage.passwordInput;
    const isValid = await passwordElement.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
    await expect(loginPage.passwordInput).toHaveAttribute('required');
  });

  test('should clear validation errors when filling fields', async ({ loginPage }) => {
    await loginPage.submit();
    await loginPage.fillLoginForm('test@example.com', 'password123');
    const emailElement = loginPage.emailInput;
    const isValid = await emailElement.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(true);
    const passwordElement = loginPage.passwordInput;
    const isValidPass = await passwordElement.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValidPass).toBe(true);
  });
});
