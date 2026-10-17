// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import { generate } from '../fake/generate';
import type { Stat } from '../stat';
import { interleave, renderTicker } from './ticker';

const fake = ['a1', 'b2', 'c3'].map(generate);
const { seed: _seed, ...rest } = generate('d4');
const real: Stat = { ...rest, id: 'real-964641c75070', mode: 'real', text: '<b>Real</b> one' };

test('real and fake alternate', () => {
  expect(interleave(fake, [real]).map((s) => s.id)).toEqual([real.id, ...fake.map((s) => s.id)]);
});

test('items link to their card, as text, and the loop copy is hidden', () => {
  const track = document.createElement('div');
  renderTicker(track, [real, ...fake]);
  const [list, copy] = [...track.children];
  expect(copy?.getAttribute('aria-hidden')).toBe('true');
  const links = [...(list?.querySelectorAll('a') ?? [])];
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['#real-964641c75070', '#a1', '#b2', '#c3']);
  expect(links[0]?.textContent).toBe('<b>Real</b> one');
  expect(links[1]?.textContent).toMatch(/^Fake · /);
  expect(track.querySelector('b')).toBeNull();
  expect([...(copy?.querySelectorAll('a') ?? [])].every((a) => a.tabIndex === -1)).toBe(true);
});
