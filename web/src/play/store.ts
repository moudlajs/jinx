// Play scores, kept in this browser only. Storage can be missing or full; then nothing is kept.
const KEY = 'jinx-play';
const DAYS_KEPT = 60;

export interface PlayStore {
  guessBest: number;
  // Daily Five answers by day number, right or wrong, in order.
  daily: Record<string, boolean[]>;
}

const count = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);

function cleanDaily(v: unknown): Record<string, boolean[]> {
  if (!v || typeof v !== 'object') return {};
  const days = Object.entries(v as Record<string, unknown>)
    .filter(([day, r]) => /^\d+$/.test(day) && Array.isArray(r) && r.length <= 5 && r.every((x) => typeof x === 'boolean'))
    .sort(([a], [b]) => Number(b) - Number(a))
    .slice(0, DAYS_KEPT);
  return Object.fromEntries(days) as Record<string, boolean[]>;
}

// Storage is resolved inside the try: just touching localStorage throws in some sandboxed pages.
export function loadPlay(storage?: Pick<Storage, 'getItem'>): PlayStore {
  try {
    const raw: unknown = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY) ?? 'null');
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return { guessBest: count(r.guessBest), daily: cleanDaily(r.daily) };
  } catch {
    return { guessBest: 0, daily: {} };
  }
}

export function savePlay(data: PlayStore, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify({ ...data, daily: cleanDaily(data.daily) }));
  } catch {
    // Private mode or full: the score just isn't kept.
  }
}
