import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';


let isEnvLoaded = false;
export function loadEnv(): void {
  if (isEnvLoaded) return;
  const envName = process.env['ENV_NAME'] || 'local';
  const envFile = `.env.${envName}`;
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  isEnvLoaded = true;
}

loadEnv();

export const ENV = {
  name: process.env['ENV_NAME'] || 'local',
  webURL: process.env['MAISON_URL'] || 'http://localhost:4000',
  apiURL: process.env['MAISON_API_URL'] || 'http://localhost:4000/api/v1',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  isCI: !!process.env['CI'],
  isStaging: process.env['ENV_NAME'] === 'staging',
  isProduction: process.env['ENV_NAME'] === 'production',
  testUsers: [
    {
      testBuyer: {
        email: process.env['TEST_BUYER_EMAIL'] || 'buyer@maison.test',
        password: process.env['TEST_BUYER_PASSWORD'] || 'Password123!',
      }
    },
    {
      testSeller1: {
        email: process.env['TEST_SELLER1_EMAIL'] || 'seller@maison.test',
        password: process.env['TEST_SELLER1_PASSWORD'] || 'Password123!',
      },
    },
    {
      testSeller2: {
        email: process.env['TEST_SELLER2_EMAIL'] || 'seller2@maison.test',
        password: process.env['TEST_SELLER2_PASSWORD'] || 'Password123!',
      }
    }
  ],
} as const;

export function getTestUser(role: 'buyer' | 'seller1' | 'seller2') {
  const userMap = {
    buyer: ENV.testUsers[0].testBuyer,
    seller1: ENV.testUsers[1].testSeller1,
    seller2: ENV.testUsers[2].testSeller2,
  };
  return userMap[role];
}
