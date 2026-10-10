// Small seeded PRNG (mulberry32). Same seed, same sequence, in every browser.

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  sample<T>(items: readonly T[], k: number): T[];
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('pick from an empty list');
    return items[int(0, items.length - 1)] as T;
  };
  const sample = <T>(items: readonly T[], k: number): T[] => {
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = int(0, i);
      [pool[i], pool[j]] = [pool[j] as T, pool[i] as T];
    }
    return pool.slice(0, k);
  };
  return { next, int, pick, sample, chance: (p) => next() < p };
}
