import { test as base } from '@playwright/test';

export interface MockResponseOptions {
  status?: number;
  contentType?: string;
}

export interface NetworkFixture {
  network: {
    mock: (url: string | RegExp, body: unknown, options?: MockResponseOptions) => Promise<void>;
    wasHit: (url: string | RegExp) => boolean;
  };
}

const sameUrl = (a: string | RegExp, b: string | RegExp): boolean => {
  if (typeof a === 'string' || typeof b === 'string') {
    return a === b;
  }
  return a.source === b.source && a.flags === b.flags;
};

export const test = base.extend<NetworkFixture>({
  network: async ({ page }, use) => {
    const registrations: Array<{ url: string | RegExp; hit: boolean }> = [];
    const mock = async (
      url: string | RegExp,
      body: unknown,
      options: MockResponseOptions = {}
    ): Promise<void> => {
      const { status = 200, contentType = 'application/json' } = options;
      const registration = { url, hit: false };
      registrations.push(registration);
      await page.route(url, async route => {
        registration.hit = true;
        await route.fulfill({
          status,
          contentType,
          body: JSON.stringify(body),
        });
      });
    };
    const wasHit = (url: string | RegExp): boolean => {
      const registration = registrations.find(r => sameUrl(r.url, url));
      return registration ? registration.hit : false;
    };
    await use({ mock, wasHit });
  },
});
