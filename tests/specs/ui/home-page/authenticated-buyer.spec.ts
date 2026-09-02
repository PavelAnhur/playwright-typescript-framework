import { expect, test } from '@fixtures';


test.describe('Authenticated Buyer - Home Page', () => {
  test.describe('Header & Navigation', () => {
    test('should show buyer-specific navigation elements', async ({ buyerHomePage }) => {
      // Verify buyer is logged in
      await expect(buyerHomePage.currentUser).toBeVisible();
      // Verify cart link with count
      await expect(buyerHomePage.cartLink).toBeVisible();
      await expect(buyerHomePage.cartLink).toContainText('Cart');
      await expect(buyerHomePage.cartCount).toBeVisible();
      // Verify orders link is visible for buyer
      await expect(buyerHomePage.ordersLink).toBeVisible();
      await expect(buyerHomePage.ordersLink).toHaveText('Orders');
      // Verify logout link
      await expect(buyerHomePage.logoutLink).toBeVisible();
      await expect(buyerHomePage.logoutLink).toHaveText('Logout');
    });

    test('should show correct user role in data attribute', async ({ buyerHomePage }) => {
      await expect(buyerHomePage.currentUser).toHaveAttribute('data-role', 'buyer');
    });

    test('should navigate to cart when cart link is clicked', async ({ buyerHomePage }) => {
      await buyerHomePage.cartLink.click();
      await buyerHomePage.expectUrlToContain('/#/cart');
    });

    test('should navigate to orders when orders link is clicked', async ({ buyerHomePage }) => {
      await buyerHomePage.ordersLink.click();
      await buyerHomePage.expectUrlToContain('/#/orders');
    });

    test('should logout successfully', async ({ buyerHomePage }) => {
      await buyerHomePage.logout();
      await expect(buyerHomePage.loginLink).toBeVisible();
      await expect(buyerHomePage.cartLink).toBeHidden();
    });
  });

  test.describe.serial('Cart & Orders Access', () => {
    test('should show correct cart count when items are added', async ({ buyerHomePage, api, authedBuyer }) => {
      await api.post('_reset');
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product = productsData.products[0];
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 2 },
      });
      await buyerHomePage.reload();
      await expect(buyerHomePage.cartCount).toHaveText('2');
    });

    test('should show product in cart when navigating to cart page', async ({ buyerHomePage, api, authedBuyer }) => {
      await api.post('_reset');
      const productsResponse = await api.get('products');
      const productsData = await productsResponse.json();
      const product = productsData.products[0];
      await authedBuyer.post('cart/items', {
        data: { productId: product.id, quantity: 1 },
      });
      await buyerHomePage.cartLink.click();
      await expect(buyerHomePage.getElement('[data-testId="cart-line"]')).toBeVisible();
      await expect(buyerHomePage.getElement('[data-testId="line-name"]')).toHaveText(product.name);
      await expect(buyerHomePage.getElement('[data-testId="line-qty"]')).toHaveText('Qty 1');
    });
  });

  test.describe('Product Catalogue', () => {
    test('should display all product cards', async ({ buyerHomePage }) => {
      await buyerHomePage.waitForCatalogue();
      await expect(buyerHomePage.productCards).toHaveCount(22);
    });

    test('should show sale badges for discounted products', async ({ buyerHomePage }) => {
      const productCard = buyerHomePage.getProductById(1);
      const saleBadge = productCard.getByTestId('sale-badge');
      await expect(saleBadge).toBeVisible();
      await expect(productCard).toContainText('Sale');
    });

    test('should show sold out badge for out of stock products', async ({ buyerHomePage }) => {
      const productCard = buyerHomePage.getProductById(6);
      const soldOutBadge = productCard.getByTestId('soldout-badge');
      await expect(soldOutBadge).toBeVisible();
      await expect(soldOutBadge).toContainText('Sold Out');
    });

    test('should show price was for discounted products', async ({ buyerHomePage }) => {
      const productCard = buyerHomePage.getProductById(1);
      const priceWas = productCard.getByTestId('price-was');
      await expect(priceWas).toBeVisible();
      await expect(priceWas).toContainText('$2,850.00');

      const productCard5 = buyerHomePage.getProductById(5);
      const priceWasProduct5 = productCard5.getByTestId('price-was');
      await expect(priceWasProduct5).toBeVisible();
      await expect(priceWasProduct5).toContainText('$1,420.00');
    });

    test('should show correct discounted price for product 1', async ({ buyerHomePage }) => {
      const productCard = buyerHomePage.getProductById(1);
      const currentPrice = productCard.getByTestId('price');
      await expect(currentPrice).toContainText('$2,422.50');
    });

    test('should navigate to product detail when product card is clicked', async ({ buyerHomePage }) => {
      await buyerHomePage.getProductById(1).click();
      buyerHomePage.expectUrlToContain('/#/product/1');
    });
  });

  test.describe('Catalogue Toolbar', () => {
    test('should filter products by search', async ({ buyerHomePage }) => {
      await buyerHomePage.searchFor('Tote');
      await expect(buyerHomePage.productCards).toHaveCount(1);
      await expect(buyerHomePage.productName).toHaveText('Noir Saffiano Tote');
    });

    test('should filter products by category', async ({ buyerHomePage }) => {
      await buyerHomePage.filterByCategory('Bags');
      await expect(buyerHomePage.productCards).toHaveCount(3);
      const categories = await buyerHomePage.getElement('.card__cat').allTextContents();
      expect(categories.every(cat => cat === 'Bags')).toBe(true);
    });

    test('should sort products by price low to high', async ({ buyerHomePage }) => {
      await buyerHomePage.sortBy('price_asc');
      const prices = await buyerHomePage.priceList.allTextContents();
      const numericPrices = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, '')));
      const sorted = [...numericPrices].sort((a, b) => a - b);
      expect(numericPrices).toEqual(sorted);
    });

    test('should sort products by price high to low', async ({ buyerHomePage }) => {
      await buyerHomePage.sortBy('price_desc');
      const prices = await buyerHomePage.priceList.allTextContents();
      const numericPrices = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, '')));
      const sorted = [...numericPrices].sort((a, b) => b - a);
      expect(numericPrices).toEqual(sorted);
    });
  });

  test.describe('Accessibility', () => {
    test('should have aria-live region for catalogue updates', async ({ buyerHomePage }) => {
      await expect(buyerHomePage.catalogue).toHaveAttribute('aria-live', 'polite');
    });

    test('should have skip link', async ({ buyerHomePage }) => {
      await expect(buyerHomePage.skipLink).toBeVisible();
      await expect(buyerHomePage.skipLink).toHaveText('Skip to content');
    });

    test('should have accessible nav toggle', async ({ buyerHomePage }) => {
      await expect(buyerHomePage.navToggle).toHaveAttribute('aria-controls', 'primary-nav');
      await expect(buyerHomePage.navToggle).toHaveAttribute('aria-expanded', 'false');
      await expect(buyerHomePage.navToggle).toHaveAttribute('aria-label', 'Open navigation');
    });

    test('should have accessible search input', async ({ buyerHomePage }) => {
      await expect(buyerHomePage.searchInput).toHaveAttribute('aria-label', 'Search products');
    });

    test('should have accessible category filter', async ({ buyerHomePage }) => {
      await expect(buyerHomePage.categorySelect).toHaveAttribute('aria-label', 'Filter by category');
    });

    test('should have accessible sort select', async ({ buyerHomePage }) => {
      await expect(buyerHomePage.sortSelect).toHaveAttribute('aria-label', 'Sort products');
    });

    test('should have product card with accessible labels', async ({ buyerHomePage }) => {
      const firstProduct = buyerHomePage.productCards.first();
      const link = firstProduct.locator('.card__media');
      await expect(link).toHaveAttribute('aria-label', expect.stringContaining('Noir Saffiano Tote'));
    });
  });

  test.describe('Flash Messages', () => {
    test('should show flash message on login', async ({ buyerHomePage }) => {
      await buyerHomePage.logout();
      (await buyerHomePage.goToLogin()).loginAsDemoUser('buyer');
      await expect(buyerHomePage.flash).toBeVisible();
      await expect(buyerHomePage.flash).toContainText('Welcome');
    });

    test('should show flash message on logout', async ({ buyerHomePage }) => {
      await buyerHomePage.logout();
      await expect(buyerHomePage.flash).toBeVisible();
      await expect(buyerHomePage.flash).toContainText('You have been signed out.');
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should show mobile nav toggle on small screens', async ({ buyerHomePage }) => {
      await buyerHomePage.logout();
      await buyerHomePage.setMobileViewport();
      await buyerHomePage.open();
      await expect(buyerHomePage.navToggle).toBeVisible();
      await buyerHomePage.expectMobileMenuHidden();
      await buyerHomePage.openMobileMenu();
      await buyerHomePage.closeMobileMenu();
    });
  });
});
