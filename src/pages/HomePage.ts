import { type Locator, type Page, expect } from '@playwright/test';


export class HomePage {
  readonly brandContainer: Locator;
  readonly skipLink: Locator;
  readonly navToggle: Locator;
  readonly navMobileMenu: Locator;
  readonly shopLink: Locator;
  readonly loginLink: Locator;
  readonly eyebrow: Locator;
  readonly heroHeader: Locator;
  readonly heroParagraph: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly categorySelect: Locator;
  readonly categoryOptions: Locator;
  readonly sortSelect: Locator;
  readonly sortOptions: Locator;
  readonly catalogue: Locator;
  readonly productCards: Locator;
  readonly images: Locator;
  readonly flash: Locator;
  readonly saleBadges: Locator;
  readonly soldoutBadge: Locator;

  constructor(private readonly page: Page) {
    // Navigation
    this.brandContainer = page.getByTestId('brand');
    this.skipLink = page.getByTestId('skip-link');
    this.navToggle = page.getByTestId('nav-toggle');
    this.navMobileMenu = page.getByTestId('nav-mobile-menu');
    this.shopLink = page.getByTestId('nav-shop');
    this.loginLink = page.getByTestId('nav-login');
    this.flash = page.locator('#flash');
    // Hero Section
    this.eyebrow = page.locator('.eyebrow');
    this.heroHeader = page.locator('h1');
    this.heroParagraph = page.locator('.hero p:not([class])');
    // Catalog Toolbar
    this.searchInput = page.getByPlaceholder('Search the collection…');
    this.searchSubmit = page.getByTestId('search-submit');
    this.categorySelect = page.getByTestId('filter-category');
    this.categoryOptions = page.getByText('All categories', { exact: true });
    this.sortSelect = page.getByTestId('sort-select');
    this.sortOptions = this.sortSelect.locator('options');
    this.catalogue = page.getByTestId('catalogue');
    this.productCards = page.getByTestId('product-card');
    this.images = page.locator('.card__media img');
    this.saleBadges = page.getByTestId('sale-badge');
    this.soldoutBadge = page.getByTestId('soldout-badge');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await expect(this.brandContainer).toBeVisible();
  }

  async focusSkipLink(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async expectNavToggleAriaExpanded(expected: string): Promise<void> {
    await expect(this.navToggle).toHaveAttribute('aria-expanded', expected);
  }

  async expectMobileMenuVisible(): Promise<void> {
    await expect(this.shopLink).toBeVisible();
    await expect(this.loginLink).toBeVisible();
  }

  async expectMobileMenuHidden(): Promise<void> {
    await expect(this.shopLink).toBeVisible({ visible: false });
    await expect(this.loginLink).toBeVisible({ visible: false });
  }

  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 812 });
  }

  async openMobileMenu(): Promise<void> {
    await this.navToggle.click();
    await this.expectMobileMenuVisible();
    await this.expectNavToggleAriaExpanded('true');
  }

  async closeMobileMenu(): Promise<void> {
    await this.navToggle.click();
    await this.expectMobileMenuHidden();
    await this.expectNavToggleAriaExpanded('false');
  }

  async expectAtHomePage(): Promise<void> {
    await expect(this.page).toHaveURL('#/');
  }

  async expectAtLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL('#/login');
  }

  async getProductNames(): Promise<string[]> {
    return await this.productCards.evaluateAll(element =>
      element.map(el => el.getAttribute('data-name') || ''));
  }
}
