import { expect, test } from 'vitest';
import { generate } from './fake/generate';
import { hashFor, parseHash } from './hash';

test('parseHash accepts a Fake seed or a Real id, nothing else', () => {
  expect(parseHash('#abc12')).toEqual({ mode: 'fake', seed: 'abc12' });
  expect(parseHash('#real-9d86edf15bec')).toEqual({ mode: 'real', id: 'real-9d86edf15bec' });
  expect(parseHash('')).toBeNull();
  expect(parseHash('#<script>')).toBeNull();
  expect(parseHash('#abc12&x=1')).toBeNull();
  expect(parseHash('#real-xyz')).toBeNull();
});

test('hashFor round-trips', () => {
  const fake = generate('abc12');
  expect(parseHash(`#${hashFor(fake)}`)).toEqual({ mode: 'fake', seed: 'abc12' });
});
