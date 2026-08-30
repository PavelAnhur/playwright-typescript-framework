/* eslint-disable no-empty-pattern */
import { ENV } from "@config/env";
import { test as base, request, type APIRequestContext } from "@playwright/test";


export interface ApiWorkerFixtures {
  api: APIRequestContext;
}

export const test = base.extend<ApiWorkerFixtures>({
  api: async ({ }, use) => {
    const context = await request.newContext({ baseURL: `${ENV.apiURL}/` });
    await use(context);
    await context.dispose();
  }
});
/* eslint-enable no-empty-pattern */
