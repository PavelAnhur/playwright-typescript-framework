import { ENV } from '@config/env';
import { TIMEOUTS } from '@config/timeouts';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/specs',
  fullyParallel: true,
  forbidOnly: ENV.isCI,
  retries: ENV.isCI ? 2 : 0,
  workers: ENV.isCI ? 2 : undefined,
  timeout: TIMEOUTS.DOM_CONTENT_LOADED,
  expect: { timeout: TIMEOUTS.LONG },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    [
      'allure-playwright',
      {
        outputFolder: 'allure-results',
        details: true,
        suiteTitle: true,
      },
    ],
    [
      './reporters/ai-triage-reporter.ts',
      {
        enableFlakeDetection: true,
        maxFlakeDetections: 3,
      },
    ],
  ],
  globalSetup: './src/setup/global-setup.ts',
  use: {
    baseURL: ENV.isCI ? 'http://localhost:4000' : ENV.webURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'ui',
      testDir: './tests/specs/ui',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testDir: './tests/specs/api',
    },
    {
      name: 'review',
      testDir: './tests/specs/review',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7a'] },
    },
  ],
});
