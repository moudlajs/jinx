// Daily Five: the same five face-down cards for everyone on a given day, picked from the date. No server.
import decks from '../data/fake/decks.json';
import { generate } from '../fake/generate';
import { createRng } from '../fake/rng';
import { isKey, t } from '../i18n';
import type { Stat } from '../stat';
import type { Game } from './game';
import type { PlayStore } from './store';

export const FIVE = 5;
// No. 1 is launch day.
const LAUNCH = Date.UTC(2026, 9, 23);

export function dayNumber(now: Date): number {
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - LAUNCH) / 86_400_000) + 1;
}

// Two or three Fake among five. Fake seeds come from the newest deck and Real picks from this week's
// stats.json, so everyone sees the same five unless a deploy lands mid-day.
export function dailyFive(day: number, real: Stat[]): Stat[] {
  const rng = createRng(Math.imul(day, 0x9e3779b1));
  const fakeSlots = rng.sample([0, 1, 2, 3, 4], rng.int(2, 3));
  const byId = [...real].sort((a, b) => (a.id < b.id ? -1 : 1));
  const picks = rng.sample(byId, FIVE - fakeSlots.length);
  const deck = decks.length - 1;
  const fake = () => generate((deck * 2 ** 32 + Math.floor(rng.next() * 2 ** 32)).toString(36));
  return Array.from({ length: FIVE }, (_, i) => (fakeSlots.includes(i) ? fake() : (picks.shift() ?? fake())));
}

export function shareRow(day: number, results: boolean[], url: string): string {
  const right = results.filter(Boolean).length;
  const row = results.map((ok) => (ok ? '🟨' : '⬛')).join('');
  return `${t('play.daily.shareTitle', { day: String(day), right: String(right) })}\n${row}\n${url}`;
}

export function createDaily(store: PlayStore, save: () => void, url: string, now: () => Date = () => new Date()): Game {
  const day = dayNumber(now());
  const key = String(day);
  let five: Stat[] | undefined;
  const results = () => store.daily[key] ?? [];
  const right = () => results().filter(Boolean).length;
  return {
    id: 'daily',
    choices: [
      { value: 'fake', label: t('play.fake'), tone: 'fake' },
      { value: 'real', label: t('play.real'), tone: 'real' },
    ],
    deal(stats) {
      five ??= dailyFive(day, stats);
      return five[results().length];
    },
    answer(stat, choice) {
      const ok = choice === stat.mode;
      store.daily[key] = [...results(), ok].slice(0, FIVE);
      save();
      return { ok, title: t(ok ? 'play.right' : 'play.wrong'), sub: t(stat.mode === 'fake' ? 'play.wasFake' : 'play.wasReal') };
    },
    nextLabel: () => t(results().length >= FIVE ? 'play.daily.seeRow' : 'play.next'),
    view() {
      const n = { day: key, k: String(right()), n: String(results().length), days: String(Object.keys(store.daily).length) };
      return {
        line: t('play.daily.line', n),
        title: t('play.daily.title'),
        big: `${n.k}/${FIVE}`,
        bigLabel: t('play.daily.bigLabel', n),
        details: [t('play.daily.no', n), t('play.daily.days', n)],
        dots: results(),
      };
    },
    progress: () => Array.from({ length: FIVE }, (_, i) => results()[i]),
    end() {
      const rank = `play.daily.rank${right()}`;
      return {
        kicker: t('play.daily.kicker', { day: key }),
        big: `${right()}/${FIVE}`,
        text: isKey(rank) ? t(rank) : '',
        squares: results(),
        share: shareRow(day, results(), url),
      };
    },
  };
}
