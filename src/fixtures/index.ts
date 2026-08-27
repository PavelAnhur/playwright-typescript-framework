import { expect, mergeTests } from "@playwright/test";
import { test as pageTest } from './pages.fixture';


export const test = mergeTests(pageTest);

export { expect };
