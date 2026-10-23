import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// The card no longer says what it is while face down, so tests tell by its text.
const realTexts = new Set(
  (JSON.parse(readFileSync('tests/fixtures/stats.json', 'utf8')) as { stats: { text: string }[] }).stats.map((s) => s.text),
);
const truth = async (page: Page) => (realTexts.has((await page.locator('#stat-text').textContent()) ?? '') ? 'real' : 'fake');

test.beforeEach(async ({ page }) => {
  await page.route('**/stats.json', (route) => route.fulfill({ path: 'tests/fixtures/stats.json' }));
});

const badge = (page: Page) => page.locator('#card-badge');

test('Fake or Real: the card is face down until you call it', async ({ page }) => {
  await page.goto('./#abc12');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await page.getByRole('radio', { name: 'Fake or Real' }).check();
  await expect(badge(page)).toContainText('Fake or real?');
  await expect(page.locator('#card-code')).toHaveText('No. ??????');
  await expect(page.locator('#stat-punchline')).toBeHidden();
  await expect(page.locator('#turn')).toBeHidden();
  await expect(page.locator('#card-actions')).toBeHidden();
  await expect(page).not.toHaveURL(/#/);

  await expect(page.locator('#card')).not.toHaveAttribute('data-mode');
  await expect(page.locator('#back-badge')).toBeEmpty();
  await expect(page.locator('#back-title')).toBeEmpty();
  const mode = await truth(page);
  await page.getByRole('button', { name: 'Real', exact: true }).click();
  await expect(page.locator('#card')).toHaveAttribute('data-mode', mode);
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
  await page.getByRole('radio', { name: 'Fake or Real' }).check();
  for (let i = 0; i < 3; i++) {
    await expect(badge(page)).toContainText('Fake or real?');
    const mode = await truth(page);
    await page.getByRole('button', { name: mode === 'real' ? 'Real' : 'Fake', exact: true }).click();
    await expect(page.locator('#verdict-title')).toHaveText('Called it.');
    if (i < 2) await page.getByRole('button', { name: 'Next card' }).click();
  }
  await expect(page.locator('#scoreline')).toHaveText('Streak 3 · Best 3 · 3 of 3 right');
  await page.reload();
  await page.getByRole('radio', { name: /^Play/ }).check();
  await page.getByRole('radio', { name: 'Fake or Real' }).check();
  await expect(page.locator('#scoreline')).toHaveText('Streak 0 · Best 3 · 0 of 0 right');
});

test('leaving Play deals a normal card again', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(badge(page)).toContainText('Fake or real?');
  await page.getByRole('radio', { name: /^Fake(?! or)/ }).check();
  await expect(badge(page)).toContainText('Satire');
  await expect(page.locator('#card-actions')).toBeVisible();
  await expect(page.locator('#play-top')).toBeHidden();
  await expect(page.locator('#game-actions')).toBeHidden();
  await expect(page).toHaveURL(/#[0-9a-z]{1,7}$/);
});

test('wide screens show the score in the right rail', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(page.getByRole('region', { name: 'Daily Five' })).toBeVisible();
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

test('Daily Five: five cards, then a row to share, and the same result on reload', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(page.getByRole('radio', { name: 'Daily Five' })).toBeChecked();
  const seen: string[] = [];
  for (let i = 0; i < 5; i++) {
    await expect(badge(page)).toContainText('Fake or real?');
    seen.push((await page.locator('#stat-text').textContent()) ?? '');
    await page.getByRole('button', { name: 'Fake', exact: true }).click();
    await expect(page.locator('#progress .step:not(.on):not(.off)')).toHaveCount(4 - i);
    await page.getByRole('button', { name: i === 4 ? 'See my row' : 'Next card' }).click();
  }
  await expect(page.locator('#daily-end')).toBeVisible();
  await expect(page.locator('#end-big')).toHaveText(/^[0-5]\/5$/);
  await expect(page.locator('#end-squares > *')).toHaveCount(5);
  await page.getByRole('button', { name: 'Copy' }).click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toMatch(/^jinx Daily Five No\. \d+: [0-5]\/5\n[🟨⬛]{5}\n/u);
  for (const text of seen) expect(clip).not.toContain(text);

  await page.reload();
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(page.getByRole('radio', { name: 'Fake or Real' })).toBeChecked();
  await page.getByRole('radio', { name: 'Daily Five' }).check();
  await expect(page.locator('#daily-end')).toBeVisible();
});

test('Daily Five is the same five in a fresh browser', async ({ page, browser }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(badge(page)).toContainText('Fake or real?');
  const first = await page.locator('#stat-text').textContent();
  const other = await browser.newPage();
  await other.route('**/stats.json', (route) => route.fulfill({ path: 'tests/fixtures/stats.json' }));
  await other.goto('./');
  await other.getByRole('radio', { name: /^Play/ }).check();
  await expect(other.locator('#stat-text')).toHaveText(first ?? '');
  await other.close();
});
