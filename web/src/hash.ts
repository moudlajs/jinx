// The URL hash names one stat: "#abc12" (Fake seed) or "#real-<id>", or a game: "#play-daily".
// Anything else is ignored. Game links carry a dash, which a seed never has.
import { parseSeed } from './fake/seed';
import type { GameId } from './play/game';
import { REAL_ID_RE } from './real';
import type { Stat } from './stat';

export type HashTarget = { mode: 'fake'; seed: string } | { mode: 'real'; id: string };

export function parseHash(hash: string): HashTarget | null {
  const raw = hash.replace(/^#/, '');
  if (REAL_ID_RE.test(raw)) return { mode: 'real', id: raw };
  const seed = parseSeed(raw);
  return seed ? { mode: 'fake', seed } : null;
}

const PLAY_RE = /^play-(daily|guess|overunder)$/;

export function parsePlayHash(hash: string): GameId | null {
  const m = PLAY_RE.exec(hash.replace(/^#/, ''));
  return m ? (m[1] as GameId) : null;
}

export function hashFor(stat: Stat): string {
  return stat.mode === 'real' ? stat.id : (stat.seed ?? '');
}

export function setHash(stat: Stat): void {
  history.replaceState(null, '', `#${hashFor(stat)}`);
}
