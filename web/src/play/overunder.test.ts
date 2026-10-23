import { expect, test } from 'vitest';
import type { Stat } from '../stat';
import { createOverUnder, hideNumbers, lineFor } from './overunder';

const stat = (numbers: Stat['numbers'], text: string, id = 'real-0123456789ab', metric = 'field-goals'): Stat => ({
  id,
  mode: 'real',
  text,
  subject: { kind: 'team', label: 'Browns' },
  conditions: [],
  metric: { id: metric, label: 'field goals made' },
  numbers,
  seasons: { from: 2018, to: 2026 },
});

const fg = stat({ sampleSize: 10, percentage: 50, count: 5 }, 'Since 2015, the Browns have made just 5 of 10 field goals (50%) on Mondays.');

test('every number that gives the value away is hidden, and nothing else', () => {
  expect(lineFor(fg)?.text).toBe('Since 2015, the Browns have made ?? of 10 field goals (??) on Mondays.');
  expect(hideNumbers('The Vikings are 2–8 since 2018, 2 straight.', ['2–8'])).toBe('The Vikings are ?–? since 2018, 2 straight.');
});

test('word tells go too: "no", "just" and a singular interception', () => {
  const none = stat({ sampleSize: 8, count: 0 }, 'The Chiefs have thrown no interceptions in 8 games.', 'real-00000000000a', 'interceptions');
  expect(lineFor(none)?.text).toBe('The Chiefs have thrown ?? interceptions in 8 games.');
  const one = stat({ sampleSize: 8, count: 1 }, 'Jalen Hurts has thrown just 1 interception in 8 games.', 'real-00000000000b', 'interceptions');
  expect(lineFor(one)?.text).toBe('Jalen Hurts has thrown ?? interceptions in 8 games.');
});

test('the line is on the half, never the value, and the same for the same stat', () => {
  for (let i = 0; i < 300; i++) {
    const id = `real-${i.toString(16).padStart(12, '0')}`;
    for (const numbers of [{ sampleSize: 10, percentage: 37.5, count: 3 }, { sampleSize: 4, percentage: 100, count: 4 }, { sampleSize: 9, count: 0 }, { sampleSize: 12, average: 21.5 }]) {
      const l = lineFor(stat(numbers, 'x', id));
      if (!l) throw new Error('no line');
      expect(l.line % 1).toBe(0.5);
      expect(l.line).not.toBe(l.value);
      expect(l.line).toBeGreaterThan(0);
      if (l.unit === '%') expect(Math.abs(l.line - l.value)).toBeLessThanOrEqual(13);
      expect(lineFor(stat(numbers, 'x', id))?.line).toBe(l.line);
    }
  }
});

test('a record is hidden as ?–? and the line is in wins', () => {
  const l = lineFor(stat({ sampleSize: 10, record: { wins: 2, losses: 8 } }, 'The Vikings are 2–8 in prime time.', 'real-0000000000ff', 'record'));
  expect(l).toMatchObject({ value: 2, big: '?–?', unit: ' wins', text: 'The Vikings are ?–? in prime time.' });
});

test('the record is kept and the verdict says where it came in', () => {
  const store = { guessBest: 0, daily: {}, ou: { w: 1, l: 1 } };
  const g = createOverUnder(store, () => {});
  const l = lineFor(fg);
  if (!l) throw new Error('no line');
  const right = l.value > l.line ? 'over' : 'under';
  const v = g.answer(fg, right);
  expect(v.ok).toBe(true);
  expect(v.sub).toBe(`It came in ${right}, at 50%.`);
  g.answer(fg, right === 'over' ? 'under' : 'over');
  expect(store.ou).toEqual({ w: 2, l: 2 });
  expect(g.view()).toMatchObject({ big: '2–2', dots: [true, false] });
});

test('deals only real stats a line can be set on', () => {
  const g = createOverUnder({ guessBest: 0, daily: {}, ou: { w: 0, l: 0 } }, () => {});
  const plain = stat({ sampleSize: 4 }, 'nothing to bet on');
  expect(g.deal([plain, fg], { previous: undefined, ticker: new Set() })?.id).toBe(fg.id);
  expect(g.deal([plain], { previous: undefined, ticker: new Set() })).toBeUndefined();
});
