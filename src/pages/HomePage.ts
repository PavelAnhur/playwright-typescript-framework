import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';


export class HomePage extends BasePage{
  // Navigation
  readonly brandContainer: Locator;
  readonly skipLink: Locator;
  readonly navToggle: Locator;
  readonly navMobileMenu: Locator;
  readonly shopLink: Locator;
  readonly loginLink: Locator;
  readonly flash: Locator;
  // Hero Section
  readonly eyebrow: Locator;
  readonly heroHeader: Locator;
  readonly heroParagraph: Locator;
  // Catalog Toolbar
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly categorySelect: Locator;
  readonly sortSelect: Locator;
  // Catalogue
  readonly catalogue: Locator;
  readonly productCards: Locator;
  readonly images: Locator;
  readonly saleBadges: Locator;
  readonly soldoutBadge: Locator;

  constructor(readonly page: Page) {
    super(page);
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
    this.sortSelect = page.getByTestId('sort-select');
    // Catalogue
    this.catalogue = page.getByTestId('catalogue');
    this.productCards = page.getByTestId('product-card');
    this.images = page.locator('.card__media img');
    this.saleBadges = page.getByTestId('sale-badge');
    this.soldoutBadge = page.getByTestId('soldout-badge');
  }

  async open(): Promise<void> {
    await super.goto('/');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await super.waitForLoad();
    await expect(this.brandContainer).toBeVisible();
    await expect(this.catalogue).toBeVisible();
  }

  async clickBrand(): Promise<void> {
    await this.brandContainer.click();
    await this.expectAtHomePage();
  }

  async goToLogin(): Promise<void> {
    await this.loginLink.click();
    await expect(this.page).toHaveURL('#/login');
  }

  async focusSkipLink(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  // Mobile Navigation
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

  // Product Methods
  async getProductNames(): Promise<string[]> {
    return await this.productCards.evaluateAll(element =>
      element.map(el => el.getAttribute('data-name') || ''));
  }

  async waitForCatalogue(): Promise<void> {
    await expect(this.catalogue).toBeVisible();
  }

  async waitForProducts(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible();
  }

  // Toolbar Actions
  async searchFor(productName: string): Promise<void> {
    await this.searchInput.fill(productName);
    await this.searchSubmit.click();
    await this.waitForProducts();
  }

  async filterByCategory(category: string): Promise<void> {
    await this.categorySelect.selectOption(category);
    await this.waitForProducts();
  }

  async sortBy(sortOption: string): Promise<void> {
    await this.sortSelect.selectOption(sortOption);
    await this.waitForProducts();
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.searchSubmit.click();
    await this.waitForProducts();
  }

  async getSortOptions(): Promise<string[]> {
    return await this.sortSelect.locator('option').evaluateAll(
      (elements) => elements.map((el) => el.textContent?.trim() || '')
    );
  }
}
