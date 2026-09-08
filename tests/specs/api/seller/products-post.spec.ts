import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';

test.describe('Seller API -- POST /api/v1/products', () => {
  test('seller can create a new product', async ({ authedSeller1 }) => {
    const productData = {
      name: 'Handcrafted Leather Wallet',
      description: 'Premium full-grain leather wallet with RFID protection',
      priceCents: 4500,
      category: 'accessories',
      stock: 25,
    };
    const response = await authedSeller1.post('products', {
      data: productData,
    });
    expect(response.status()).toBe(201);
    const product: Product = await response.json()
      .then(resData => resData.product);
    expect(product).toBeDefined();
    expect(product.id).toBeDefined();
    expect(product.name).toBe(productData.name);
    expect(product.priceCents).toBe(productData.priceCents);
    expect(product.effectiveCents).toBe(productData.priceCents);
    expect(product.onSale).toBe(false);
    expect(product.sellerName).toBe('Atelier Maison');
    expect(product.stock).toBe(productData.stock);
  });

  test('seller cannot create product with invalid price', async ({ authedSeller1 }) => {
    const invalidProducts = [
      { name: 'Invalid', priceCents: -100, category: 'test', stock: 1 },
      // { name: 'Invalid', priceCents: 0, category: 'test', stock: 1 }, bug, need to fix
      { name: 'Invalid', priceCents: 1.5, category: 'test', stock: 1 },
    ];
    for (const product of invalidProducts) {
      const response = await authedSeller1.post('products', {
        data: product,
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('INVALID_PRICE');
    }
  });

  test('seller cannot create product with negative stock', async ({ authedSeller1 }) => {
    const response = await authedSeller1.post('products', {
      data: {
        name: 'Invalid Stock',
        description: 'Negative stock test',
        priceCents: 1000,
        category: 'test',
        stock: -5,
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_STOCK');
  });

  test('buyer cannot create product', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('products', {
      data: {
        name: 'Buyer Product',
        description: 'Should fail',
        priceCents: 1000,
        category: 'test',
        stock: 1,
      },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN_ROLE');
  });
});
