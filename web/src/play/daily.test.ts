import { expect, test } from 'vitest';
import type { Stat } from '../stat';
import { createDaily, dailyFive, dayNumber, shareRow } from './daily';

const real = (n: number): Stat[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `real-${String(i).padStart(12, '0')}`,
    mode: 'real',
    text: `Real ${i}`,
    subject: { kind: 'team', label: 'Bears' },
    conditions: [],
    metric: { id: 'm', label: 'm' },
    numbers: { sampleSize: 10 },
  }));

test('day numbers count Prague calendar days from launch, wherever you are', () => {
  // Prague is UTC+2 until 25 October 2026, then UTC+1.
  expect(dayNumber(new Date(Date.UTC(2026, 9, 22, 22, 5)))).toBe(1);
  expect(dayNumber(new Date(Date.UTC(2026, 9, 23, 21, 55)))).toBe(1);
  expect(dayNumber(new Date(Date.UTC(2026, 9, 23, 22, 1)))).toBe(2);
  expect(dayNumber(new Date(Date.UTC(2026, 11, 31, 23, 30)))).toBe(71);
});

test('the same day gives the same five, whatever order stats.json lists them in', () => {
  const stats = real(40);
  const a = dailyFive(9, stats).map((s) => s.id);
  expect(dailyFive(9, [...stats].reverse()).map((s) => s.id)).toEqual(a);
  expect(dailyFive(10, stats).map((s) => s.id)).not.toEqual(a);
});

test('five cards, two or three of them Fake, every day', () => {
  for (let day = 1; day < 200; day++) {
    const five = dailyFive(day, real(40));
    expect(five).toHaveLength(5);
    const fakes = five.filter((s) => s.mode === 'fake').length;
    expect(fakes).toBeGreaterThanOrEqual(2);
    expect(fakes).toBeLessThanOrEqual(3);
    expect(new Set(five.map((s) => s.id)).size).toBe(5);
  }
});

test('too few real stats are topped up with Fake rather than failing', () => {
  expect(dailyFive(3, real(1))).toHaveLength(5);
});

test('the share row has the score and squares, never card text', () => {
  const text = shareRow(4, [true, false, true, true, false], 'https://x/jinx/');
  expect(text).toBe('jinx Daily Five No. 4: 3/5\n🟨⬛🟨🟨⬛\nhttps://x/jinx/');
});

test('a game resumes where it stopped and ends after five', () => {
  const store = { guessBest: 0, daily: {} as Record<string, boolean[]>, ou: { w: 0, l: 0 } };
  const now = () => new Date(Date.UTC(2026, 9, 25, 12));
  const stats = real(40);
  const g = createDaily(store, () => {}, 'u', now);
  const ctx = { previous: undefined, ticker: new Set<string>() };
  const first = g.deal(stats, ctx) as Stat;
  g.answer(first, first.mode);
  const again = createDaily(store, () => {}, 'u', now);
  expect(again.deal(stats, ctx)?.id).not.toBe(first.id);
  for (let i = 0; i < 4; i++) {
    const s = again.deal(stats, ctx) as Stat;
    again.answer(s, 'nope');
  }
  expect(again.deal(stats, ctx)).toBeUndefined();
  expect(store.daily['3']).toEqual([true, false, false, false, false]);
  expect(again.end?.()).toMatchObject({ big: '1/5', text: 'Rough day at the office.' });
  expect(again.status()).toBe('No. 3 · done, 1/5');
  expect(createDaily({ guessBest: 0, daily: {}, ou: { w: 0, l: 0 } }, () => {}, 'u', now).status()).toBe('No. 3 · not played yet');
});

test('an open tab moves on at midnight, but finishes a half-played five first', () => {
  const store = { guessBest: 0, daily: {} as Record<string, boolean[]>, ou: { w: 0, l: 0 } };
  let clock = new Date(Date.UTC(2026, 9, 25, 21, 50));
  const g = createDaily(store, () => {}, 'u', () => clock);
  const ctx = { previous: undefined, ticker: new Set<string>() };
  const stats = real(40);
  g.answer(g.deal(stats, ctx) as Stat, 'fake');
  clock = new Date(Date.UTC(2026, 9, 25, 23, 10));
  for (let i = 0; i < 4; i++) g.answer(g.deal(stats, ctx) as Stat, 'fake');
  expect(store.daily['3']).toHaveLength(5);
  // The finished row comes first, and the score stays on that day while it shows.
  expect(g.deal(stats, ctx)).toBeUndefined();
  expect(g.end?.()?.kicker).toBe('Daily Five · No. 3');
  expect(g.view().details[0]).toBe('No. 3');
  expect(g.deal(stats, ctx)).toBeDefined();
  expect(g.view().details[0]).toBe('No. 4');
});

test('a stale tab shows the new day before anything is dealt', () => {
  const store = { guessBest: 0, daily: { '3': [true, true, true, true, true] } as Record<string, boolean[]>, ou: { w: 0, l: 0 } };
  let clock = new Date(Date.UTC(2026, 9, 25, 12));
  const g = createDaily(store, () => {}, 'u', () => clock);
  expect(g.progress?.()).toEqual([true, true, true, true, true]);
  clock = new Date(Date.UTC(2026, 9, 26, 8));
  expect(g.progress?.()).toEqual([undefined, undefined, undefined, undefined, undefined]);
  expect(g.view().details[0]).toBe('No. 4');
});

test('a card dealt before midnight counts for the day it was dealt', () => {
  const store = { guessBest: 0, daily: {} as Record<string, boolean[]>, ou: { w: 0, l: 0 } };
  // 23:59 and 00:01 in Prague, which is UTC+1 after the clocks go back on 25 October.
  let clock = new Date(Date.UTC(2026, 9, 25, 22, 59));
  const g = createDaily(store, () => {}, 'u', () => clock);
  const card = g.deal(real(40), { previous: undefined, ticker: new Set() }) as Stat;
  clock = new Date(Date.UTC(2026, 9, 25, 23, 1));
  expect(g.view().details[0]).toBe('No. 3');
  g.answer(card, card.mode);
  expect(store.daily).toEqual({ '3': [true] });
});
