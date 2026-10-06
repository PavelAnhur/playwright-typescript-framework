import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

interface ValidatedEnvironment {
  ENV_NAME: string;
  NODE_ENV: string;
  CI?: boolean;
  MAISON_URL: string;
  MAISON_API_URL: string;
  TEST_BUYER_EMAIL: string;
  TEST_BUYER_PASSWORD: string;
  TEST_SELLER1_EMAIL: string;
  TEST_SELLER1_PASSWORD: string;
  TEST_SELLER2_EMAIL: string;
  TEST_SELLER2_PASSWORD: string;
  DSH_BASE_URL?: string;
  DSH_MODEL?: string;
  DSH_API_KEY?: string;
}

class Environment {
  private static instance: Environment;
  private envVars: Record<string, string | undefined> = {};
  private validatedConfig: ValidatedEnvironment | null = null;

  private constructor() {
    this.loadEnvironment();
    this.validate();
  }

  static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment();
    }
    return Environment.instance;
  }

  private loadEnvironment(): void {
    const cwd = process.cwd();
    const envFiles = ['.env.local', `.env.${process.env['ENV_NAME'] || 'local'}`, '.env'];
    for (const envFile of envFiles) {
      const envPath = path.resolve(cwd, envFile);
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
        console.log(`Loaded environment from: ${envFile}`);
      }
    }
    this.envVars = { ...process.env };
  }

  private validate(): void {
    const EnvironmentSchema = z.object({
      ENV_NAME: z.enum(['local', 'staging', 'production']).default('local'),
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      CI: z
        .string()
        .optional()
        .transform(val => val === 'true' || val === '1'),
      MAISON_URL: z.string().url().default('http://localhost:4000'),
      MAISON_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
      TEST_BUYER_EMAIL: z.string().email().default('buyer@maison.test'),
      TEST_BUYER_PASSWORD: z.string().min(1).default('Password123!'),
      TEST_SELLER1_EMAIL: z.string().email().default('seller@maison.test'),
      TEST_SELLER1_PASSWORD: z.string().min(1).default('Password123!'),
      TEST_SELLER2_EMAIL: z.string().email().default('seller2@maison.test'),
      TEST_SELLER2_PASSWORD: z.string().min(1).default('Password123!'),
      DSH_BASE_URL: z.string().url().optional(),
      DSH_MODEL: z.string().optional(),
      DSH_API_KEY: z.string().optional(),
    });
    try {
      this.validatedConfig = EnvironmentSchema.parse(this.envVars);
    } catch (error) {
      console.error('Environment validation failed:', error);
      throw new Error('Environment validation failed. Please check your .env files.', {
        cause: error,
      });
    }
  }

  get name(): string {
    if (!this.validatedConfig) {
      throw new Error('Environment not initialized');
    }
    return this.validatedConfig.ENV_NAME;
  }

  get nodeEnv(): string {
    if (!this.validatedConfig) {
      throw new Error('Environment not initialized');
    }
    return this.validatedConfig.NODE_ENV;
  }

  get isCI(): boolean {
    if (!this.validatedConfig) {
      throw new Error('Environment not initialized');
    }
    return !!this.validatedConfig.CI;
  }

  get isStaging(): boolean {
    return this.name === 'staging';
  }

  get isProduction(): boolean {
    return this.name === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get webURL(): string {
    if (!this.validatedConfig) {
      throw new Error('Environment not initialized');
    }
    return this.validatedConfig.MAISON_URL;
  }

  get apiURL(): string {
    if (!this.validatedConfig) {
      throw new Error('Environment not initialized');
    }
    return this.validatedConfig.MAISON_API_URL;
  }

  get testUsers() {
    if (!this.validatedConfig) {
      throw new Error('Environment not initialized');
    }
    return {
      testBuyer: {
        email: this.validatedConfig.TEST_BUYER_EMAIL,
        password: this.validatedConfig.TEST_BUYER_PASSWORD,
      },
      testSeller1: {
        email: this.validatedConfig.TEST_SELLER1_EMAIL,
        password: this.validatedConfig.TEST_SELLER1_PASSWORD,
      },
      testSeller2: {
        email: this.validatedConfig.TEST_SELLER2_EMAIL,
        password: this.validatedConfig.TEST_SELLER2_PASSWORD,
      },
    };
  }

  get aiConfig() {
    if (!this.validatedConfig) {
      throw new Error('Environment not initialized');
    }
    return {
      baseUrl: this.validatedConfig.DSH_BASE_URL,
      model: this.validatedConfig.DSH_MODEL,
      apiKey: this.validatedConfig.DSH_API_KEY,
      projectRoot: process.cwd(),
      logsDir: path.resolve(process.cwd(), 'logs', 'ai'),
      requirementsDir: path.resolve(process.cwd(), 'fixtures', 'requirements'),
      generatedCasesDir: path.resolve(process.cwd(), 'generated-cases'),
    };
  }

  getTestUser(role: 'buyer' | 'seller1' | 'seller2') {
    const userMap = {
      buyer: this.testUsers.testBuyer,
      seller1: this.testUsers.testSeller1,
      seller2: this.testUsers.testSeller2,
    };
    return userMap[role];
  }

  get(key: string): string | undefined {
    return this.envVars[key];
  }

  get hasAiConfig(): boolean {
    if (!this.validatedConfig) {
      throw new Error('Environment not initialized');
    }
    return !!(
      this.validatedConfig.DSH_BASE_URL &&
      this.validatedConfig.DSH_MODEL &&
      this.validatedConfig.DSH_API_KEY
    );
  }

  validateAiConfig(): void {
    if (!this.hasAiConfig) {
      throw new Error(
        'AI configuration is missing. Please set DSH_BASE_URL, DSH_MODEL, and DSH_API_KEY in your environment.'
      );
    }
  }
}

const environment = Environment.getInstance();

export default environment;

export const ENV = {
  name: environment.name,
  webURL: environment.webURL,
  apiURL: environment.apiURL,
  nodeEnv: environment.nodeEnv,
  isCI: environment.isCI,
  isStaging: environment.isStaging,
  isProduction: environment.isProduction,
  isDevelopment: environment.isDevelopment,
  testUsers: environment.testUsers,
  getTestUser: environment.getTestUser.bind(environment),
  aiConfig: environment.aiConfig,
  hasAiConfig: environment.hasAiConfig,
} as const;

export { environment };
