// axe over every state a visitor can reach, in both themes. Reduced motion turns animations off, so no settling.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const states: [string, (page: Page) => Promise<void>][] = [
  ['cover', async (page) => {
    await page.goto('./');
    await expect(page.locator('#hero')).toBeVisible();
  }],
  ['fake front', async (page) => {
    await page.goto('./#abc12');
    await expect(page.locator('#stat-text')).not.toBeEmpty();
  }],
  ['fake back', async (page) => {
    await page.goto('./#abc12');
    await page.getByRole('button', { name: 'How we know' }).click();
    await expect(page.getByRole('button', { name: 'Turn back' })).toBeFocused();
  }],
  ['real front', async (page) => {
    await page.goto('./#real-9d86edf15bec');
    await expect(page.locator('#card')).toHaveAttribute('data-mode', 'real');
  }],
  ['real back', async (page) => {
    await page.goto('./#real-9d86edf15bec');
    await page.getByRole('button', { name: 'How we know' }).click();
    await expect(page.getByRole('button', { name: 'Turn back' })).toBeFocused();
  }],
];

for (const scheme of ['light', 'dark'] as const) {
  for (const [state, open] of states) {
    test(`no axe violations: ${state}, ${scheme} theme`, async ({ page }) => {
      await page.route('**/stats.json', (route) => route.fulfill({ path: 'tests/fixtures/stats.json' }));
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await open(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
}
