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

test('a localStorage that throws on access is survivable', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('denied'); } });
  try {
    expect(loadPlay().guessBest).toBe(0);
    expect(() => savePlay({ guessBest: 1 })).not.toThrow();
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
