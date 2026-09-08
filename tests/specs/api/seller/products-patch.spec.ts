import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';


test.describe('Seller API -- PATCH /api/v1/products/:id', () => {
  test('seller can update their own product', async ({ createProduct, authedSeller1 }) => {
    const preProduct = await createProduct({
      name: 'Update Test Product',
      description: 'Initial description',
      priceCents: 5000,
      category: 'furniture',
      stock: 10,
    });
    const updates = {
      name: 'Updated Product Name',
      description: 'Updated description',
      priceCents: 5500,
      category: 'lighting',
      stock: 15,
    };
    const response = await authedSeller1.patch(`products/${preProduct.id}`, {
      data: updates,
    });
    expect(response.status()).toBe(200);
    const product: Product = await response.json()
      .then(resData => resData.product);
    expect(product.id).toBe(preProduct.id);
    expect(product.name).toBe(updates.name);
    expect(product.description).toBe(updates.description);
    expect(product.priceCents).toBe(updates.priceCents);
    expect(product.category).toBe(updates.category);
    expect(product.stock).toBe(updates.stock);
    expect(product.effectiveCents).toBe(updates.priceCents);
  });

  test('seller cannot update another seller\'s product', async ({ createProduct, authedSeller1, authedSeller2 }) => {
    const preProduct = await createProduct({
      name: 'Update Test Product',
      description: 'Initial description',
      priceCents: 5000,
      category: 'furniture',
      stock: 10,
      seller: authedSeller1
    });
    const response = await authedSeller2.patch(`products/${preProduct.id}`, {
      data: { name: 'Attempted Hijack' },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_OWNER');
    expect(body.error.message).toContain('You can only modify products you own.');
  });

  test('seller cannot update non-existent product', async ({ authedSeller1 }) => {
    const response = await authedSeller1.patch('products/99999', {
      data: { name: 'Does not exist' },
    });
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  test('buyer cannot update any product', async ({ createProduct, authedSeller1, authedBuyer }) => {
    const preProduct = await createProduct({
      name: 'Update Test Product',
      description: 'Initial description',
      priceCents: 5000,
      category: 'furniture',
      stock: 10,
      seller: authedSeller1
    });
    const response = await authedBuyer.patch(`products/${preProduct.id}`, {
      data: { name: 'Buyer Update Attempt' },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN_ROLE');
  });
});
