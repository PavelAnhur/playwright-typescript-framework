import { T } from '@config/timeouts';
import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Abstract base class for all Page Objects.
 * Provides common functionality and utilities for page interactions.
 */
export abstract class BasePage {

  readonly flashMessage: Locator;
  readonly loadingIndicator: Locator;
  readonly cookieBanner: Locator;
  readonly cookieAcceptButton: Locator;
  // Shared navigation elements
  readonly brand: Locator;
  readonly navToggle: Locator;
  readonly navMobileMenu: Locator;
  readonly navShop: Locator;
  readonly navCart: Locator;
  readonly navLogin: Locator;
  readonly logoutLink: Locator;
  readonly sellerListing: Locator;
  readonly currentUser: Locator;
  readonly skipLink: Locator;

  constructor(protected readonly page: Page) {
    this.flashMessage = page.locator('.flash, .alert, [role="alert"]');
    this.loadingIndicator = page.locator('.loading, .spinner, [data-testid="loading"]');
    this.cookieBanner = page.locator('.cookie-banner, .cookie-consent, [data-testid="cookie-banner"]');
    this.cookieAcceptButton = page.locator('button:has-text("Accept"), button:has-text("Allow"), [data-testid="accept-cookies"]');

    this.brand = page.getByTestId('brand');
    this.navToggle = page.getByTestId('nav-toggle');
    this.navMobileMenu = page.getByTestId('nav-mobile-menu');
    this.navShop = page.getByTestId('nav-shop');
    this.navCart = page.getByTestId('nav-cart');
    this.navLogin = page.getByTestId('nav-login');
    this.logoutLink = page.getByTestId('logout-link');
    this.sellerListing = page.getByTestId('my-listings');
    this.currentUser = page.getByTestId('current-user');
    this.skipLink = page.getByTestId('skip-link');
  }

  /**
   * Navigate to a specific path
   * @param path - The URL path (defaults to '/')
   */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path, { timeout: T.NAVIGATION });
    await this.waitForLoad();
  }

  /**
   * Wait for the page to be fully loaded
   * Override in child classes for specific load conditions
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout: T.DOM_CONTENT_LOADED });
    await this.waitForLoadingComplete();
    await this.handleBanners();
  }

  /**
   * Wait for loading indicators to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    try {
      const indicator = this.loadingIndicator.first();
      if (await indicator.isVisible({ timeout: T.VERY_SHORT })) {
        await this.loadingIndicator.waitFor({
          state: 'hidden',
          timeout: T.SHORT
        });
      }
    } catch {
      // Loading indicator doesn't exist or already gone
    }
  }

  /**
   * Handle common banners (cookies, popups, etc.)
   */
  async handleBanners(): Promise<void> {
    try {
      const bannerExists = await this.cookieBanner
        .isVisible({ timeout: T.VERY_SHORT });
      if (bannerExists) {
        const buttonVisible = await this.cookieAcceptButton
          .isVisible({ timeout: T.VERY_SHORT });
        if (buttonVisible) {
          await this.cookieAcceptButton.click();
          await this.cookieBanner
            .waitFor({ state: 'hidden', timeout: T.SHORT });
        }
      }
    } catch {
      // Cookie banner doesn't exist or already handled
    }
    await this.handleCookieBanner();
    await this.handlePopups();
  }

  /**
   * Accept cookie banner if present
   */
  async handleCookieBanner(): Promise<void> {
    try {
      if (await this.cookieBanner.isVisible({ timeout: T.VERY_SHORT })) {
        await this.cookieAcceptButton.click();
        await this.cookieBanner
          .waitFor({ state: 'hidden', timeout: T.MEDIUM });
      }
    } catch {
      // Cookie banner might not exist or already handled
    }
  }

  /**
   * Handle any popups or overlays
   * Override in child classes for specific popups
   */
  async handlePopups(): Promise<void> {
    // Default implementation - override in child classes
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get the current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Take a screenshot
   */
  async screenshot(options?: { path?: string; fullPage?: boolean }): Promise<Buffer> {
    return await this.page.screenshot(options);
  }

  /**
   * Get a Locator for an element by selector or testId
   * This is the preferred method for finding elements in tests
   * 
   * @param selector - CSS selector, testId, or attribute selector
   * @param options - Optional configuration
   * @returns Locator for the element
   * 
   * @example
   * // By CSS selector
   * const title = page.getElement('h1');
   * 
   * // By testId
   * const submit = page.getElement('[data-testid="submit"]');
   * 
   * // By text content
   * const button = page.getElement('button:has-text("Submit")');
   * 
   * // With options
   * const list = page.getElement('ul.items', { has: page.locator('li.active') });
   */
  getElement(
    selector: string,
    options?: {
      has?: Locator;
      hasText?: string | RegExp;
    }
  ): Locator {
    return this.page.locator(selector, options);
  }


  /**
 * Check if an element is visible quickly
 */
  async isElementVisible(
    locator: Locator,
    timeout: number = T.VERY_SHORT,
  ): Promise<boolean> {
    try {
      return await locator.isVisible({ timeout });
    } catch {
      return false;
    }
  }

  /**
   * Get flash message text
   */
  async getFlashMessage(): Promise<string> {
    try {
      if (await this.isElementVisible(this.flashMessage, T.VERY_SHORT)) {
        return await this.flashMessage.textContent() || '';
      }
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Check if flash message contains text
   */
  async expectFlashMessage(text: string): Promise<void> {
    await expect(this.flashMessage).toContainText(text);
  }

  /**
   * Clear all cookies
   */
  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  /**
 * Reload the page
 */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * Go back to previous page
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForLoad();
  }

  /**
   * Expect URL to contain a specific path
   */
  async expectUrlToContain(path: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  /**
   * Expect URL to be exactly a specific path
   */
  async expectUrlToBe(path: string): Promise<void> {
    await expect(this.page).toHaveURL(path);
  }

  async goToShop(): Promise<void> {
    await this.navShop.click();
    await this.page.waitForURL(/#\//);
  }

  async goToCart(): Promise<void> {
    await this.navCart.click();
    await this.page.waitForURL(/#\/cart/);
  }

  async goToLogin(): Promise<void> {
    await this.navLogin.click();
    await this.page.waitForURL(/#\/login/);
  }

  // ============ Keyboard Navigation Methods ============

  /**
   * Press the Tab key
   */
  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  /**
   * Press Shift+Tab for reverse tab navigation
   */
  async pressShiftTab(): Promise<void> {
    await this.page.keyboard.press('Shift+Tab');
  }

  /**
   * Press a specific key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Press Enter key
   */
  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  /**
   * Press Escape key
   */
  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Press Space key
   */
  async pressSpace(): Promise<void> {
    await this.page.keyboard.press('Space');
  }

  async setMobileViewport(width: number = 375, height: number = 812): Promise<void> {
    await this.page.setViewportSize({ width: width, height: height });
  }

  // ============ Wait/Timeout Methods ============

  /**
   * Wait for a specific amount of time in milliseconds
   * Use sparingly - prefer waiting for elements/conditions instead
   */
  async waitForTimeout(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
