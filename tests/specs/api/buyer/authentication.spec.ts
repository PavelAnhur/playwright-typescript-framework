import { ENV, expect, test } from '@fixtures';
import { request } from '@playwright/test';
import type { User } from '@src/types/account';


test.describe('Buyer API -- Authentication & Authorization', () => {
  test('should return 401 when accessing cart without token', async ({ api }) => {
    const response = await api.get('cart');
    expect(response.status()).toBe(401);
    const error = await response.json();
    expect(error.error.code).toBe('UNAUTHENTICATED');
  });

  test('should return 401 when accessing orders without token', async ({ api }) => {
    const response = await api.get('orders');
    expect(response.status()).toBe(401);
    const error = await response.json();
    expect(error.error.code).toBe('UNAUTHENTICATED');
  });

  test('should return 401 with invalid token', async ({ api }) => {
    const response = await api.get('cart', {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });
    expect(response.status()).toBe(401);
    const error = await response.json();
    expect(error.error.code).toBe('UNAUTHENTICATED');
  });

  test('should return user info from /auth/me', async ({ authedBuyer }) => {
    const response = await authedBuyer.get('auth/me');
    expect(response.ok()).toBeTruthy();
    const user: User = await response.json()
      .then(responseData => responseData.user);
    expect(user.email).toBe(ENV.testUsers[0].testBuyer.email);
    expect(user.role).toBe('buyer');
    expect(user.id).toBeDefined();
  });

  test('should logout successfully', async ({ authedBuyer }) => {
    const response = await authedBuyer.post('auth/logout');
    expect(response.ok()).toBeTruthy();
    const unauthenticatedContext = await request.newContext({
      baseURL: `${ENV.apiURL}/`
    });
    try {
      const meResponse = await unauthenticatedContext.get('auth/me');
      expect(meResponse.status()).toBe(401);
    } finally {
      await unauthenticatedContext.dispose();
    }
  });
});
