import { type Page, type TestInfo } from '@playwright/test';
import * as allure from "allure-js-commons";
import fs from 'fs';
import path from 'path';


/**
 * Add test-specific environment variables
 * This appends test-specific info to the existing environment.properties
 */
export function addAllureEnvironment(info: TestInfo): void {
  const allureResultsDir = './allure-results';
  if (!fs.existsSync(allureResultsDir)) {
    fs.mkdirSync(allureResultsDir, { recursive: true });
  }
  const envPath = path.join(allureResultsDir, 'environment.properties');
  let existingEnv: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    existingEnv = Object.fromEntries(
      content.split('\n')
        .filter(line => line.includes('='))
        .map(line => {
          const [key, ...values] = line.split('=');
          return [key?.trim(), values.join('=').trim()];
        })
    );
  }
  // Add test-specific environment variables
  const testEnv = {
    ...existingEnv,
    'Test File': info.file,
    'Test Title': info.title,
    'Test ID': info.testId || 'N/A',
    'Test Retry': String(info.retry),
    'Worker Index': String(info.workerIndex),
    'Parallel Index': String(info.parallelIndex),
    'Current Timestamp': new Date().toISOString(),
  };
  const envContent = Object.entries(testEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(envPath, envContent);
}

/**
 * Add test metadata to Allure using annotations
 * These will appear in the Allure report
 */
export function addAllureMetadata(options: {
  epic?: string;
  feature?: string;
  story?: string;
  severity?: allure.Severity;
}): void {
  const { epic, feature, story, severity } = options;
  if (epic) allure.epic(epic);
  if (feature) allure.feature(feature);
  if (story) allure.story(story);
  if (severity) allure.severity(severity);
}

export async function addScreenshotOnFailure(page: Page): Promise<void> {
  const screenshot = await page.screenshot();
  await addAllureAttachment('Screenshot', screenshot, allure.ContentType.PNG);
}

export async function addAllureJson(
  name: string,
  data: Record<string, unknown>
): Promise<void> {
  await addAllureAttachment(
    name,
    JSON.stringify(data, null, 2),
    allure.ContentType.JSON
  );
}

export async function addAllureText(name: string, text: string): Promise<void> {
  await addAllureAttachment(name, text, allure.ContentType.TEXT);
}

export async function addAllureHtml(name: string, html: string): Promise<void> {
  await addAllureAttachment(name, html, allure.ContentType.HTML);
}

export async function addAllureAttachment(
  name: string,
  content: string | Buffer,
  type: allure.ContentType
): Promise<void> {
  await allure.attachment(name, content, type);
}
