import { HomePage } from "@pages/HomePage";
import { LoginPage } from "@pages/LoginPage";
import { test as base } from "@playwright/test";

export interface PageFixtures {
  homePage: HomePage;
  loginPage: LoginPage
}

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
})