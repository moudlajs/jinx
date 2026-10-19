import { expect, test } from 'vitest';
import { generate } from './fake/generate';
import type { Stat } from './stat';
import { LAST, newVisit, see, wilder } from './visit';

const real = (id: string, conditions: number, sampleSize = 10): Stat => ({
  ...generate('abc12'),
  id,
  mode: 'real',
  conditions: Array.from({ length: conditions }, (_, i) => ({ id: `c${i}`, label: `c${i}` })),
  numbers: { sampleSize },
});

function play(stats: Stat[]) {
  let v = newVisit();
  let current: Stat | undefined;
  for (const s of stats) {
    v = see(v, current, s);
    current = s;
  }
  return v;
}

test('counts each card once and splits fake from real', () => {
  const a = generate('a1');
  const b = real('real-b', 1);
  const v = play([a, b, a]);
  expect([v.fake, v.real]).toEqual([1, 1]);
});

test('the pile holds the previous cards, newest first, never the one on the table', () => {
  const cards = ['a1', 'a2', 'a3', 'a4', 'a5'].map((s) => generate(s));
  const v = play(cards);
  expect(v.last.map((s) => s.id)).toEqual(['fake-a4', 'fake-a3', 'fake-a2'].slice(0, LAST));
  const back = see(v, cards[4], cards[2] as Stat);
  expect(back.last.map((s) => s.id)).toEqual(['fake-a5', 'fake-a4', 'fake-a2']);
  expect(back.fake).toBe(v.fake);
});

test('wildest: more conditions first, then the thinner sample', () => {
  expect(wilder(real('x', 3), real('y', 2))).toBe(true);
  expect(wilder(real('x', 2, 4), real('y', 2, 9))).toBe(true);
  expect(wilder(real('x', 2, 9), real('y', 2, 9))).toBe(false);
  expect(play([real('x', 1), real('y', 3), real('z', 2)]).wildest?.id).toBe('y');
});
