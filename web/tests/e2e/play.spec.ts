import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/stats.json', (route) => route.fulfill({ path: 'tests/fixtures/stats.json' }));
});

// The card no longer says what it is while face down, so tests tell by its text.
const realTexts = new Set(
  (JSON.parse(readFileSync('tests/fixtures/stats.json', 'utf8')) as { stats: { text: string }[] }).stats.map((s) => s.text),
);
const truth = async (page: Page) => (realTexts.has((await page.locator('#stat-text').textContent()) ?? '') ? 'real' : 'fake');
const badge = (page: Page) => page.locator('#card-badge');

async function openGame(page: Page, game: 'daily' | 'guess' | 'overunder'): Promise<void> {
  await page.getByRole('radio', { name: /^Play/ }).check();
  await page.locator(`.menu-game[data-game="${game}"]`).click();
  await expect(page).toHaveURL(new RegExp(`#play-${game}$`));
}

test('entering Play shows the three games and where you stand', async ({ page }) => {
  await page.goto('./#abc12');
  await page.getByRole('radio', { name: /^Play/ }).check();
  const menu = page.getByRole('region', { name: 'Pick a game' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button')).toHaveCount(3);
  await expect(menu.locator('.menu-name')).toHaveText(['Daily Five', 'Fake or Real', 'Over / Under']);
  await expect(page.locator('#menu-status-daily')).toHaveText(/^No\. \d+ · not played yet$/);
  await expect(page.locator('#card')).toBeHidden();
  await expect(page.locator('#play-top')).toBeHidden();
  await expect(page).not.toHaveURL(/#/);
});

test('Fake or Real: the card is face down until you call it', async ({ page }) => {
  await page.goto('./#abc12');
  await openGame(page, 'guess');
  await expect(badge(page)).toContainText('Fake or real?');
  await expect(page.locator('#card-code')).toHaveText('No. ??????');
  await expect(page.locator('#stat-punchline')).toBeHidden();
  await expect(page.locator('#turn')).toBeHidden();
  await expect(page.locator('#card-actions')).toBeHidden();
  await expect(page.locator('#card')).not.toHaveAttribute('data-mode');
  await expect(page.locator('#back-badge')).toBeEmpty();
  await expect(page.locator('#back-title')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Fake', exact: true })).toBeFocused();

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
  await openGame(page, 'guess');
  for (let i = 0; i < 3; i++) {
    await expect(badge(page)).toContainText('Fake or real?');
    const mode = await truth(page);
    await page.getByRole('button', { name: mode === 'real' ? 'Real' : 'Fake', exact: true }).click();
    await expect(page.locator('#verdict-title')).toHaveText('Called it.');
    if (i < 2) await page.getByRole('button', { name: 'Next card' }).click();
  }
  await expect(page.locator('#scoreline')).toHaveText('Streak 3 · Best 3 · 3 of 3 right');
  // The game's link survives a reload and opens the game again.
  await page.reload();
  await expect(page.locator('#scoreline')).toHaveText('Streak 0 · Best 3 · 0 of 0 right');
  await page.getByRole('button', { name: 'All games' }).click();
  await expect(page.locator('#menu-status-guess')).toHaveText('Best streak: 3');
});

test('a game link opens straight into the game, and the switcher moves between them', async ({ page }) => {
  await page.goto('./#play-overunder');
  await expect(page.getByRole('radio', { name: /^Play/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Over / Under' })).toBeChecked();
  await expect(page.locator('#card-line')).toBeVisible();
  await page.getByRole('radio', { name: 'Daily Five' }).check();
  await expect(page).toHaveURL(/#play-daily$/);
  await expect(page.locator('#progress')).toBeVisible();
  await page.evaluate(() => (location.hash = 'play-guess'));
  await expect(page.getByRole('radio', { name: 'Fake or Real' })).toBeChecked();
});

test('leaving Play deals a normal card again', async ({ page }) => {
  await page.goto('./');
  await openGame(page, 'guess');
  await expect(badge(page)).toContainText('Fake or real?');
  await page.getByRole('radio', { name: /^Fake(?! or)/ }).check();
  await expect(badge(page)).toContainText('Satire');
  await expect(page.locator('#card-actions')).toBeVisible();
  await expect(page.locator('#play-top')).toBeHidden();
  await expect(page).toHaveURL(/#[0-9a-z]{1,7}$/);
});

test('wide screens show the score in the right rail', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).check();
  await expect(page.getByRole('region', { name: 'Your scores' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'This visit' })).toBeHidden();
  await page.locator('.menu-game[data-game="daily"]').click();
  await expect(page.getByRole('region', { name: 'Daily Five' })).toBeVisible();
  await expect(page.locator('#scoreline')).toBeHidden();
});

test('Play falls back to Fake if stats.json fails', async ({ page }) => {
  await page.unroute('**/stats.json');
  await page.route('**/stats.json', (route) => route.fulfill({ status: 404 }));
  await page.goto('./');
  await page.getByRole('radio', { name: /^Play/ }).click();
  await page.locator('.menu-game[data-game="guess"]').click();
  await expect(page.getByRole('status')).toContainText('the game needs them');
  await expect(page.getByRole('radio', { name: /^Fake(?! or)/ })).toBeChecked();
  await expect(badge(page)).toContainText('Satire');
});

test('Daily Five: five cards, then a row to share, and the same result on reload', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await openGame(page, 'daily');
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
  expect(clip).toMatch(/^jinx Daily Five No\. \d+: [0-5]\/5\n[🟨⬛]{5}\n.*#play-daily$/u);
  for (const text of seen) expect(clip).not.toContain(text);

  await page.reload();
  await expect(page.locator('#daily-end')).toBeVisible();
  await page.getByRole('button', { name: 'All games' }).click();
  await expect(page.locator('#menu-status-daily')).toHaveText(/^No\. \d+ · done, [0-5]\/5$/);
});

test('Daily Five is the same five in a fresh browser', async ({ page, browser }) => {
  await page.goto('./#play-daily');
  await expect(badge(page)).toContainText('Fake or real?');
  const first = await page.locator('#stat-text').textContent();
  const other = await browser.newPage();
  await other.route('**/stats.json', (route) => route.fulfill({ path: 'tests/fixtures/stats.json' }));
  await other.goto('./#play-daily');
  await expect(other.locator('#stat-text')).toHaveText(first ?? '');
  await other.close();
});

test('Over / Under: a real stat with its number hidden, a line, and a record that sticks', async ({ page }) => {
  await page.goto('./');
  await openGame(page, 'overunder');
  await expect(page.locator('#card-line')).toContainText('The line:');
  await expect(page.locator('#card-big')).toHaveText(/^\?(–\?|\?)$/);
  await expect(page.locator('#stat-text')).toContainText('?');
  await expect(badge(page)).toContainText('Real data');
  await expect(badge(page)).not.toHaveClass(/badge-hidden/);
  await expect(page.locator('#turn')).toBeHidden();
  await expect(page.locator('#back-text')).toBeEmpty();

  await page.getByRole('button', { name: '▲ Over' }).click();
  await expect(page.locator('#verdict-title')).toHaveText(/^(Cashed\. Emotionally\.|Bad beat\.)$/);
  await expect(page.locator('#verdict-sub')).toHaveText(/^It came in (over|under), at /);
  await expect(page.locator('#card-big')).not.toContainText('?');
  await expect(page.locator('#card-line')).toBeVisible();
  await expect(page.locator('#scoreline')).toHaveText(/^Record (1–0|0–1) · (100|0)% right · Bankroll \$0$/);
  const record = await page.locator('#scoreline').textContent();

  await page.getByRole('button', { name: 'Next line' }).click();
  await expect(page.locator('#card-big')).toHaveText(/\?/);
  await page.reload();
  await expect(page.locator('#scoreline')).toHaveText(record ?? '');
});

test('the line goes away outside Over / Under', async ({ page }) => {
  await page.goto('./');
  await openGame(page, 'overunder');
  await expect(page.locator('#card-line')).toBeVisible();
  await page.getByRole('radio', { name: 'Fake or Real' }).check();
  await expect(page.locator('#card-line')).toBeHidden();
  await page.getByRole('radio', { name: /^Fake(?! or)/ }).check();
  await expect(page.locator('#card-line')).toBeHidden();
});

test('Space on the menu does not deal a card over it', async ({ page }) => {
  await page.goto('./#play-guess');
  await page.getByRole('button', { name: 'Fake', exact: true }).click();
  await page.getByRole('button', { name: 'All games' }).click();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Space');
  await expect(page.locator('#play-menu')).toBeVisible();
  await expect(page.locator('#card')).toBeHidden();
});
