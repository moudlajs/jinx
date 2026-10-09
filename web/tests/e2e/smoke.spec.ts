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
