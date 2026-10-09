import { describe, expect, test } from 'vitest';
import { generate } from './fejk/generate';
import { copyText, shareBody, statUrl } from './share';

const base = 'https://moudlajs.github.io/jinx/#old';

describe('share', () => {
  test('a copied Fejk stat carries the satire label and its seed link', () => {
    const stat = generate('abc12');
    const text = copyText(stat, base);
    expect(text).toContain(stat.text);
    expect(text).toContain('SATIRE');
    expect(text.endsWith('https://moudlajs.github.io/jinx/#abc12')).toBe(true);
  });

  test('every Fejk stat is labelled', () => {
    for (let i = 0; i < 300; i++) expect(shareBody(generate(i.toString(36)))).toMatch(/\(SATIRE: .+\)$/);
  });

  test('punchline is included', () => {
    const stat = { ...generate('abc12'), punchline: 'Source: trust us.' };
    expect(shareBody(stat).split('\n')[0]).toBe(`${stat.text} Source: trust us.`);
  });

  test('statUrl replaces any existing hash', () => {
    expect(statUrl(generate('z'), base)).toBe('https://moudlajs.github.io/jinx/#z');
  });
});
