// Play scores, kept in this browser only. Storage can be missing or full; then nothing is kept.
const KEY = 'jinx-play';

export interface PlayStore {
  guessBest: number;
}

const EMPTY: PlayStore = { guessBest: 0 };

// Storage is resolved inside the try: just touching localStorage throws in some sandboxed pages.
export function loadPlay(storage?: Pick<Storage, 'getItem'>): PlayStore {
  try {
    const raw: unknown = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return { ...EMPTY };
    const r = raw as Partial<PlayStore>;
    return { guessBest: Number.isInteger(r.guessBest) && (r.guessBest as number) >= 0 ? (r.guessBest as number) : 0 };
  } catch {
    return { ...EMPTY };
  }
}

export function savePlay(data: PlayStore, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(data));
  } catch {
    // Private mode or full: the score just isn't kept.
  }
}
