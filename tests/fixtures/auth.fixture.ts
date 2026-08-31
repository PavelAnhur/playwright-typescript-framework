import { ENV, getTestUser } from "@config/env";
import { request, type APIRequestContext } from "@playwright/test";
import { test as apiTest } from "./api.fuxture";

export interface AuthFixtures {
  /** An APIRequestContext that carries auth token on every call. */
  authedBuyer: APIRequestContext;
  authedSeller1: APIRequestContext;
}

const buyer = getTestUser('buyer');
const seller1 = getTestUser('seller1');

export const test = apiTest.extend<AuthFixtures>({
  authedBuyer: async ({ api }, use) => {
    const context = await createAuthenticatedContext(
      api,
      buyer.email,
      buyer.password
    );
    await use(context);
    await context.dispose();
  },
  authedSeller1: async ({ api }, use) => {
    const context = await createAuthenticatedContext(
      api,
      seller1.email,
      seller1.password
    );
    await use(context);
    await context.dispose();
  }
});

/**
 * Creates an authenticated API request context for a user
 */
async function createAuthenticatedContext(
  api: APIRequestContext,
  email: string,
  password: string
): Promise<APIRequestContext> {
  const response = await api.post("auth/login", {
    data: { email, password }
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()}`);
  }
  const { token } = await response.json();
  if (!token) {
    throw new Error(`No token received for ${email}`);
  }
  return await request.newContext({
    baseURL: `${ENV.apiURL}/`,
    extraHTTPHeaders: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
