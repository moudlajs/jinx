// Real mode: stats.json from the engine, loaded once on first use.
import type { Stat } from './stat';

export interface StatsFile {
  version: 1;
  generatedAt: string;
  attribution: string;
  stats: Stat[];
}

export const REAL_ID_RE = /^real-[0-9a-f]{12}$/;

// Light shape check; the engine validates the full schema before publishing.
export function parseStatsFile(data: unknown): StatsFile {
  const d = data as Partial<StatsFile> | null;
  if (!d || d.version !== 1 || !Array.isArray(d.stats) || d.stats.length === 0) {
    throw new Error('stats.json has an unexpected shape');
  }
  const stats = d.stats.filter(
    (s) => s?.mode === 'real' && typeof s.text === 'string' && REAL_ID_RE.test(String(s.id)),
  );
  if (stats.length === 0) throw new Error('stats.json has no usable stats');
  return { version: 1, generatedAt: String(d.generatedAt), attribution: String(d.attribution), stats };
}

let cache: Promise<StatsFile> | undefined;

export function loadStats(url: string, fetchFn: typeof fetch = fetch): Promise<StatsFile> {
  cache ??= fetchFn(url)
    .then((r) => {
      if (!r.ok) throw new Error(`stats.json: HTTP ${r.status}`);
      return r.json() as Promise<unknown>;
    })
    .then(parseStatsFile)
    .catch((err: unknown) => {
      cache = undefined; // let the next attempt retry
      throw err;
    });
  return cache;
}

export function pickReal(stats: Stat[], current?: Stat, random: () => number = Math.random): Stat {
  const pool = stats.length > 1 ? stats.filter((s) => s.id !== current?.id) : stats;
  return pool[Math.floor(random() * pool.length)] ?? (pool[0] as Stat);
}
