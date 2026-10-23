import { test as base } from '@playwright/test';

// Every test blocks the analytics beacon so runs never count as visits.
export const test = base.extend<{ noBeacon: undefined }>({
  noBeacon: [
    async ({ page }, use) => {
      await page.route(/cloudflareinsights\.com/, (route) => route.abort());
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
