import { getTestUser } from '@config/env';
import { HomePage } from '@pages/HomePage';
import { LoginPage } from '@pages/LoginPage';
import { test as base, type Browser, type BrowserContext } from '@playwright/test';
import { error } from 'console';
import fs from 'fs';
import path from 'path';

export interface AuthBrowserFixtures {
  buyerHomePage: HomePage;
  sellerHomePage: HomePage;
}

const buyer = getTestUser('buyer');
const seller1 = getTestUser('seller1');

const STORAGE_DIR = path.resolve(process.cwd(), '.auth');
const BUYER_STORAGE = path.join(STORAGE_DIR, 'buyer.json');
const SELLER_STORAGE = path.join(STORAGE_DIR, 'seller.json');

export const test = base.extend<AuthBrowserFixtures>({
  buyerHomePage: async ({ browser }, use) => {
    const buyerContext = await createAuthenticatedContext(
      browser,
      buyer.email,
      buyer.password,
      BUYER_STORAGE
    );
    const buyerPage = await buyerContext.newPage();
    const homePage = new HomePage(buyerPage);
    await homePage.open();
    await homePage.waitForLoad();
    await use(homePage);
    await buyerContext.close();
  },

  sellerHomePage: async ({ browser }, use) => {
    const sellerContext = await createAuthenticatedContext(
      browser,
      seller1.email,
      seller1.password,
      SELLER_STORAGE
    );
    const sellerPage = await sellerContext.newPage();
    const homePage = new HomePage(sellerPage);
    await homePage.open();
    await homePage.waitForLoad();
    await use(homePage);
    await sellerContext.close();
  },
});

/**
 * Creates an authenticated browser context for a user using storage state
 */
async function createAuthenticatedContext(
  browser: Browser,
  email: string,
  password: string,
  storagePath: string
): Promise<BrowserContext> {
  ensureStorageDir();
  const hasStorage = fs.existsSync(storagePath);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: hasStorage ? storagePath : undefined,
  });
  if (!hasStorage) {
    const page = await context.newPage();
    try {
      const loginPage = new LoginPage(page);
      await loginPage.open();
      await loginPage.waitForLoad();
      await loginPage.login(email, password);
      await loginPage.waitForLoginSuccess();

      const homePage = new HomePage(page);
      await homePage.waitForLoad();
      const isLoggedIn = await homePage.isUserLoggedIn();
      if (!isLoggedIn) {
        throw new Error(`Login verification failed for ${email}`, { cause: error });
      }
      // Save storage state for future use
      await context.storageState({ path: storagePath });
      await page.close();
    } catch (error) {
      await context.close();
      throw new Error(`Failed to authenticate ${email}`, { cause: error });
    }
  }
  return context;
}

/**
 * Ensures the storage directory exists
 */
function ensureStorageDir(): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  } catch (error) {
    throw new Error(
      `Failed to create storage directory at ${STORAGE_DIR}`, { cause: error });
  }
}
