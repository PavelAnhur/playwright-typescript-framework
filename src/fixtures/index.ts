import { expect, mergeTests } from "@playwright/test";
import { test as pageTest } from './pages.fixture';
import { test as csvTest } from './csv.fixture';


export const test = mergeTests(pageTest, csvTest);

export { expect };
