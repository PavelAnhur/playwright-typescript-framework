import { ENV } from '@config/env';
import { expect, mergeTests, request } from '@playwright/test';
import { test as apiTest } from './api.fixture';
import { test as authBrowserTest } from './auth.browser.fixture';
import { test as authTest } from './auth.fixture';
import { test as csvTest } from './csv.fixture';
import { test as orderTest } from './order.fixture';
import { test as pageTest } from './pages.fixture';
import { test as productTest } from './product.fixture';

export const test = mergeTests(
  pageTest,
  csvTest,
  apiTest,
  authTest,
  authBrowserTest,
  orderTest,
  productTest
);

export { ENV, expect, request };
