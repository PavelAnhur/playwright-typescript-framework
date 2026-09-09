import { expect, test } from '@fixtures';


test.describe('Register Page UI', () => {
  test.beforeEach(async ({ registerPage }) => {
    registerPage.open();
  })

  test('should display all registration elements', async ({ registerPage }) => {
    await expect(registerPage.registerForm).toBeVisible();
    await expect(registerPage.firstNameInput).toBeVisible();
    await expect(registerPage.lastNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.dobInput).toBeVisible();
    await expect(registerPage.roleBuyer).toBeAttached();
    await expect(registerPage.roleSeller).toBeAttached();
    await expect(registerPage.submitButton).toBeVisible();
    await expect(registerPage.gotoLoginLink).toBeVisible();
    await expect(registerPage.gotoLoginLink).toHaveText('Sign in');
  });

  test('should successfully register a new buyer account', async ({ registerPage }) => {
    const firstName = 'Test';
    const lastName = 'User';
    const randomId = Date.now().toString().slice(-6);
    const email = `test.buyer${randomId}@example.com`;
    await registerPage.register({
      firstName,
      lastName,
      email,
      password: 'Password123^^',
      dob: '1990-06-10',
      role: 'buyer'
    });
    await registerPage.waitForRegistrationSuccess();
    await registerPage.expectUrlToBe('#/');
    await expect(registerPage.currentUser).toBeVisible();
    await expect(registerPage.currentUser).toContainText(`${firstName} ${lastName}`);
  });

  test('should not proceed for underage user', async ({ registerPage }) => {
    await registerPage.firstNameInput.fill('Young');
    await registerPage.lastNameInput.fill('User');
    await registerPage.emailInput.fill('young@example.com');
    await registerPage.passwordInput.fill('Password123!!!');
    await registerPage.confirmPasswordInput.fill('Password123!!!');
    const dobSelected = await registerPage.selectDateOfBirth('2010-01-01');
    expect(dobSelected).toBe(false);
  });
});
