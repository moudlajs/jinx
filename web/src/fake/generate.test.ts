import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { validateStat } from '../test-utils/validate-stat';
import { banks, decks, fillRanges, fillTemplate, generate, joinConditions, nextStat } from './generate';
import { createRng } from './rng';

// Deck 0 (links made before the banks grew) and the newest deck.
const legacy = Array.from({ length: 1000 }, (_, i) => (i * 2654435761 >>> 0).toString(36));
const seeds = [...legacy, ...legacy.map((s) => (parseInt(s, 36) + (decks.length - 1) * 2 ** 32).toString(36))];

describe('generate', () => {
  test('the same seed renders the same stat', () => {
    for (const seed of seeds.slice(0, 50)) expect(generate(seed)).toEqual(generate(seed));
  });

  test('rejects a seed that is not canonical base36', () => {
    for (const bad of ['', 'ABC', '00a', 'x'.repeat(8), '<b>']) expect(() => generate(bad), bad).toThrow(/invalid seed/);
  });

  test('different seeds give different stats', () => {
    const texts = new Set(seeds.map((s) => generate(s).text));
    expect(texts.size).toBeGreaterThan(seeds.length * 0.99);
  });

  test('every stat matches the schema, with no unfilled slot', () => {
    for (const seed of seeds) {
      const stat = generate(seed);
      expect(validateStat(stat), `${seed}: ${JSON.stringify(validateStat.errors)}`).toBe(true);
      expect(stat.text, seed).not.toMatch(/[{}]|undefined|NaN/);
      expect(stat.text, seed).toMatch(/^[A-Z].*[.)]$/);
    }
  });

  test('2 to 4 conditions, never two from the same category', () => {
    const categoryOf = new Map(banks.conditions.map((c) => [c.id, c.category]));
    for (const seed of seeds) {
      const { conditions } = generate(seed);
      expect(conditions.length).toBeGreaterThanOrEqual(2);
      expect(conditions.length).toBeLessThanOrEqual(4);
      expect(new Set(conditions.map((c) => categoryOf.get(c.id))).size).toBe(conditions.length);
    }
  });

  test('numbers are internally consistent', () => {
    for (const seed of seeds) {
      const { numbers } = generate(seed);
      if (numbers.record) expect(numbers.record.wins + numbers.record.losses).toBe(numbers.sampleSize);
      if (numbers.percentage !== undefined) {
        expect(numbers.percentage).toBeGreaterThan(0);
        expect(numbers.percentage).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('word banks', () => {
  const slots = {
    subject: 's', Subject: 'S', metric: 'm', conditions: 'c', Conditions: 'C', since: '1', years: '2', sample: '3',
  };

  test('every template renders with the generator slots', () => {
    for (const t of banks.templates) expect(() => fillTemplate(t, slots), t).not.toThrow();
  });

  test('every metric phrase uses only its own number slot', () => {
    const slotFor = { record: 'record', percentage: 'pct', count: 'count' } as const;
    for (const m of banks.metrics) {
      for (const form of [m.sg, m.pl]) {
        expect(form.match(/\{(\w+)\}/g), m.id).toEqual([`{${slotFor[m.kind]}}`]);
      }
    }
  });

  test('every condition fills its ranges', () => {
    const rng = createRng(1);
    for (const c of banks.conditions) expect(fillRanges(c.text, rng), c.id).not.toMatch(/[{}]/);
  });

  test('ids are unique and subjects are never players', () => {
    for (const list of [banks.subjects, banks.conditions, banks.metrics]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const s of banks.subjects) expect(['team', 'position', 'archetype']).toContain(s.kind);
  });

  test('at least 4 condition categories, so 4 conditions are always possible', () => {
    expect(new Set(banks.conditions.map((c) => c.category)).size).toBeGreaterThanOrEqual(4);
  });
});

describe('decks', () => {
  test('old links render exactly the card they did before the banks grew', () => {
    const json = JSON.stringify(legacy.slice(0, 500).map(generate));
    expect(createHash('sha256').update(json).digest('hex')).toBe('b4fdac981b9d07a242afadb9a29dec405e989acd6e5aee45b955716d39d297ef');
  });

  test('the newest deck covers every bank entry, and decks only grow', () => {
    const newest = decks.at(-1);
    for (const key of Object.keys(banks) as (keyof typeof banks)[]) {
      expect(newest?.[key], key).toBe(banks[key].length);
      for (let d = 1; d < decks.length; d++) expect(decks[d]?.[key], key).toBeGreaterThanOrEqual(decks[d - 1]?.[key] ?? 0);
    }
  });

  test('new seeds reach the new entries', () => {
    const subjects = new Set(seeds.slice(legacy.length).map((s) => generate(s).subject.label));
    expect(subjects).toContain(banks.subjects.at(-1)?.label);
  });
});

describe('nextStat', () => {
  test('never repeats the current stat', () => {
    const fixed = ['abc', 'abc', 'abc', 'xyz'];
    let i = 0;
    const first = generate('abc');
    expect(nextStat(first, () => fixed[i++] ?? 'q').seed).toBe('xyz');
  });

  test('a long run has no duplicate consecutive stats', () => {
    let prev = nextStat();
    for (let i = 0; i < 500; i++) {
      const next = nextStat(prev);
      expect(next.text).not.toBe(prev.text);
      prev = next;
    }
  });
});

describe('helpers', () => {
  test('joinConditions reads like a sentence', () => {
    expect(joinConditions(['a', 'b'])).toBe('a b');
    expect(joinConditions(['a', 'b', 'c'])).toBe('a, b and c');
  });

  test('fillTemplate throws on a missing slot', () => {
    expect(() => fillTemplate('{nope}', {})).toThrow(/nope/);
  });
});
