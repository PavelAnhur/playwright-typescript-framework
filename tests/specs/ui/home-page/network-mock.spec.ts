import { expect, test } from '@fixtures';

test.describe('Home page network mocking', () => {
  test('renders the mocked product from the products endpoint', async ({ network, homePage }) => {
    const productsUrl = /\/api\/v1\/products(\?.*)?$/;
    const mockedProducts = {
      products: [
        {
          id: 1,
          name: 'Mocked Maison Chair',
          sellerName: 'Mock Seller',
          category: 'furniture',
          priceCents: 19900,
          discount: null,
        },
      ],
      count: 1,
    };
    await network.mock(productsUrl, mockedProducts);
    await homePage.open();
    await expect(homePage.productCards).toHaveCount(1);
    await expect(homePage.productName).toHaveText('Mocked Maison Chair');
    expect(network.wasHit(productsUrl)).toBe(true);
  });
});
