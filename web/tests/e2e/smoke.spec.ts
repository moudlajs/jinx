import { expect, test } from '@playwright/test';

const statText = (page: import('@playwright/test').Page) => page.locator('#stat-text');

test('page loads with a quote and a face-down deck', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/jinx/);
  await expect(page.locator('#quote-text')).not.toBeEmpty();
  await expect(page.locator('#quote-author')).toHaveText(/^— \S/);
  await expect(page.locator('#card')).toBeHidden();
});

test('generate renders a stat with the satire badge and a seed link', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Deal me a card' }).click();
  await expect(statText(page)).not.toBeEmpty();
  await expect(page.locator('#card-badge')).toBeVisible();
  await expect(page.locator('#card-badge')).toContainText('Satire');
  await expect(page.locator('#hero')).toBeHidden();
  await expect(page).toHaveURL(/#[0-9a-z]{1,7}$/);
});

test('"Deal another" and Space change the stat', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Deal me a card' }).click();
  const first = await statText(page).textContent();
  await page.getByRole('button', { name: 'Deal another' }).click();
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
  await page.getByRole('button', { name: 'Deal another' }).click();
  await expect(page.getByRole('status')).toBeEmpty();
});

test('a seed link reproduces the stat, in a fresh page too', async ({ page, browser }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Deal me a card' }).click();
  const text = await statText(page).textContent();
  const url = page.url();

  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.locator('#stat-text')).toHaveText(text ?? '');
  await other.close();
});

test('editing the hash on an open page renders that seed', async ({ page }) => {
  await page.goto('./#abc12');
  const first = await statText(page).textContent();
  await page.evaluate(() => (location.hash = 'xyz99'));
  await expect(statText(page)).not.toHaveText(first ?? '');
  await expect(page.locator('#card')).toHaveAttribute('data-seed', 'xyz99');
});

test('a bad hash is ignored', async ({ page }) => {
  await page.goto('./#<img src=x onerror=alert(1)>');
  await expect(page.locator('#card')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Deal me a card' })).toBeVisible();
});

test('theme toggle switches and remembers', async ({ page }) => {
  await page.goto('./');
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('#theme-toggle').click();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(before);
  const themeColor = () =>
    page.evaluate(() => [
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content,
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    ]);
  const [meta, bg] = await themeColor();
  expect(meta).toBe(bg);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
});

test('a fake card turns over to its ingredients', async ({ page }) => {
  await page.goto('./#abc12');
  await page.getByRole('button', { name: 'How we know' }).click();
  await expect(page.locator('#card-back').getByRole('heading', { name: 'Ingredients' })).toBeVisible();
  await expect(page.locator('#back-badge')).toHaveText('Satire: every number on this card is made up.');
  await page.getByRole('button', { name: 'Deal another' }).click();
  await expect(page.locator('#card')).not.toHaveClass(/turned/);
});

test('every deal tosses the old card, not just the first', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Deal me a card' }).click();
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('#deck .ghost')).toHaveCount(0);
    await page.getByRole('button', { name: 'Deal another' }).click();
    const ghost = page.locator('#deck .ghost');
    await expect(ghost).toHaveCount(1);
    expect(await ghost.evaluate((el) => getComputedStyle(el).animationName)).toBe('toss');
  }
});

test('dealing leaves exactly one card behind', async ({ page }) => {
  await page.goto('./#abc12');
  await page.getByRole('button', { name: 'Deal another' }).click();
  await page.getByRole('button', { name: 'Deal another' }).click();
  await expect(page.locator('#deck .ghost')).toHaveCount(0);
  await expect(page.locator('[id="stat-text"]')).toHaveCount(1);
});

test('wide screens put the deck between two rails', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout');
  await page.setViewportSize({ width: 2560, height: 1080 });
  await page.goto('./#abc12');
  const box = async (sel: string) => {
    const b = await page.locator(sel).boundingBox();
    if (!b) throw new Error(`${sel} has no box`);
    return b;
  };
  const [left, card, right] = [await box('.rail-left'), await box('#card'), await box('.rail-right')];
  expect(left.x + left.width).toBeLessThanOrEqual(card.x);
  expect(card.x + card.width).toBeLessThanOrEqual(right.x);
  await expect(page.locator('.footer-long').first()).toBeVisible();
});

test('on a phone the footer is one short line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#abc12');
  await expect(page.locator('p.footer-long')).toBeHidden();
  const footer = await page.locator('.site-footer').boundingBox();
  expect(footer?.height).toBeLessThan(40);
});

