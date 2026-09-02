import { getTestUser } from '@config/env';
import { HomePage } from '@pages/HomePage';
import { LoginPage } from '@pages/LoginPage';
import { test as base, type Browser } from '@playwright/test';
import type { Account } from '@src/types/account';
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
    await createStorageState(browser, buyer, BUYER_STORAGE);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      storageState: BUYER_STORAGE,
    });
    const page = await context.newPage();
    const homePage = new HomePage(page);
    await homePage.open();
    await use(homePage);
    await context.close();
  },

  sellerHomePage: async ({ browser }, use) => {
    await createStorageState(browser, seller1, SELLER_STORAGE);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      storageState: SELLER_STORAGE,
    });
    const page = await context.newPage();
    const homePage = new HomePage(page);
    await homePage.open();
    await use(homePage);
    await context.close();
  },
});

let storageStateCreated = false;

async function createStorageState(
  browser: Browser,
  account: Account,
  storagePath: string,
): Promise<void> {
  if (storageStateCreated) return;
  ensureStorageDir();
  cleanupStorageFile(storagePath);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  try {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(account.email, account.password);
    await loginPage.waitForLoginSuccess();
    const homePage = new HomePage(page);
    await homePage.waitForLoad();
    const isLoggedIn = await homePage.isUserLoggedIn();
    if (!isLoggedIn) {
      throw new Error(`Login verification failed for ${account.email}`, { cause: error });
    }
    await context.storageState({ path: storagePath });
    await page.close();
  } catch (error) {
    await context.close();
    throw new Error(`Failed to create storage state for ${account.email}`, { cause: error });
  }
  await context.close();
  storageStateCreated = true;
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
    throw new Error(`Failed to create storage directory at ${STORAGE_DIR}`, { cause: error });
  }
}

function cleanupStorageFile(file: string): void {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
    } catch (error) {
      console.warn(`⚠️ Failed to remove ${path.basename(file)}: `, { cause: error });
    }
  }
}
