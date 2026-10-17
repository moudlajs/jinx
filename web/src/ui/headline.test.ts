import { expect, test } from 'vitest';
import type { Stat } from '../stat';
import { cardCode, headline } from './headline';

const base: Stat = {
  id: 'real-9d86edf15bec',
  mode: 'real',
  text: 'Since 2020, a QB is 11–1.',
  subject: { kind: 'player', label: 'A QB' },
  conditions: [],
  metric: { id: 'record', label: 'win-loss record' },
  numbers: { sampleSize: 12, record: { wins: 11, losses: 1 } },
};

test('records, percentages and counts each pick their own number', () => {
  expect(headline(base)).toEqual({ value: '11–1', label: 'win-loss record' });
  const tied = { ...base, numbers: { sampleSize: 9, record: { wins: 4, losses: 4, ties: 1 } } };
  expect(headline(tied).value).toBe('4–4–1');
  const pct = { ...base, metric: { id: 'fourth-down', label: '4th-down conversion rate' }, numbers: { sampleSize: 9, percentage: 77.8, count: 7 } };
  expect(headline(pct).value).toBe('77.8%');
  expect(headline({ ...pct, numbers: { sampleSize: 8, percentage: 75, count: 6 } }).value).toBe('75%');
});

test('real per-game totals get a label that matches the total', () => {
  const ints = { ...base, metric: { id: 'interceptions', label: 'interceptions per game' }, numbers: { sampleSize: 12, count: 24 } };
  expect(headline(ints)).toEqual({ value: '24', label: 'interceptions thrown' });
});

test('points per game falls back to the first number that is not a year', () => {
  const ppg = {
    ...base,
    text: 'Since 2015, the Jets have scored 9.8 points per game in 11 games on Mondays.',
    metric: { id: 'points-per-game', label: 'points per game' },
    numbers: { sampleSize: 11 },
  };
  expect(headline(ppg).value).toBe('9.8');
});

test('card codes come from the seed or the id', () => {
  expect(cardCode(base)).toBe('9D86ED');
  expect(cardCode({ ...base, id: 'fake-k3f9a2', mode: 'fake', seed: 'k3f9a2' })).toBe('K3F9A2');
});
