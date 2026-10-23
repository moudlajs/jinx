import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/stats.json', (route) => route.fulfill({ path: 'tests/fixtures/stats.json' }));
});

const badge = (page: import('@playwright/test').Page) => page.locator('#card-badge');

test('Fake or Real: the card is face down until you call it', async ({ page }) => {
  await page.goto('./#abc12');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(badge(page)).toContainText('Fake or real?');
  await expect(page.locator('#card-code')).toHaveText('No. ??????');
  await expect(page.locator('#stat-punchline')).toBeHidden();
  await expect(page.locator('#turn')).toBeHidden();
  await expect(page.locator('#card-actions')).toBeHidden();
  await expect(page).not.toHaveURL(/#/);

  const mode = await page.locator('#card').getAttribute('data-mode');
  await page.getByRole('button', { name: 'Real', exact: true }).click();
  await expect(badge(page)).toContainText(mode === 'real' ? 'Real data' : 'Satire');
  await expect(page.locator('#verdict-title')).toHaveText(mode === 'real' ? 'Called it.' : 'Fooled you.');
  await expect(page.locator('#turn')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next card' })).toBeFocused();

  await page.getByRole('button', { name: 'Next card' }).click();
  await expect(badge(page)).toContainText('Fake or real?');
  await expect(page.getByRole('button', { name: 'Fake', exact: true })).toBeFocused();
});

test('a right call grows the streak and the best is kept on reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).check();
  for (let i = 0; i < 3; i++) {
    await expect(badge(page)).toContainText('Fake or real?');
    const mode = await page.locator('#card').getAttribute('data-mode');
    await page.getByRole('button', { name: mode === 'real' ? 'Real' : 'Fake', exact: true }).click();
    await expect(page.locator('#verdict-title')).toHaveText('Called it.');
    if (i < 2) await page.getByRole('button', { name: 'Next card' }).click();
  }
  await expect(page.locator('#scoreline')).toHaveText('Streak 3 · Best 3 · 3 of 3 right');
  await page.reload();
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(page.locator('#scoreline')).toHaveText('Streak 0 · Best 3 · 0 of 0 right');
});

test('leaving Play deals a normal card again', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(badge(page)).toContainText('Fake or real?');
  await page.getByRole('radio', { name: 'Fake' }).check();
  await expect(badge(page)).toContainText('Satire');
  await expect(page.locator('#card-actions')).toBeVisible();
  await expect(page.locator('#game-actions')).toBeHidden();
  await expect(page).toHaveURL(/#[0-9a-z]{1,7}$/);
});

test('wide screens show the score in the right rail', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(page.getByRole('region', { name: 'Streak' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'This visit' })).toBeHidden();
  await expect(page.locator('#scoreline')).toBeHidden();
});

test('Play falls back to Fake if stats.json fails', async ({ page }) => {
  await page.unroute('**/stats.json');
  await page.route('**/stats.json', (route) => route.fulfill({ status: 404 }));
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).click();
  await expect(page.getByRole('status')).toContainText('the game needs them');
  await expect(page.getByRole('radio', { name: 'Fake' })).toBeChecked();
  await expect(badge(page)).toContainText('Satire');
});
