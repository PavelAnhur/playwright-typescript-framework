import { HomePage } from "@pages/HomePage";
import { LoginPage } from "@pages/LoginPage";
import { RegisterPage } from "@pages/RegisterPage";
import { test as base } from "@playwright/test";


export interface PageFixtures {
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
}

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
});
