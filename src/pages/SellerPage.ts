import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { Modal } from './components/Modal';

export class SellerPage extends BasePage {
  readonly listings: Locator;
  readonly priceModal: Modal;
  readonly priceInput: Locator;

  constructor(page: Page) {
    super(page);
    this.listings = page.getByTestId('my-listings');
    this.priceModal = new Modal(page.getByTestId('modal'), 'modal-price-save');
    this.priceInput = page.getByTestId('modal-price');
  }

  async open(): Promise<void> {
    await this.page.goto('/#/seller');
    await this.waitForLoad();
  }

  listingRow(productId: number): Locator {
    return this.page.locator(`[data-testid="listing-row"][data-product-id="${productId}"]`);
  }

  editPriceButton(productId: number): Locator {
    return this.listingRow(productId).getByTestId('edit-price');
  }

  listingPrice(productId: number): Locator {
    return this.listingRow(productId).getByTestId('listing-price');
  }

  async firstProductId(): Promise<number> {
    const productId = await this.listings
      .getByTestId('listing-row')
      .first()
      .getAttribute('data-product-id');
    if (!productId) {
      throw new Error('No listing rows found on the seller page');
    }
    return Number(productId);
  }

  async openPriceModal(productId: number): Promise<void> {
    await this.editPriceButton(productId).click();
    await this.priceInput.waitFor({ state: 'visible' });
  }

  async setPrice(value: string): Promise<void> {
    await this.priceInput.fill(value);
  }
}
