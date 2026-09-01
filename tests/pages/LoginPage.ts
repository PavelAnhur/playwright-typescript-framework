import { getTestUser } from '@config/env';
import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Login form elements
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alertContainer: Locator;
  readonly gotoRegisterLink: Locator;
  readonly demoHint: Locator;

  constructor(page: Page) {
    super(page);
    // Login form
    this.loginForm = page.getByTestId('login-form');
    this.emailInput = page.getByTestId('login-email');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton = page.getByTestId('login-submit');
    this.alertContainer = page.locator('#login-alert');
    this.gotoRegisterLink = page.getByTestId('goto-register');
    this.demoHint = page.getByTestId('demo-hint');
  }

  /**
   * Navigate to the login page
   */
  async open(): Promise<void> {
    await super.goto('/#/login');
  }

  /**
   * Wait for the login page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await super.waitForLoad();
    await expect(this.loginForm).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Fill the login form with email and password
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Complete the login flow
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillLoginForm(email, password);
    await this.submit();
  }

  /**
   * Get the alert message text
   */
  async getAlertMessage(): Promise<string> {
    try {
      if (await this.isElementVisible(this.alertContainer)) {
        return await this.alertContainer.textContent() || '';
      }
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Check if alert message is visible
   */
  async isAlertVisible(): Promise<boolean> {
    return await this.isElementVisible(this.alertContainer);
  }

  /**
   * Check if alert contains specific text
   */
  async expectAlertMessage(text: string): Promise<void> {
    await expect(this.alertContainer).toContainText(text);
  }

  /**
   * Navigate to registration page
   */
  async goToRegister(): Promise<void> {
    await this.gotoRegisterLink.click();
    // Wait for navigation to registration page
    await this.page.waitForURL(/#\/register/);
  }

  /**
   * Get demo hint text
   */
  async getDemoHint(): Promise<string> {
    return await this.demoHint.textContent() || '';
  }

  /**
   * Login using demo account
   * @param role - 'buyer' or 'seller'
   */
  async loginAsDemoUser(role: 'buyer' | 'seller1' | 'seller2'): Promise<void> {
    const testUser = getTestUser(role);
    const email = testUser.email;
    const password = testUser.password;
    await this.login(email, password);
  }

  /**
   * Check if email field has validation error
   */
  async expectEmailValidationError(): Promise<void> {
    await expect(this.emailInput).toHaveAttribute('aria-invalid', 'true');
  }

  /**
   * Check if password field has validation error
   */
  async expectPasswordValidationError(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('aria-invalid', 'true');
  }

  /**
   * Wait for successful login redirect
   */
  async waitForLoginSuccess(): Promise<void> {
    await this.page.waitForURL(/#\//);
    await this.page.waitForSelector('[data-app-ready="true"]');
    await this.page.waitForSelector('[data-testid="current-user"]');
  }

  /**
   * Wait for login error message
   */
  async waitForLoginError(): Promise<void> {
    await expect(this.alertContainer).toBeVisible();
    await expect(this.alertContainer).toContainText(/invalid|incorrect|error/i);
  }

  /**
   * Clear the login form
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Check if form is ready for submission
   */
  async isFormReady(): Promise<boolean> {
    const emailValue = await this.emailInput.inputValue();
    const passwordValue = await this.passwordInput.inputValue();
    const isButtonEnabled = await this.submitButton.isEnabled();
    return emailValue.length > 0 && passwordValue.length > 0 && isButtonEnabled;
  }

  /**
   * Get the current URL path
   */
  async getCurrentPath(): Promise<string> {
    const url = await this.getCurrentUrl();
    const hash = url.split('#')[1] || '';
    return hash || '/';
  }
}
