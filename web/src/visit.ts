// This visit: how many cards were dealt, the fake/real split, the wildest one and the last few. Memory only.
import type { Stat } from './stat';

export const LAST = 3;

export interface Visit {
  seen: Set<string>;
  fake: number;
  real: number;
  wildest: Stat | undefined;
  last: Stat[];
}

export function newVisit(): Visit {
  return { seen: new Set(), fake: 0, real: 0, wildest: undefined, last: [] };
}

// More conditions is wilder; a thinner sample breaks the tie.
export function wilder(a: Stat, b: Stat): boolean {
  if (a.conditions.length !== b.conditions.length) return a.conditions.length > b.conditions.length;
  return a.numbers.sampleSize < b.numbers.sampleSize;
}

// A card shown again (from the pile, the ticker or a link) moves to the top but isn't counted twice.
export function see(visit: Visit, previous: Stat | undefined, next: Stat): Visit {
  const fresh = !visit.seen.has(next.id);
  const others = visit.last.filter((s) => s.id !== next.id && s.id !== previous?.id);
  return {
    seen: fresh ? new Set(visit.seen).add(next.id) : visit.seen,
    fake: visit.fake + (fresh && next.mode === 'fake' ? 1 : 0),
    real: visit.real + (fresh && next.mode === 'real' ? 1 : 0),
    wildest: fresh && (!visit.wildest || wilder(next, visit.wildest)) ? next : visit.wildest,
    last: [...(previous && previous.id !== next.id ? [previous] : []), ...others].slice(0, LAST),
  };
}
