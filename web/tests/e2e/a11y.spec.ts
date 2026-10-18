// axe over every state a visitor can reach, in both themes.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function audit(page: Page, state: string) {
  // Let the deal and turn animations settle so axe sees final colors.
  await page.waitForTimeout(1000);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(violations.map((v) => `${state}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`no axe violations in the ${scheme} theme`, async ({ page }) => {
    await page.route('**/stats.json', (route) => route.fulfill({ path: 'tests/fixtures/stats.json' }));
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('./');
    await audit(page, 'cover');
    await page.goto('./#abc12');
    await audit(page, 'fake front');
    await page.getByRole('button', { name: 'How we know' }).click();
    await audit(page, 'fake back');
    await page.goto('./#real-9d86edf15bec');
    await audit(page, 'real front');
    await page.getByRole('button', { name: 'How we know' }).click();
    await audit(page, 'real back');
  });
}
