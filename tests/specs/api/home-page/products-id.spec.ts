import { expect, test } from '@fixtures';
import { productSchema } from '../schemas/product.schema';
import { parseErrorEnvelope } from '../schemas/error-envelope.schema';

test.describe('Hoem Page API -- GET /api/v1/products/:id', () => {
  test('should return a single product by ID', async ({ api }) => {
    const productId = 5;
    const response = await api.get(`products/${productId}`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const result = productSchema.safeParse(data.product);
    if (!result.success) {
      throw new Error(
        `Product response failed schema validation: ${JSON.stringify(result.error.issues, null, 2)}`
      );
    }
    const product = result.data;
    expect(product.category).toBe('Footwear');
    expect(product.discount?.type).toBe('fixed');
    expect(product.discount?.value).toEqual(20000);
  });

  test('should return 404 for non-existent product', async ({ api }) => {
    const response = await api.get('products/99999');
    expect(response.status()).toBe(404);
    const data = await response.json();
    parseErrorEnvelope(data);
    expect(data.error).toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      message: 'That product does not exist.',
    });
  });

  test('should handle invalid product ID format', async ({ api }) => {
    const response = await api.get('products/invalid');
    expect(response.status()).toBe(404);
    const data = await response.json();
    parseErrorEnvelope(data);
    expect(data.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  test('should reject a malformed product', () => {
    const missingPriceCents = {
      id: 1,
      name: 'Test Product',
      sellerName: 'Test Seller',
      category: 'Footwear',
      discount: null,
    };
    expect(productSchema.safeParse(missingPriceCents).success).toBe(false);
    const stringPriceCents = {
      id: 1,
      name: 'Test Product',
      sellerName: 'Test Seller',
      category: 'Footwear',
      priceCents: '1000',
      discount: null,
    };
    expect(productSchema.safeParse(stringPriceCents).success).toBe(false);
  });
});
