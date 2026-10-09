// The URL hash holds only a seed: "#abc12". Anything else is ignored.
import { parseSeed } from './fejk/seed';

export function seedFromHash(hash: string): string | null {
  return parseSeed(hash.replace(/^#/, ''));
}

export function setHashSeed(seed: string): void {
  history.replaceState(null, '', `#${seed}`);
}
