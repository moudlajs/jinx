// The URL hash names one stat: "#abc12" (Fejk seed) or "#real-<id>". Anything else is ignored.
import { parseSeed } from './fejk/seed';
import { REAL_ID_RE } from './real';
import type { Stat } from './stat';

export type HashTarget = { mode: 'fejk'; seed: string } | { mode: 'real'; id: string };

export function parseHash(hash: string): HashTarget | null {
  const raw = hash.replace(/^#/, '');
  if (REAL_ID_RE.test(raw)) return { mode: 'real', id: raw };
  const seed = parseSeed(raw);
  return seed ? { mode: 'fejk', seed } : null;
}

export function hashFor(stat: Stat): string {
  return stat.mode === 'real' ? stat.id : (stat.seed ?? '');
}

export function setHash(stat: Stat): void {
  history.replaceState(null, '', `#${hashFor(stat)}`);
}
