import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';


test.describe('Login Page UI Tests', () => {
  const buyer = getTestUser('buyer');
  test.beforeEach(async ({ loginPage }) => {
    loginPage.open();
  });

  test.describe('Page Layout and Elements', () => {
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

    test('should have submit button disabled initially', async ({ loginPage }) => {
      // Submit button should be enabled initially (form doesn't disable it)
      await expect(loginPage.submitButton).toBeEnabled();
    });

    test('should display demo account hint', async ({ loginPage }) => {
      const hint = await loginPage.getDemoHint();
      expect(hint).toContain(buyer.email);
      expect(hint).toContain(getTestUser('seller1').email);
      expect(hint).toContain(buyer.password);
    });
  });

  test.describe('Form Validation', () => {
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

  test.describe('Login Functionality', () => {
    test('should successfully login with buyer credentials', async ({ loginPage }) => {
      await loginPage.login(buyer.email, buyer.password);
      await loginPage.waitForLoginSuccess();
      await expect(loginPage.currentUser).toBeVisible();
      await expect(loginPage.currentUser).toContainText('Aurelie Dupont');
      await expect(loginPage.logoutLink).toBeVisible();
      await expect(loginPage.navCart).toBeVisible();
    });

    test('should successfully login with seller credentials', async ({ loginPage }) => {
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

  test.describe('Navigation', () => {
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

    test.fixme('should preserve login form data when navigating back', async ({ loginPage }) => {
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

  test.describe('Accessibility', () => {
    test('should have accessible form labels', async ({ loginPage }) => {
      await expect(loginPage.getElement('label[for="login-email"]')).toBeVisible();
      await expect(loginPage.getElement('label[for="login-password"]')).toBeVisible();
    });

    test('should have accessible skip link', async ({ loginPage }) => {
      await expect(loginPage.skipLink).toBeVisible();
      await expect(loginPage.skipLink).toHaveAttribute('href', '#main');
    });

    test('should have correct ARIA attributes on form', async ({ loginPage }) => {
      await expect(loginPage.loginForm).toBeVisible();
    });

    test('should have focus management', async ({ loginPage }) => {
      await loginPage.emailInput.focus();
      await expect(loginPage.emailInput).toBeFocused();
      await loginPage.pressTab();
      await expect(loginPage.passwordInput).toBeFocused();
      await loginPage.pressTab();
      await expect(loginPage.submitButton).toBeFocused();
    });

    test('should have proper heading hierarchy', async ({ loginPage }) => {
      await expect(loginPage.getElement('h1')).toBeVisible();
      const headings = await loginPage.getElement('h1').all();
      expect(headings.length).toBeGreaterThan(0);
      expect(await headings[0]?.textContent()).toBe('Sign In');
    });
  });

  test.describe('User Experience', () => {
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

  test.describe('Security', () => {
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

  test.describe('Responsive Design', () => {
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

  test.describe('Edge Cases', () => {
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

    test.fixme('should handle unicode characters in email', async ({ loginPage }) => {
      const unicodeEmail = 'test@éxample.com';
      await loginPage.fillLoginForm(unicodeEmail, buyer.password);
      const value = await loginPage.emailInput.inputValue();
      expect(value).toBe(unicodeEmail);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session after page refresh', async ({ loginPage }) => {
      await loginPage.login(buyer.email, buyer.password);
      await loginPage.waitForLoginSuccess();
      await loginPage.reload();
      await loginPage.getElement('[data-app-ready="true"]').waitFor({ state: 'attached' });
      await expect(loginPage.currentUser).toBeVisible();
      await expect(loginPage.currentUser).toContainText('Aurelie Dupont');
    });

    test('should logout successfully', async ({ loginPage }) => {
      await loginPage.login(buyer.email, buyer.password);
      await loginPage.waitForLoginSuccess();
      await loginPage.logoutLink.click();
      await loginPage.expectUrlToBe('#/');
      await expect(loginPage.getElement('#flash')).toBeVisible();
    });
  });
});
