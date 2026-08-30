import { expect, mergeTests } from "@playwright/test";
import { test as pageTest } from './pages.fixture';
import { test as csvTest } from './csv.fixture';
import { test as apiTest } from './api.fuxture';


export const test = mergeTests(pageTest, csvTest, apiTest);

export { expect };
