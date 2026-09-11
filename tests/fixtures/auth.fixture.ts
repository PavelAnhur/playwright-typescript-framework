/* eslint-disable no-empty-pattern */
import { getTestUser } from "@config/env";
import { type APIRequestContext } from "@playwright/test";
import { AuthContextManager } from "@utils/auth-context.manager";
import { test as apiTest } from "./api.fuxture";


export interface AuthFixtures {
  authedBuyer: APIRequestContext;
  authedSeller1: APIRequestContext;
  authedSeller2: APIRequestContext;
}

const authManager = new AuthContextManager();

const buyer = getTestUser('buyer');
const seller1 = getTestUser('seller1');
const seller2 = getTestUser('seller2');

export const test = apiTest.extend<AuthFixtures>({
  authedBuyer: async ({ }, use) => {
    const context = await authManager.getContext(buyer);
    await use(context);
  },
  authedSeller1: async ({ }, use) => {
    const context = await authManager.getContext(seller1);
    await use(context);
  },
  authedSeller2: async ({ }, use) => {
    const context = await authManager.getContext(seller2);
    await use(context);
  }
});

test.afterAll(async () => {
  await authManager.disposeAll();
});
/* eslint-enable no-empty-pattern */
