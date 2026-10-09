import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { isKey, t } from '.';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('i18n', () => {
  test('every data-i18n key in index.html exists', () => {
    const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(isKey(k), k).toBe(true);
  });

  test('t returns the English string', () => {
    expect(t('card.another')).toBe('Another one');
  });
});
