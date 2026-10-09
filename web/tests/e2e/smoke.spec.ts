import { expect, test } from '@playwright/test';

test('quote shows, generate renders a satire stat', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#quote-text')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Generate a cursed stat' }).click();
  await expect(page.locator('#stat-text')).not.toBeEmpty();
  await expect(page.locator('#card-badge')).toContainText('Satire');
  await expect(page).toHaveURL(/#[0-9a-z]{1,7}$/);
});

test('a seed link renders that stat', async ({ page }) => {
  await page.goto('./#abc12');
  const text = await page.locator('#stat-text').textContent();
  await page.goto('./');
  await page.goto('./#abc12');
  await expect(page.locator('#stat-text')).toHaveText(text ?? '');
});

test('copy puts the stat, satire label and seed link on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./#abc12');
  const text = (await page.locator('#stat-text').textContent()) ?? '';
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('status')).toContainText('Copied');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain(text);
  expect(clip).toContain('SATIRE');
  expect(clip).toMatch(/\/jinx\/#abc12$/);
});
