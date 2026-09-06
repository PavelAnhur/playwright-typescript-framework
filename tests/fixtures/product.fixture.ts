import type { APIRequestContext } from '@playwright/test';
import type { Product } from '@src/types/product';
import { test as base } from './auth.fixture';

export interface ProductFixtures {
  createProduct: (options?: CreateProductOptions) => Promise<Product>;
}

export interface CreateProductOptions {
  name?: string;
  description?: string;
  priceCents?: number;
  category?: string;
  stock?: number;
  seller?: APIRequestContext;
}

const DEFAULT_PRODUCT = {
  name: 'Test Product',
  description: 'A test product for API testing',
  priceCents: 10000,
  category: 'furniture',
  stock: 10,
};

export const test = base.extend<ProductFixtures>({
  createProduct: async ({ authedSeller1 }, use) => {
    const createProductFn = async (options: CreateProductOptions = {}) => {
      const {
        name = DEFAULT_PRODUCT.name,
        description = DEFAULT_PRODUCT.description,
        priceCents = DEFAULT_PRODUCT.priceCents,
        category = DEFAULT_PRODUCT.category,
        stock = DEFAULT_PRODUCT.stock,
        seller = authedSeller1,
      } = options;

      const response = await seller.post('products', {
        data: { name, description, priceCents, category, stock },
      });
      if (!response.ok()) {
        const error = await response.json();
        throw new Error(`Failed to create product: ${response.status()} - ${JSON.stringify(error)}`);
      }
      const data = await response.json();
      return data.product as Product;
    };
    await use(createProductFn);
  },
});
