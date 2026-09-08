import { getTestUser } from '@config/env';
import { expect, test } from '@fixtures';
import type { Account } from '@src/types/account';


test.describe('Home Page API -- GET /api/v1/seed-info', () => {
  test('should return demo account information', async ({ api }) => {
    const response = await api.get('seed-info');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('accounts');
    expect(data.accounts).toHaveLength(3); // seller, seller2, buyer
    const accounts = data.accounts;
    const seller = getTestUser('seller1');
    const sellerEmail = accounts.find((a: Account) => a.email === seller.email);
    const buyer = getTestUser('buyer');
    const buyerEmail = accounts.find((a: Account) => a.email === buyer.email);
    expect(sellerEmail).toBeDefined();
    expect(sellerEmail?.role).toBe('seller');
    expect(buyerEmail).toBeDefined();
    expect(buyerEmail?.role).toBe('buyer');
    expect(data).toHaveProperty('password', buyer.password);
  });
});
