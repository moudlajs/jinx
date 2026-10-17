import { expect, test } from 'vitest';
import { generate } from '../fake/generate';
import type { Stat } from '../stat';
import { back } from './back';

const real: Stat = {
  id: 'real-964641c75070',
  mode: 'real',
  text: 'Since 2005, the Steelers have converted 6 of 8 fourth downs (75%) in early kickoffs in the playoffs.',
  subject: { kind: 'team', label: 'the Steelers' },
  conditions: [
    { id: 'early', label: 'in early kickoffs' },
    { id: 'playoffs', label: 'in the playoffs' },
  ],
  metric: { id: 'fourth-down', label: '4th-down conversion rate' },
  numbers: { sampleSize: 8, percentage: 75, count: 6 },
  seasons: { from: 2005, to: 2026 },
  query: 'SELECT 1',
};

test('a real stat explains itself in words, dots and chips, never SQL', () => {
  const b = back(real);
  expect(b.text).toBe("We took every fourth down that matched the chips below. That's 8 tries, and 6 converted.");
  expect(b.dots).toEqual([true, true, true, true, true, true, false, false]);
  expect(b.dotsLabel).toBe('6 of 8');
  expect(b.chips).toEqual(['in early kickoffs', 'in the playoffs', '2005–2026']);
  expect(JSON.stringify(b)).not.toContain('SELECT');
});

test('records count wins, and big samples skip the dots', () => {
  const rec = { ...real, metric: { id: 'record', label: 'win-loss record' }, numbers: { sampleSize: 12, record: { wins: 11, losses: 1 } } };
  expect(back(rec).text).toContain("That's 12 games: 11 won, 1 lost.");
  expect(back(rec).dots.filter(Boolean)).toHaveLength(11);
  const tied = { ...rec, numbers: { sampleSize: 9, record: { wins: 4, losses: 4, ties: 1 } } };
  expect(back(tied).text).toContain("That's 9 games: 4 won, 4 lost, 1 tied.");
  expect(back(tied).dots).toHaveLength(9);
  const big = { ...rec, numbers: { sampleSize: 60, record: { wins: 50, losses: 10 } } };
  expect(back(big).dots).toEqual([]);
});

test('per-game totals have no dots', () => {
  const ints = { ...real, metric: { id: 'interceptions', label: 'interceptions per game' }, numbers: { sampleSize: 9, count: 0 } };
  expect(back(ints).dots).toEqual([]);
  expect(back(ints).text).toContain('Interceptions thrown: 0.');
});

test('a fake stat lists its ingredients and says it is made up', () => {
  const stat = generate('abc12');
  const b = back(stat);
  expect(b.title).toBe('Ingredients');
  expect(b.chips).toContain(stat.subject.label);
  expect(b.chips).toContain(stat.metric.label);
  expect(b.source).toMatch(/not from data/);
  expect(b.dots).toEqual([]);
});
