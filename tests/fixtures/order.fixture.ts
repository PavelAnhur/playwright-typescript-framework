import type { APIResponse } from '@playwright/test';
import { test as authTest } from './auth.fixture';
import type { ShippingInfo } from '@src/types/order';

export interface OrderFixtures {
  createOrder: (items?: Array<{ productId: number; quantity: number }>, shipping?: ShippingInfo) => Promise<APIResponse>;
}

export const test = authTest.extend<OrderFixtures>({
  createOrder: async ({ authedBuyer }, use) => {
    const createOrder = async (
      items: Array<{ productId: number; quantity: number }> = [],
      shipping: ShippingInfo = {
        name: 'Test User',
        address: '123 Test Street',
        city: 'Test City',
        postalCode: '123456',
      }
    ) => {
      for (const item of items) {
        await authedBuyer.post('cart/items', {
          data: { productId: item.productId, quantity: item.quantity },
        });
      }
      const response: APIResponse = await authedBuyer.post('orders', {
        data: {
          shipping,
          payment: {
            method: 'mock-card',
            token: 'demo',
          },
        },
      });
      return response;
    };
    await use(createOrder);
  },
});
