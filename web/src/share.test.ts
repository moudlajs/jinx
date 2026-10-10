import { describe, expect, test } from 'vitest';
import { generate } from './fake/generate';
import { copyText, shareBody, statUrl } from './share';

const base = 'https://moudlajs.github.io/jinx/#old';

describe('share', () => {
  test('a copied Fake stat carries the satire label and its seed link', () => {
    const stat = generate('abc12');
    const text = copyText(stat, base);
    expect(text).toContain(stat.text);
    expect(text).toContain('SATIRE');
    expect(text.endsWith('https://moudlajs.github.io/jinx/#abc12')).toBe(true);
  });

  test('every Fake stat is labelled', () => {
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

test('a copied Real stat carries the nflverse label and its id link', () => {
  const real = {
    id: 'real-9d86edf15bec',
    mode: 'real' as const,
    text: 'Since 2020, a QB is 11–1.',
    subject: { kind: 'player' as const, label: 'A QB' },
    conditions: [{ id: 'indoors', label: 'indoors' }],
    metric: { id: 'record', label: 'win-loss record' },
    numbers: { sampleSize: 12 },
    seasons: { from: 2020, to: 2026 },
    query: 'select 1',
  };
  const text = copyText(real, base);
  expect(text).toContain('(Real stat from jinx, data: nflverse)');
  expect(text).not.toContain('SATIRE');
  expect(text.endsWith('/jinx/#real-9d86edf15bec')).toBe(true);
});
