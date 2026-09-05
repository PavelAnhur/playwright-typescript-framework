import { ENV } from '@config/env';
import { expect, mergeTests } from "@playwright/test";
import { test as apiTest } from './api.fuxture';
import { test as authBrowserTest } from './auth.browser.fixture';
import { test as authTest } from './auth.fixture';
import { test as csvTest } from './csv.fixture';
import { test as orderTest } from './order.fixture';
import { test as pageTest } from './pages.fixture';


export const test = mergeTests(pageTest, csvTest, apiTest, authTest, authBrowserTest, orderTest);

export { ENV, expect };

