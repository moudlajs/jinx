import { expect, test } from 'vitest';
import { loadPlay, savePlay } from './store';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

test('round-trips and ignores junk', () => {
  const s = memory();
  savePlay({ guessBest: 7 }, s);
  expect(loadPlay(s)).toEqual({ guessBest: 7 });
  s.setItem('jinx-play', '{"guessBest":-3}');
  expect(loadPlay(s).guessBest).toBe(0);
  s.setItem('jinx-play', 'not json');
  expect(loadPlay(s).guessBest).toBe(0);
});

test('storage that throws is survivable', () => {
  const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
  expect(loadPlay(broken).guessBest).toBe(0);
  expect(() => savePlay({ guessBest: 1 }, broken)).not.toThrow();
});
