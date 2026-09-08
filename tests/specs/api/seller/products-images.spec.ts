import { expect, test } from '@fixtures';
import type { Product } from '@src/types/product';


test.describe('Seller API -- POST /api/v1/products/:id/images', () => {
  test('seller can add image to their product', async ({ createProduct, authedSeller1 }) => {
    const productId = await createProduct({
      name: 'Image Test Product',
      description: 'Product with images',
      priceCents: 3000,
      category: 'lighting',
      stock: 5,
    }).then(product => product.id);
    const imageUrl = 'https://example.com/product-image.jpg';
    const response = await authedSeller1.post(`products/${productId}/images`, {
      data: { url: imageUrl },
    });
    expect(response.status()).toBe(201);
    const product: Product = await response.json()
      .then(resData => resData.product);
    expect(product.id).toBe(productId);
    expect(product.images).toContain(imageUrl);
  });

  test('seller cannot add image to another seller\'s product', async ({ createProduct, authedSeller2 }) => {
    const productId = await createProduct({
      name: 'Image Test Product',
      description: 'Product with images',
      priceCents: 3000,
      category: 'lighting',
      stock: 5,
    }).then(prod => prod.id);
    const response = await authedSeller2.post(`products/${productId}/images`, {
      data: { url: 'https://example.com/evil-image.jpg' },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('NOT_OWNER');
  });

  test('seller cannot add invalid image URL', async ({ createProduct, authedSeller1 }) => {
    const productId = await createProduct({
      name: 'Image Test Product',
      description: 'Product with images',
      priceCents: 3000,
      category: 'lighting',
      stock: 5,
    }).then(prod => prod.id);
    const invalidUrls = [
      { url: '' },
      // { url: 'not-a-url' },                     bug, need to fix
      // { url: 'ftp://invalid.com/image.jpg' },   bug, need to fix
    ];
    for (const data of invalidUrls) {
      const response = await authedSeller1.post(`products/${productId}/images`, {
        data,
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe('INVALID_IMAGE');
    }
  });
});
