import { describe, expect, test } from 'vitest';
import { createRng } from './rng';
import { parseSeed, randomSeed, seedToNumber } from './seed';

describe('seed', () => {
  test('parses base36 uint32 seeds and normalises them', () => {
    expect(parseSeed('abc12')).toBe('abc12');
    expect(parseSeed(' ABC12 ')).toBe('abc12');
    expect(parseSeed('00a')).toBe('a');
    expect(parseSeed('1z141z3')).toBe('1z141z3');
  });

  test('rejects anything else', () => {
    for (const bad of ['', 'x'.repeat(8), '1z141z4', 'ab-c', '<img>', '12.5']) expect(parseSeed(bad), bad).toBeNull();
  });

  test('randomSeed round-trips', () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(parseSeed(s)).toBe(s);
      expect(seedToNumber(s).toString(36)).toBe(s);
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
