import { describe, expect, test } from 'vitest';
import { allQuotes, attribution, randomQuote } from './quotes';

describe('quotes', () => {
  test('about 20 short, attributed quotes', () => {
    expect(allQuotes.length).toBeGreaterThanOrEqual(18);
    for (const q of allQuotes) {
      expect(q.text.length, q.text).toBeLessThanOrEqual(80);
      expect(q.author.trim()).not.toBe('');
    }
    expect(new Set(allQuotes.map((q) => q.text)).size).toBe(allQuotes.length);
  });

  test('randomQuote covers the whole list', () => {
    expect(randomQuote(() => 0)).toBe(allQuotes[0]);
    expect(randomQuote(() => 0.9999)).toBe(allQuotes.at(-1));
  });

  test('attribution', () => {
    expect(attribution({ text: 'x', author: 'A' })).toBe('— A');
    expect(attribution({ text: 'x', author: 'A', context: '2001' })).toBe('— A, 2001');
  });
});
