// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import { generate } from '../fake/generate';
import type { Stat } from '../stat';
import { renderExplain } from './explain';

function elements() {
  const make = (tag: string) => document.createElement(tag);
  return {
    root: make('details') as HTMLDetailsElement,
    metric: make('dd'),
    filters: make('ul'),
    sample: make('dd'),
    seasons: make('dd'),
    query: make('code'),
  };
}

const real: Stat = {
  id: 'real-9d86edf15bec',
  mode: 'real',
  text: 'Since 2020, a QB is 11–1.',
  subject: { kind: 'player', label: 'A QB' },
  conditions: [
    { id: 'indoors', label: 'indoors' },
    { id: 'jersey-even', label: '<b>while wearing an even number</b>' },
  ],
  metric: { id: 'record', label: 'win-loss record' },
  numbers: { sampleSize: 12, record: { wins: 11, losses: 1 } },
  seasons: { from: 2020, to: 2026 },
  query: 'SELECT qb_id AS subject\nFROM team_games',
};

test('a real stat shows its working, as text', () => {
  const els = elements();
  renderExplain(els, real);
  expect(els.root.hidden).toBe(false);
  expect(els.metric.textContent).toBe('win-loss record');
  expect([...els.filters.children].map((li) => li.textContent)).toEqual([
    'indoors',
    '<b>while wearing an even number</b>',
  ]);
  expect(els.filters.querySelector('b')).toBeNull();
  expect(els.sample.textContent).toBe('12');
  expect(els.seasons.textContent).toBe('2020–2026');
  expect(els.query.textContent).toContain('FROM team_games');
});

test('fake stats have nothing to explain', () => {
  const els = elements();
  renderExplain(els, real);
  els.root.open = true;
  renderExplain(els, generate('abc12'));
  expect(els.root.hidden).toBe(true);
  expect(els.root.open).toBe(false);
});
