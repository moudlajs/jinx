import { describe, expect, test } from 'vitest';
import type { Stat } from './stat';
import { validateStat } from './test-utils/validate-stat';

const fejk: Stat = {
  id: 'fejk-abc12',
  mode: 'fejk',
  text: 'Kickers have missed 87% of field goals on Thursdays.',
  subject: { kind: 'position', label: 'Kickers' },
  conditions: [{ id: 'thursday', label: 'on Thursdays' }],
  metric: { id: 'fg-miss', label: 'field goals missed' },
  numbers: { sampleSize: 31, percentage: 87 },
  seed: 'abc12',
};

const real: Stat = {
  ...fejk,
  id: 'real-1',
  mode: 'real',
  subject: { kind: 'team', label: 'Bears' },
  seasons: { from: 1999, to: 2025 },
  query: 'select 1',
};
delete real.seed;

describe('stat schema', () => {
  test('accepts a fejk and a real stat', () => {
    expect(validateStat(fejk), JSON.stringify(validateStat.errors)).toBe(true);
    expect(validateStat(real), JSON.stringify(validateStat.errors)).toBe(true);
  });

  test('fejk requires a seed and never names a player', () => {
    const { seed: _, ...noSeed } = fejk;
    expect(validateStat(noSeed)).toBe(false);
    expect(validateStat({ ...fejk, subject: { kind: 'player', label: 'Someone' } })).toBe(false);
  });

  test('real requires query and seasons', () => {
    const { query: _, ...noQuery } = real;
    expect(validateStat(noQuery)).toBe(false);
  });

  test("a stat can't carry the other mode's fields", () => {
    expect(validateStat({ ...fejk, query: 'select 1' })).toBe(false);
    expect(validateStat({ ...fejk, seasons: { from: 1999, to: 2025 } })).toBe(false);
    expect(validateStat({ ...real, seed: 'abc12' })).toBe(false);
  });

  test('rejects unknown fields', () => {
    expect(validateStat({ ...fejk, extra: 1 })).toBe(false);
  });
});
