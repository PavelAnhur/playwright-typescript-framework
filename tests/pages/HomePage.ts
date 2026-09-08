import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { LoginPage } from './LoginPage';


export class HomePage extends BasePage {
  // Navigation
  readonly cartCount: Locator;
  readonly ordersLink: Locator;
  readonly logoutLink: Locator;
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
  readonly productName: Locator;
  readonly priceList: Locator;
  readonly images: Locator;
  readonly saleBadges: Locator;
  readonly soldoutBadge: Locator;

  constructor(readonly page: Page) {
    super(page);
    // Navigation
    this.cartCount = page.getByTestId('cart-count');
    this.ordersLink = page.getByTestId('nav-orders');
    this.logoutLink = page.getByTestId('logout-link');
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
    this.productName = page.getByTestId('product-name');
    this.priceList = page.getByTestId('price');
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
    await expect(this.brand).toBeVisible();
    await expect(this.catalogue).toBeVisible();
  }

  async clickBrand(): Promise<void> {
    await this.brand.click();
    await this.expectAtHomePage();
  }

  async openLoginPage(): Promise<LoginPage> {
    await this.navLogin.click();
    const loginPage = new LoginPage(this.page);
    await loginPage.waitForLoad();
    return loginPage;
  }

  async focusSkipLink(): Promise<void> {
    await this.pressTab();
  }

  // Mobile Navigation
  async expectNavToggleAriaExpanded(expected: string): Promise<void> {
    await expect(this.navToggle).toHaveAttribute('aria-expanded', expected);
  }

  async expectMobileMenuVisible(): Promise<void> {
    await expect(this.navShop).toBeVisible();
    await expect(this.navLogin).toBeVisible();
  }

  async expectMobileMenuHidden(): Promise<void> {
    await expect(this.navShop).toBeVisible({ visible: false });
    await expect(this.navLogin).toBeVisible({ visible: false });
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
  getProductById(productId: number | string): Locator {
    return this.page.locator(`[data-testid="product-card"][data-product-id="${productId}"]`);
  }

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

  async isUserLoggedIn(): Promise<boolean> {
    try {
      return await this.currentUser.isVisible();
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    if (await this.isUserLoggedIn()) {
      await this.logoutLink.click();
      await this.currentUser.waitFor({ state: 'detached' });
      await this.flashMessage.waitFor({ state: 'visible' });
    }
  }
}
