import { ENV } from '@config/env';
import fs from 'fs';
import path from 'path';


export function setupAllure(): void {
  const resultsDir = './allure-results';
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const environment = {
    'Browser': process.env['BROWSER'] || 'Chrome',
    'Base URL': ENV.webURL || 'http://localhost:4000',
    'Node Version': process.version,
    'Platform': process.platform,
    'CI': String(ENV.isCI || false),
    'Test Framework': 'Playwright + TypeScript',
    'Project': 'Maison Test Framework',
    'Author': 'Pavel Anhur',
  };
  const envContent = Object.entries(environment)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(
    path.join(resultsDir, 'environment.properties'),
    envContent
  );
  // Create categories.json for better test classification
  const categories = {
    "categories": [
      {
        "name": "API Test Failures",
        "matchedStatuses": ["failed"],
        "messageRegex": ".*API.*"
      },
      {
        "name": "UI Test Failures",
        "matchedStatuses": ["failed"],
        "messageRegex": ".*UI.*"
      },
      {
        "name": "Authentication Failures",
        "matchedStatuses": ["failed"],
        "messageRegex": ".*auth.*|.*login.*"
      },
      {
        "name": "Network Errors",
        "matchedStatuses": ["failed", "broken"],
        "messageRegex": ".*ECONNREFUSED.*|.*ENOTFOUND.*|.*network.*"
      },
      {
        "name": "Timeout Errors",
        "matchedStatuses": ["broken"],
        "messageRegex": ".*timeout.*"
      }
    ]
  };
  fs.writeFileSync(
    path.join(resultsDir, 'categories.json'),
    JSON.stringify(categories, null, 2)
  );
}

export default setupAllure;
