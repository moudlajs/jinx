import { expect, test } from 'vitest';
import { seedFromHash } from './hash';

test('seedFromHash accepts only a seed', () => {
  expect(seedFromHash('#abc12')).toBe('abc12');
  expect(seedFromHash('')).toBeNull();
  expect(seedFromHash('#<script>')).toBeNull();
  expect(seedFromHash('#abc12&x=1')).toBeNull();
});
