import { TIMEOUTS } from '@config/timeouts';
import { type Locator, type Page, expect } from '@playwright/test';
import type { Account } from '@src/types/account';
import { BasePage } from './BasePage';
import { Step } from '@utils/step-decorator';


export interface RegisterData extends Account {
  firstName: string;
  lastName: string;
  dob: string; // Format: YYYY-MM-DD
  role?: 'buyer' | 'seller';
}

export class RegisterPage extends BasePage {
  readonly registerForm: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly dobInput: Locator;
  readonly dobDisplay: Locator;
  readonly roleBuyer: Locator;
  readonly roleSeller: Locator;
  readonly submitButton: Locator;
  readonly alertContainer: Locator;
  readonly gotoLoginLink: Locator;

  // Date picker elements
  readonly datePickerDialog: Locator;
  readonly dobYearSelect: Locator;
  readonly dobMonthSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.registerForm = page.getByTestId('register-form');
    this.firstNameInput = page.getByTestId('register-first-name');
    this.lastNameInput = page.getByTestId('register-last-name');
    this.emailInput = page.getByTestId('register-email');
    this.passwordInput = page.getByTestId('register-password');
    this.confirmPasswordInput = page.getByTestId('register-confirm-password');
    this.dobInput = page.getByRole('button', { name: 'Select date of birth' });
    this.dobDisplay = page.getByTestId('dob-display');
    this.roleBuyer = page.getByRole('button', { name: 'SHOP AS BUYER' });
    this.roleSeller = page.getByTestId('role-seller');
    this.submitButton = page.getByTestId('register-submit');
    this.alertContainer = page.locator('#register-alert');
    this.gotoLoginLink = page.getByTestId('goto-login');

    this.datePickerDialog = page.getByTestId('dob-picker');
    this.dobYearSelect = page.getByTestId('dob-year-select');
    this.dobMonthSelect = page.getByTestId('dob-month-select');
  }

  // ---------- Navigation ----------

  @Step('Open registration page')
  async open(): Promise<void> {
    await super.goto('/#/register');
    await this.waitForLoad();
  }

  @Step('Wait for registration page to be ready')
  async waitForLoad(): Promise<void> {
    await super.waitForLoad();
    await expect(this.registerForm).toBeAttached();
  }

  // ---------- Form actions ----------

  @Step('Fill registration form (email: "{0}")')
  async fillRegisterForm(data: RegisterData): Promise<void> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);
    await this.selectDateOfBirth(data.dob);
    if (data.role) {
      if (data.role === 'buyer') await this.roleBuyer.click();
      if (data.role === 'seller') await this.roleSeller.click();
    }
  }

  @Step('Select date of birth: {0}')
  async selectDateOfBirth(dob: string): Promise<boolean> {
    const [year, month, day] = dob.split('-').map(Number);
    await this.dobDisplay.click();
    await expect(this.datePickerDialog).toBeVisible();
    if (this.dobYearSelect) {
      const timeout = TIMEOUTS.SHORT;
      try {
        await this.dobYearSelect.selectOption(year!.toString(), { timeout });
      } catch (error) {
        const errorMessage = String(error);
        if (errorMessage.includes(`Timeout ${timeout}ms exceeded.`)) {
          await this.pressEscape();
          await expect(this.datePickerDialog).toHaveAttribute('aria-hidden', 'true');
          return false;
        }
        throw error;
      }
    }
    if (this.dobMonthSelect) {
      await this.dobMonthSelect.selectOption({ value: (month!).toString() });
    }
    const paddedDay = String(day).padStart(2, '0');
    const dayButton = this.page.getByTestId(`dob-day-${paddedDay}`);
    await dayButton.click();
    await expect(this.datePickerDialog).toHaveAttribute('aria-hidden', 'true');
    return true;
  }

  @Step('Submit registration form')
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  @Step('Register new user (email: "{0}")')
  async register(data: RegisterData): Promise<void> {
    await this.fillRegisterForm(data);
    await this.submit();
  }

  // ---------- Assertions & waits ----------

  @Step('Wait for successful registration redirect')
  async waitForRegistrationSuccess(): Promise<void> {
    await this.page.waitForURL(/#\//);
    await this.page.waitForSelector('[data-app-ready="true"]');
    await this.currentUser.waitFor({ state: 'visible' });
  }

  @Step('Wait for registration error message')
  async waitForRegistrationError(): Promise<void> {
    await expect(this.alertContainer).toBeVisible();
  }
}