test('no horizontal scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./#abc12');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe('Real mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/stats.json', (route) => route.fulfill({ path: 'tests/fixtures/stats.json' }));
  });

  test('the toggle switches the card to a real stat, and back', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Deal me a card' }).click();
    await page.getByRole('radio', { name: 'Real' }).check();
    await expect(page.locator('#card')).toHaveAttribute('data-mode', 'real');
    await expect(page.locator('#card-badge')).toContainText('Real data');
    await expect(page.locator('#card-badge')).not.toContainText('Satire');
    await expect(page).toHaveURL(/#real-[0-9a-f]{12}$/);

    const first = await statText(page).textContent();
    await page.getByRole('button', { name: 'Deal another' }).click();
    await expect(statText(page)).not.toHaveText(first ?? '');
    await expect(page.locator('#card')).toHaveAttribute('data-mode', 'real');

    await page.getByRole('radio', { name: 'Fake' }).check();
    await expect(page.locator('#card')).toHaveAttribute('data-mode', 'fake');
    await expect(page.locator('#card-badge')).toContainText('Satire');
  });

  test('turning a real card over explains it in words, without SQL', async ({ page }) => {
    await page.goto('./#real-964641c75070');
    await expect(statText(page)).toContainText('Patriots');
    await page.getByRole('button', { name: 'How we know' }).click();
    const backFace = page.locator('#card-back');
    await expect(backFace.getByRole('heading', { name: 'How we know' })).toBeVisible();
    await expect(page.locator('#back-text')).toContainText("That's 9 games. Interceptions thrown: 0.");
    await expect(page.locator('#back-chips li')).toHaveCount(3);
    await expect(page.locator('#back-chips li').last()).toHaveText(/^\d{4}–\d{4}$/);
    await expect(page.locator('body')).not.toContainText('SELECT');
    await expect(page.locator('#card-back a')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Turn back' })).toBeFocused();

    await page.setViewportSize({ width: 360, height: 740 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole('button', { name: 'Turn back' }).click();
    await expect(page.getByRole('button', { name: 'How we know' })).toBeFocused();
  });

  test('a record shows one dot per game, filled for the wins', async ({ page }) => {
    await page.goto('./#real-9d86edf15bec');
    await page.getByRole('button', { name: 'How we know' }).click();
    await expect(page.getByRole('img', { name: '11 of 12' })).toBeVisible();
    await expect(page.locator('#back-dots .dot.on')).toHaveCount(11);
  });

  test('the ticker mixes in real stats and opens one on click', async ({ page }) => {
    // With reduced motion the strip stands still and scrolls by hand, which also makes it clickable here.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./#abc12');
    const realItem = page.locator('#ticker .ticker-group').first().locator('a[href^="#real-"]').first();
    await expect(realItem).toBeAttached();
    const href = (await realItem.getAttribute('href')) ?? '';
    await realItem.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('#card')).toHaveAttribute('data-mode', 'real');
  });

  test('a real link reproduces the stat', async ({ page }) => {
    await page.goto('./#real-964641c75070');
    await expect(statText(page)).toContainText('The Patriots have thrown no interceptions');
    await expect(page.getByRole('radio', { name: 'Real' })).toBeChecked();
  });

  test('copying a real stat labels the data source', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('./#real-964641c75070');
    await expect(statText(page)).toContainText('Patriots');
    await page.getByRole('button', { name: 'Copy' }).click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('(Real stat from jinx, data: nflverse)');
    expect(clip).not.toContain('SATIRE');
    expect(clip).toMatch(/#real-964641c75070$/);
  });

  test('an expired real link shows another real stat and says so', async ({ page }) => {
    await page.goto('./#real-000000000000');
    await expect(page.locator('#card')).toHaveAttribute('data-mode', 'real');
    await expect(page.getByRole('status')).toContainText("isn't in this week's batch");
  });
});

test('if stats.json fails, the toggle falls back to Fake', async ({ page }) => {
  await page.route('**/stats.json', (route) => route.fulfill({ status: 404 }));
  await page.goto('./');
  await page.getByRole('button', { name: 'Deal me a card' }).click();
  await page.getByRole('radio', { name: 'Real' }).check();
  await expect(page.getByRole('status')).toContainText("Couldn't load the real stats");
  await expect(page.getByRole('radio', { name: 'Fake' })).toBeChecked();
  await expect(page.locator('#card')).toHaveAttribute('data-mode', 'fake');
});
