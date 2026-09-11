import { ENV } from '@config/env';
import { request, type APIRequestContext } from '@playwright/test';
import type { Account } from '@src/types/account';


export class AuthContextManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_RETRY_DELAY_MS = 1000;
  private contexts: Map<string, APIRequestContext> = new Map();
  private tokens: Map<string, string> = new Map();

  async getContext(account: Account): Promise<APIRequestContext> {
    const key = account.email;
    if (this.contexts.has(key)) {
      return this.contexts.get(key)!;
    }
    const context = await this.createContextWithRetry(account);
    this.contexts.set(key, context);
    return context;
  }

  async disposeAll(): Promise<void> {
    for (const [key, context] of this.contexts) {
      try {
        await context.dispose();
      } catch (error) {
        console.error(`Error disposing context for ${key}:`, error);
      }
    }
    this.contexts.clear();
    this.tokens.clear();
  }

  private async createContextWithRetry(
    account: Account,
    maxRetries: number = AuthContextManager.MAX_RETRIES
  ): Promise<APIRequestContext> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createContext(account);
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) break;
        if (this.isRateLimitError(error)) {
          const waitTime = this.backoffDelay(attempt);
          console.log(
            `Rate limited for ${account.email}, attempt ${attempt}/${maxRetries}, waiting ${waitTime}ms...`
          );
          await this.sleep(waitTime);
        } else {
          await this.sleep(this.backoffDelay(attempt));
        }
      }
    }
    throw new Error(
      `Failed to create authenticated context for ${account.email}`,
      { cause: lastError }
    );
  }

  private async createContext(account: Account): Promise<APIRequestContext> {
    const token = await this.resolveToken(account);
    return this.buildAuthedContext(token);
  }

  private async resolveToken(account: Account): Promise<string> {
    const cached = this.tokens.get(account.email);
    if (cached) return cached;

    const token = await this.login(account);
    this.tokens.set(account.email, token);
    return token;
  }

  private async login(account: Account): Promise<string> {
    const tempContext = await request.newContext({
      baseURL: `${ENV.apiURL}/`,
    });
    try {
      const response = await tempContext.post('auth/login', {
        data: { email: account.email, password: account.password },
      });
      if (!response.ok()) {
        throw new LoginError(account.email, response.status());
      }
      const { token } = await response.json();
      if (!token) {
        throw new Error(`No token received for ${account.email}`);
      }
      return token;
    } finally {
      await tempContext.dispose();
    }
  }

  private async buildAuthedContext(token: string): Promise<APIRequestContext> {
    return request.newContext({
      baseURL: `${ENV.apiURL}/`,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private isRateLimitError(error: unknown): boolean {
    return error instanceof LoginError && error.status === 429;
  }

  private backoffDelay(attempt: number): number {
    return AuthContextManager.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class LoginError extends Error {
  constructor(
    public readonly email: string,
    public readonly status: number
  ) {
    super(`Login failed for ${email}: ${status}`);
    this.name = 'LoginError';
  }
}
