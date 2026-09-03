import { getTestUser } from '@config/env';
import { HomePage } from '@pages/HomePage';
import { LoginPage } from '@pages/LoginPage';
import { test as base, type Browser } from '@playwright/test';
import type { Account } from '@src/types/account';
import type { StorageState } from '@src/types/storage-state';
import { readJsonFile } from '@utils/file-utils';
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
    const shouldRefresh = await shouldRefreshStorageState(buyer, BUYER_STORAGE);
    if (shouldRefresh) {
      await createStorageState(browser, buyer, BUYER_STORAGE);
    } else {
      await ensureStorageExists(browser, buyer, BUYER_STORAGE);
    }
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
    const shouldRefresh = await shouldRefreshStorageState(seller1, SELLER_STORAGE);
    if (shouldRefresh) {
      await createStorageState(browser, seller1, SELLER_STORAGE);
    } else {
      await ensureStorageExists(browser, seller1, SELLER_STORAGE);
    }
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

/**
 * Checks if a storage state needs to be refreshed
 * Returns true if:
 * - File doesn't exist
 * - Token is expired or about to expire (within 5 minutes)
 */
async function shouldRefreshStorageState(account: Account, storagePath: string): Promise<boolean> {
  if (!fs.existsSync(storagePath)) {
    console.log(`📁 Storage file not found for ${account.email}, will create new one`);
    return true;
  }
  try {
    const storageData = readJsonFile<StorageState>(storagePath);
    const tokenCookie = storageData.cookies?.find(c => c.name === 'maison_token');
    if (!tokenCookie) {
      console.log(`⚠️ No token found in storage for ${account.email}, will refresh`);
      return true;
    }
    const now = Date.now() / 1000; // Current time in seconds
    const expires = tokenCookie.expires;
    const fiveMinutesFromNow = now + 300; // 5 minutes in seconds
    if (expires <= now) {
      console.log(`⚠️ Token expired for ${account.email}, will refresh`);
      return true;
    }
    if (expires <= fiveMinutesFromNow) {
      console.log(`⚠️ Token expiring soon for ${account.email} (${Math.round((expires - now) / 60)} min), will refresh`);
      return true;
    }
    console.log(`✅ Token valid for ${account.email} (expires in ${Math.round((expires - now) / 60)} min)`);
    return false;
  } catch (error) {
    console.error(`⚠️ Error reading storage file for ${account.email}, will refresh:`, { cause: error });
    return true;
  }
}

/**
 * Creates a storage state for a single user
 */
async function createStorageState(
  browser: Browser,
  account: Account,
  storagePath: string,
): Promise<void> {
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
      throw new Error(`Login verification failed for ${account.email}`);
    }
    await context.storageState({ path: storagePath });
    console.log(`✅ Storage state created for ${account.email} at ${storagePath}`);
    await page.close();
  } catch (error) {
    await context.close();
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create storage state for ${account.email}: ${errorMessage}`);
  }
  await context.close();
}

/**
 * Ensures the storage directory exists
 */
function ensureStorageDir(): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
      console.log(`📁 Created storage directory: ${STORAGE_DIR}`);
    }
  } catch (error) {
    throw new Error(`Failed to create storage directory at ${STORAGE_DIR}: `, { cause: error });
  }
}

/**
 * Ensures storage exists, creates it if needed
 */
async function ensureStorageExists(
  browser: Browser,
  account: Account,
  storagePath: string
): Promise<void> {
  if (!fs.existsSync(storagePath)) {
    await createStorageState(browser, account, storagePath);
  }
}

/**
 * Cleans up a storage file if it exists
 */
function cleanupStorageFile(file: string): void {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`🗑️ Removed existing storage file: ${path.basename(file)}`);
    } catch (error) {
      console.warn(`⚠️ Failed to remove ${path.basename(file)}:`, { cause: error });
    }
  }
}
