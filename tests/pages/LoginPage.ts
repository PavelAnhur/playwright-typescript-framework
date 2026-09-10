import { getTestUser } from '@config/env';
import { type Locator, type Page, expect } from '@playwright/test';
import { Step } from '@utils/step-decorator';
import { BasePage } from './BasePage';


export class LoginPage extends BasePage {
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alertContainer: Locator;
  readonly gotoRegisterLink: Locator;
  readonly demoHint: Locator;
  readonly loginHeading: Locator;
  readonly loginPageHead: Locator;

  constructor(page: Page) {
    super(page);
    this.loginForm = page.getByTestId('login-form');
    this.emailInput = page.getByTestId('login-email');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton = page.getByTestId('login-submit');
    this.alertContainer = page.locator('#login-alert');
    this.gotoRegisterLink = page.getByTestId('goto-register');
    this.demoHint = page.getByTestId('demo-hint');
    this.loginHeading = page.getByRole('heading', { name: 'Sign In' });
    this.loginPageHead = page.locator('.tiny');
  }

  // ---------- Navigation ----------

  @Step('Open login page')
  async open(): Promise<void> {
    await super.goto('/#/login');
    await this.waitForLoad();
  }

  @Step('Wait for login page to be ready')
  async waitForLoad(): Promise<void> {
    await super.waitForLoad();
    await expect(this.loginForm).toBeAttached();
  }

  // ---------- Form actions ----------

  @Step('Fill login form (email: "{0}")')
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  @Step('Submit login form')
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  @Step('Log in as "{0}"')
  async login(email: string, password: string): Promise<void> {
    await this.fillLoginForm(email, password);
    await this.submit();
  }

  @Step('Log in as demo user: {0}')
  async loginAsDemoUser(role: 'buyer' | 'seller1' | 'seller2'): Promise<void> {
    const testUser = getTestUser(role);
    const email = testUser.email;
    const password = testUser.password;
    await this.login(email, password);
  }

  @Step('Clear login form')
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  // ---------- Navigation actions ----------

  @Step('Go to registration page')
  async goToRegister(): Promise<void> {
    await this.gotoRegisterLink.click();
    // Wait for navigation to registration page
    await this.page.waitForURL(/#\/register/);
  }

  // ---------- Assertions ----------

  @Step('Assert alert contains "{0}"')
  async expectAlertMessage(text: string): Promise<void> {
    await expect(this.alertContainer).toContainText(text);
  }

  @Step('Assert email field shows validation error')
  async expectEmailValidationError(): Promise<void> {
    await expect(this.emailInput).toHaveAttribute('aria-invalid', 'true');
  }

  @Step('Assert password field shows validation error')
  async expectPasswordValidationError(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('aria-invalid', 'true');
  }

  @Step('Wait for successful login redirect')
  async waitForLoginSuccess(): Promise<void> {
    await this.page.waitForURL(/#\//);
    await this.page.waitForSelector('[data-app-ready="true"]');
    await this.currentUser.waitFor({ state: 'visible' });
  }

  @Step('Wait for login error message')
  async waitForLoginError(): Promise<void> {
    await expect(this.alertContainer).toBeVisible();
    await expect(this.alertContainer).toContainText(/invalid|incorrect|error/i);
  }

  // ---------- Data queries ----------

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

  async isAlertVisible(): Promise<boolean> {
    return await this.isElementVisible(this.alertContainer);
  }

  async getDemoHint(): Promise<string> {
    return await this.demoHint.textContent() || '';
  }

  async isFormReady(): Promise<boolean> {
    const emailValue = await this.emailInput.inputValue();
    const passwordValue = await this.passwordInput.inputValue();
    const isButtonEnabled = await this.submitButton.isEnabled();
    return emailValue.length > 0 && passwordValue.length > 0 && isButtonEnabled;
  }

  async getCurrentPath(): Promise<string> {
    const url = await this.getCurrentUrl();
    const hash = url.split('#')[1] || '';
    return hash || '/';
  }
}
