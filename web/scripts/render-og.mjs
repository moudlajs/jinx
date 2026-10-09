// Renders public/og.png from scripts/og.html: `node scripts/render-og.mjs`.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(new URL('./og.html', import.meta.url).href);
await page.screenshot({ path: new URL('../public/og.png', import.meta.url).pathname });
await browser.close();
