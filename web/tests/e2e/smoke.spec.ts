import { expect, test } from '@playwright/test';

const statText = (page: import('@playwright/test').Page) => page.locator('#stat-text');

test('page loads with a quote and the generate button', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/jinx/);
  await expect(page.locator('#quote-text')).not.toBeEmpty();
  await expect(page.locator('#quote-author')).toHaveText(/^— \S/);
  await expect(page.locator('#card')).toBeHidden();
});

test('generate renders a stat with the satire badge and a seed link', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Generate a cursed stat' }).click();
  await expect(statText(page)).not.toBeEmpty();
  await expect(page.locator('#card-badge')).toBeVisible();
  await expect(page.locator('#card-badge')).toContainText('Satire');
  await expect(page.locator('#hero')).toBeHidden();
  await expect(page).toHaveURL(/#[0-9a-z]{1,7}$/);
});

test('"Another one" and Space change the stat', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Generate a cursed stat' }).click();
  const first = await statText(page).textContent();
  await page.getByRole('button', { name: 'Another one' }).click();
  await expect(statText(page)).not.toHaveText(first ?? '');

  const second = await statText(page).textContent();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Space');
  await expect(statText(page)).not.toHaveText(second ?? '');
});

test('copy puts the stat, satire label and seed link on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./#abc12');
  const text = (await statText(page).textContent()) ?? '';
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('status')).toContainText('Copied');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain(text);
  expect(clip).toContain('SATIRE');
  expect(clip).toMatch(/\/jinx\/#abc12$/);
});

test('a new stat clears the "Copied" message', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./#abc12');
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('status')).toContainText('Copied');
  await page.getByRole('button', { name: 'Another one' }).click();
  await expect(page.getByRole('status')).toBeEmpty();
});

test('a seed link reproduces the stat, in a fresh page too', async ({ page, browser }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Generate a cursed stat' }).click();
  const text = await statText(page).textContent();
  const url = page.url();

  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.locator('#stat-text')).toHaveText(text ?? '');
  await other.close();
});

test('a bad hash is ignored', async ({ page }) => {
  await page.goto('./#<img src=x onerror=alert(1)>');
  await expect(page.locator('#card')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Generate a cursed stat' })).toBeVisible();
});

test('theme toggle switches and remembers', async ({ page }) => {
  await page.goto('./');
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('#theme-toggle').click();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(before);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
});

test('no horizontal scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./#abc12');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
