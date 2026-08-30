import { HomePage } from "../pages/HomePage";
import { test as base } from "@playwright/test";

export interface PageFixtures {
  homePage: HomePage;
}

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
})