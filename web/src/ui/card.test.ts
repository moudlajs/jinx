// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import { highlightNumbers } from './card';

test('numbers are wrapped, text is untouched', () => {
  const el = document.createElement('p');
  const text = 'The Bears are 3–11 on Thursdays while wearing #9 (87.5% of 14 games) <b>x</b>';
  highlightNumbers(el, text);
  expect(el.textContent).toBe(text);
  expect([...el.querySelectorAll('.num')].map((n) => n.textContent)).toEqual(['3–11', '#9', '87.5%', '14']);
  expect(el.querySelector('b')).toBeNull();
});
