// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import { generate } from '../fake/generate';
import { newVisit, see } from '../visit';
import { renderVisit } from './visit';

test('renders counts and links each mini card to its own hash', () => {
  const el = () => document.createElement('div');
  const els = { dealt: el(), dealtLabel: el(), fake: el(), real: el(), bar: el(), wildest: el(), wildestCard: el(), last: el(), empty: el() };
  const a = generate('a1');
  const b = generate('a2');
  renderVisit(els, see(see(newVisit(), undefined, a), a, b));
  expect(els.dealt.textContent).toBe('2');
  expect(els.dealtLabel.textContent).toBe('cards dealt');
  expect(els.fake.textContent).toBe('2 fake');
  expect(els.bar.style.getPropertyValue('--fake')).toBe('2');
  expect(els.last.querySelector('a')?.getAttribute('href')).toBe('#a1');
  expect(els.last.textContent).toContain(a.text);
  expect(els.empty.hidden).toBe(true);
  expect(els.wildest.hidden).toBe(false);
});
