// Seeds are base36 numbers that fit in a short URL hash. The low 32 bits seed the RNG and the rest names the
// word-bank deck, so a link keeps its card after the banks grow. Seven characters leave room for 18 decks.
import decks from '../data/fake/decks.json';

const SEED_RE = /^[0-9a-z]{1,7}$/;
const SPAN = 2 ** 32;
const MAX = decks.length * SPAN;

export function parseSeed(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (!SEED_RE.test(s)) return null;
  const n = parseInt(s, 36);
  return n < MAX ? n.toString(36) : null;
}

export function seedToNumber(seed: string): number {
  return parseInt(seed, 36) >>> 0;
}

export function deckOf(seed: string): number {
  return Math.floor(parseInt(seed, 36) / SPAN);
}

export function randomSeed(): string {
  const [n = 0] = crypto.getRandomValues(new Uint32Array(1));
  return ((decks.length - 1) * SPAN + n).toString(36);
}
