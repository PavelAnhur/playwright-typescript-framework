import { type Locator, type Page, expect } from '@playwright/test';
import { Step } from '@utils/step-decorator';
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

  @Step('Open home page')
  async open(): Promise<void> {
    await super.goto('/');
    await this.waitForLoad();
  }

  @Step('Wait for home page to be ready')
  async waitForLoad(): Promise<void> {
    await super.waitForLoad();
    await expect(this.brand).toBeVisible();
    await expect(this.catalogue).toBeVisible();
  }

  @Step('Click brand logo')
  async clickBrand(): Promise<void> {
    await this.brand.click();
    await this.expectAtHomePage();
  }

  @Step('Open login page from navigation')
  async openLoginPage(): Promise<LoginPage> {
    await this.navLogin.click();
    const loginPage = new LoginPage(this.page);
    await loginPage.waitForLoad();
    return loginPage;
  }

  @Step('Focus skip link with Tab')
  async focusSkipLink(): Promise<void> {
    await this.pressTab();
  }

  // ---------- Mobile navigation ----------

  @Step('Assert nav toggle aria-expanded is "{0}"')
  async expectNavToggleAriaExpanded(expected: string): Promise<void> {
    await expect(this.navToggle).toHaveAttribute('aria-expanded', expected);
  }

  @Step('Assert mobile menu is visible')
  async expectMobileMenuVisible(): Promise<void> {
    await expect(this.navShop).toBeVisible();
    await expect(this.navLogin).toBeVisible();
  }

  @Step('Assert mobile menu is hidden')
  async expectMobileMenuHidden(): Promise<void> {
    await expect(this.navShop).toBeVisible({ visible: false });
    await expect(this.navLogin).toBeVisible({ visible: false });
  }

  @Step('Open mobile menu')
  async openMobileMenu(): Promise<void> {
    await this.navToggle.click();
    await this.expectMobileMenuVisible();
    await this.expectNavToggleAriaExpanded('true');
  }

  @Step('Close mobile menu')
  async closeMobileMenu(): Promise<void> {
    await this.navToggle.click();
    await this.expectMobileMenuHidden();
    await this.expectNavToggleAriaExpanded('false');
  }

  @Step('Assert we are on the home page')
  async expectAtHomePage(): Promise<void> {
    await expect(this.page).toHaveURL('#/');
  }

  // ---------- Product queries ---------- 

  getProductById(productId: number | string): Locator {
    return this.page.locator(`[data-testid="product-card"][data-product-id="${productId}"]`);
  }

  async getProductNames(): Promise<string[]> {
    return await this.productCards.evaluateAll(element =>
      element.map(el => el.getAttribute('data-name') || ''));
  }

  @Step('Wait for catalogue to be visible')
  async waitForCatalogue(): Promise<void> {
    await expect(this.catalogue).toBeVisible();
  }

  @Step('Wait for products to appear')
  async waitForProducts(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible();
  }

  // ---------- Toolbar actions ----------

  @Step('Search for "{0}"')
  async searchFor(productName: string): Promise<void> {
    await this.searchInput.fill(productName);
    await this.searchSubmit.click();
    await this.waitForProducts();
  }

  @Step('Filter by category "{0}"')
  async filterByCategory(category: string): Promise<void> {
    await this.categorySelect.selectOption(category);
    await this.waitForProducts();
  }

  @Step('Sort by "{0}"')
  async sortBy(sortOption: string): Promise<void> {
    await this.sortSelect.selectOption(sortOption);
    await this.waitForProducts();
  }

  @Step('Clear search query')
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

  // ---------- Session ----------

  @Step('Log out if logged in')
  async logout(): Promise<void> {
    if (await this.isUserLoggedIn()) {
      await this.logoutLink.click();
      await this.currentUser.waitFor({ state: 'detached' });
      await this.flashMessage.waitFor({ state: 'visible' });
    }
  }
}
