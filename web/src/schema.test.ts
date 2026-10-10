import { describe, expect, test } from 'vitest';
import type { Stat } from './stat';
import { validateStat } from './test-utils/validate-stat';

const fake: Stat = {
  id: 'fake-abc12',
  mode: 'fake',
  text: 'Kickers have missed 87% of field goals on Thursdays.',
  subject: { kind: 'position', label: 'Kickers' },
  conditions: [{ id: 'thursday', label: 'on Thursdays' }],
  metric: { id: 'fg-miss', label: 'field goals missed' },
  numbers: { sampleSize: 31, percentage: 87 },
  seed: 'abc12',
};

const real: Stat = {
  ...fake,
  id: 'real-1',
  mode: 'real',
  subject: { kind: 'team', label: 'Bears' },
  seasons: { from: 1999, to: 2025 },
  query: 'select 1',
};
delete real.seed;

describe('stat schema', () => {
  test('accepts a fake and a real stat', () => {
    expect(validateStat(fake), JSON.stringify(validateStat.errors)).toBe(true);
    expect(validateStat(real), JSON.stringify(validateStat.errors)).toBe(true);
  });

  test('fake requires a seed and never names a player', () => {
    const { seed: _, ...noSeed } = fake;
    expect(validateStat(noSeed)).toBe(false);
    expect(validateStat({ ...fake, subject: { kind: 'player', label: 'Someone' } })).toBe(false);
  });

  test('real requires query and seasons', () => {
    const { query: _, ...noQuery } = real;
    expect(validateStat(noQuery)).toBe(false);
  });

  test("a stat can't carry the other mode's fields", () => {
    expect(validateStat({ ...fake, query: 'select 1' })).toBe(false);
    expect(validateStat({ ...fake, seasons: { from: 1999, to: 2025 } })).toBe(false);
    expect(validateStat({ ...real, seed: 'abc12' })).toBe(false);
  });

  test('rejects unknown fields', () => {
    expect(validateStat({ ...fake, extra: 1 })).toBe(false);
  });
});
