import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { validateStat } from './test-utils/validate-stat';
import { loadStats, parseStatsFile, pickReal } from './real';

const fixture: unknown = JSON.parse(readFileSync(new URL('../tests/fixtures/stats.json', import.meta.url), 'utf8'));

describe('real', () => {
  test('the fixture parses and every stat matches the schema', () => {
    const file = parseStatsFile(fixture);
    expect(file.stats.length).toBeGreaterThan(1);
    for (const s of file.stats) expect(validateStat(s), JSON.stringify(validateStat.errors)).toBe(true);
  });

  test('rejects unexpected shapes', () => {
    expect(() => parseStatsFile(null)).toThrow();
    expect(() => parseStatsFile({ version: 2, stats: [] })).toThrow();
    expect(() => parseStatsFile({ version: 1, stats: [{ mode: 'fake', id: 'x', text: 'y' }] })).toThrow(/no usable/);
  });

  test('pickReal never repeats the current stat', () => {
    const { stats } = parseStatsFile(fixture);
    for (let i = 0; i < 50; i++) {
      const cur = stats[i % stats.length];
      expect(pickReal(stats, cur).id).not.toBe(cur?.id);
    }
  });

  test('loadStats fetches once, and retries after a failure', async () => {
    const bad = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(loadStats('/s.json', bad)).rejects.toThrow(/404/);
    const good = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(fixture) });
    await loadStats('/s.json', good);
    await loadStats('/s.json', good);
    expect(good).toHaveBeenCalledTimes(1);
  });
});
