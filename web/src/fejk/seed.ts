// Seeds are uint32 values written in base36, so they fit in a short URL hash.

const SEED_RE = /^[0-9a-z]{1,7}$/;
const MAX = 2 ** 32;

export function parseSeed(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (!SEED_RE.test(s)) return null;
  const n = parseInt(s, 36);
  return n < MAX ? n.toString(36) : null;
}

export function seedToNumber(seed: string): number {
  return parseInt(seed, 36) >>> 0;
}

export function randomSeed(): string {
  const [n = 0] = crypto.getRandomValues(new Uint32Array(1));
  return n.toString(36);
}
