/* eslint-disable no-empty-pattern */
import { ENV, getTestUser } from "@config/env";
import { request, type APIRequestContext } from "@playwright/test";
import type { Account } from "@src/types/account";
import { test as apiTest } from "./api.fuxture";

export interface AuthFixtures {
  authedBuyer: APIRequestContext;
  authedSeller1: APIRequestContext;
  authedSeller2: APIRequestContext;
}

const buyer = getTestUser('buyer');
const seller1 = getTestUser('seller1');
const seller2 = getTestUser('seller2');

class AuthContextManager {
  private contexts: Map<string, APIRequestContext> = new Map();
  private tokens: Map<string, string> = new Map();
  async getContext(account: Account): Promise<APIRequestContext> {
    const key = account.email;
    // Return existing context if available
    if (this.contexts.has(key)) {
      return this.contexts.get(key)!;
    }
    // Create new context with retry logic
    const context = await this.createContextWithRetry(account);
    this.contexts.set(key, context);
    return context;
  }

  private async createContextWithRetry(
    account: Account,
    maxRetries: number = 3
  ): Promise<APIRequestContext> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let token = this.tokens.get(account.email);
        if (!token) {
          const tempContext = await request.newContext({
            baseURL: `${ENV.apiURL}/`,
          });
          const response = await tempContext.post("auth/login", {
            data: { email: account.email, password: account.password }
          });
          if (!response.ok()) {
            await tempContext.dispose();
            if (response.status() === 429) {
              const waitTime = 1000 * Math.pow(2, attempt - 1);
              console.log(`Rate limited for ${account.email}, attempt ${attempt}/${maxRetries}, waiting ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            throw new Error(`Login failed for ${account.email}: ${response.status()}`);
          }

          const { token: newToken } = await response.json();
          if (!newToken) {
            await tempContext.dispose();
            throw new Error(`No token received for ${account.email}`);
          }
          token = newToken;
          this.tokens.set(account.email, token!);
          await tempContext.dispose();
        }
        const authContext = await request.newContext({
          baseURL: `${ENV.apiURL}/`,
          extraHTTPHeaders: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        return authContext;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Failed to create authenticated context for ${account.email}`, { cause: error });
        }
        const waitTime = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    throw new Error(`Failed to create authenticated context for ${account.email}`);
  }

  async disposeAll(): Promise<void> {
    for (const [key, context] of this.contexts) {
      try {
        await context.dispose();
      } catch (error) {
        console.error(`Error disposing context for ${key}:`, error);
      }
    }
    this.contexts.clear();
    this.tokens.clear();
  }
}

const authManager = new AuthContextManager();

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

// Cleanup all contexts after all tests
test.afterAll(async () => {
  await authManager.disposeAll();
});
/* eslint-enable no-empty-pattern */
