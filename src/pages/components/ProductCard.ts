import type { Locator } from '@playwright/test';

export class ProductCard {
  constructor(readonly card: Locator) {}

  name(): Locator {
    return this.card.getByTestId('product-name');
  }

  category(): Locator {
    return this.card.locator('.card__cat');
  }

  media(): Locator {
    return this.card.locator('.card__media');
  }

  image(): Locator {
    return this.card.locator('.card__media img');
  }

  price(): Locator {
    return this.card.getByTestId('price');
  }

  priceWas(): Locator {
    return this.card.getByTestId('price-was');
  }
}
