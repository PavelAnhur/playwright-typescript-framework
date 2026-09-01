import { expect, mergeTests } from "@playwright/test";
import { test as apiTest } from './api.fuxture';
import { test as authTest } from './auth.fixture';
import { test as csvTest } from './csv.fixture';
import { test as pageTest } from './pages.fixture';
import { test as authBrowserTest } from './auth.browser.fixture';
import { ENV } from '@config/env';


export const test = mergeTests(pageTest, csvTest, apiTest, authTest, authBrowserTest);

export { expect, ENV };
