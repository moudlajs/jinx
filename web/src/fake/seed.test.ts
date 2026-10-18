import { describe, expect, test } from 'vitest';
import { createRng } from './rng';
import { deckOf, parseSeed, randomSeed, seedToNumber } from './seed';

describe('seed', () => {
  test('parses base36 uint32 seeds and normalises them', () => {
    expect(parseSeed('abc12')).toBe('abc12');
    expect(parseSeed(' ABC12 ')).toBe('abc12');
    expect(parseSeed('00a')).toBe('a');
    expect(parseSeed('1z141z3')).toBe('1z141z3');
    expect(parseSeed('1z141z4')).toBe('1z141z4');
  });

  test('seeds below 2^32 are deck 0, so old links keep their card', () => {
    expect(deckOf('1z141z3')).toBe(0);
    expect(deckOf('1z141z4')).toBe(1);
    expect(seedToNumber('1z141z4')).toBe(0);
  });

  test('rejects anything else', () => {
    for (const bad of ['', 'x'.repeat(8), '3y283y8', 'ab-c', '<img>', '12.5']) expect(parseSeed(bad), bad).toBeNull();
  });

  test('randomSeed round-trips and uses the newest deck', () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(parseSeed(s)).toBe(s);
      expect(deckOf(s)).toBe(1);
    }
  });
});

describe('rng', () => {
  test('is deterministic and stays in range', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const x = a.int(3, 7);
      expect(x).toBe(b.int(3, 7));
      expect(x).toBeGreaterThanOrEqual(3);
      expect(x).toBeLessThanOrEqual(7);
    }
  });

  test('sample returns distinct items', () => {
    const picked = createRng(7).sample([1, 2, 3, 4, 5], 3);
    expect(new Set(picked).size).toBe(3);
  });
});
