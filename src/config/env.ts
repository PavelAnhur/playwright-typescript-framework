import dotenv from 'dotenv';
import path from 'path';


dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

export const ENV = {
  name: process.env['ENV_NAME'] || 'local',
  webURL: process.env['MAISON_URL'] || 'http://localhost:4000',
  apiURL: process.env['MAISON_API_URL'] || 'http://localhost:4000/api/v1',
  testUser: {
    email: process.env['TEST_USER_EMAIL'] || 'buyer@maison.test',
    password: process.env['TEST_USER_PASSWORD'] || 'Password123!',
  },
  nodeEnv: process.env['NODE_ENV'] || 'development',
  isCI: !!process.env['CI'],
  isStaging: process.env['ENV_NAME'] === 'staging',
  isProduction: process.env['ENV_NAME'] === 'production',
} as const;

export function isEnvironment(env: 'local' | 'staging' | 'production' | 'ci'): boolean {
  return ENV.name === env;
}
