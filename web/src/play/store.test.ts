import { expect, test } from 'vitest';
import { loadPlay, savePlay } from './store';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

test('round-trips and ignores junk', () => {
  const s = memory();
  savePlay({ guessBest: 7, daily: { '3': [true, false] }, ou: { w: 4, l: 2 } }, s);
  expect(loadPlay(s)).toEqual({ guessBest: 7, daily: { '3': [true, false] }, ou: { w: 4, l: 2 } });
  s.setItem('jinx-play', '{"guessBest":-3,"daily":{"x":[true],"4":[1,2],"5":[true,true,true,true,true,true]},"ou":{"w":"9","l":-1}}');
  expect(loadPlay(s)).toEqual({ guessBest: 0, daily: {}, ou: { w: 0, l: 0 } });
  s.setItem('jinx-play', 'not json');
  expect(loadPlay(s)).toEqual({ guessBest: 0, daily: {}, ou: { w: 0, l: 0 } });
});

test('keeps only the latest 60 days', () => {
  const s = memory();
  const daily = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [String(i + 1), [true]]));
  savePlay({ guessBest: 0, daily, ou: { w: 0, l: 0 } }, s);
  const kept = Object.keys(loadPlay(s).daily).map(Number);
  expect(kept).toHaveLength(60);
  expect(Math.min(...kept)).toBe(11);
});

test('storage that throws is survivable', () => {
  const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
  expect(loadPlay(broken).guessBest).toBe(0);
  expect(() => savePlay({ guessBest: 1, daily: {}, ou: { w: 0, l: 0 } }, broken)).not.toThrow();
});

test('a localStorage that throws on access is survivable', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('denied'); } });
  try {
    expect(loadPlay().guessBest).toBe(0);
    expect(() => savePlay({ guessBest: 1, daily: {}, ou: { w: 0, l: 0 } })).not.toThrow();
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
