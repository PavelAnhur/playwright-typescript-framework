import dotenv from 'dotenv';
import path from 'path';


dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

export const env = {
  name: process.env['ENV_NAME'] || 'local',
  webURL: process.env['MAISON_URL'] || 'http://localhost:4000',
  apiURL: process.env['MAISON_API_URL'] || 'http://localhost:4000/api/v1',
  testUser: {
    email: process.env['TEST_USER_EMAIL'] || 'buyer@maison.test',
    password: process.env['TEST_USER_PASSWORD'] || 'Password123!',
  },
} as const;
