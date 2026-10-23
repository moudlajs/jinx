// Over / Under: a real stat with its number hidden and a line to beat. A parody of a betting line: no money, no odds.
import { createRng } from '../fake/rng';
import { t } from '../i18n';
import { pickReal } from '../real';
import type { Stat } from '../stat';
import { formatPct, headline } from '../ui/headline';
import type { Game } from './game';
import type { PlayStore } from './store';

export interface Line {
  value: number;
  line: number;
  // What the line is in, for "The line: 3.5 wins".
  unit: string;
  // The stat with every number that gives the value away replaced.
  big: string;
  text: string;
}

// Records, percentages, counts and averages; whatever the big number on the card is.
function valueOf(stat: Stat): { value: number; hide: string[]; unit: string } | undefined {
  const { record, percentage, count, average } = stat.numbers;
  const label = headline(stat).label;
  if (record) {
    const r = `${record.wins}–${record.losses}${record.ties ? `–${record.ties}` : ''}`;
    return { value: record.wins, hide: [r, `${record.wins}–${record.losses}`], unit: t('play.ou.wins') };
  }
  if (percentage !== undefined) {
    return { value: percentage, hide: [formatPct(percentage), ...(count !== undefined ? [String(count)] : [])], unit: '%' };
  }
  if (count !== undefined) return { value: count, hide: [String(count)], unit: ` ${label}` };
  if (average !== undefined) return { value: average, hide: [average.toFixed(1), String(average)], unit: ` ${label}` };
  return undefined;
}

// Whole numbers in the text are matched as whole tokens, so hiding "5" leaves "2015" alone.
const TOKEN_RE = /(\d+–\d+(?:–\d+)?|[#$]?\d+(?:\.\d+)?%?)/;

export function hideNumbers(text: string, hide: string[]): string {
  return text
    .split(TOKEN_RE)
    .map((part, i) => (i % 2 === 1 && hide.includes(part) ? (part.includes('–') ? '?–?' : '??') : part))
    .join('');
}

// The words around a number are tells too. The engine (render.py) writes a 0 as "no interceptions"
// or "none of 10", adds "just" to low ones, and makes 1 singular.
function hideWords(text: string, value: number): string {
  let out = text.replace(/\bjust /g, '');
  if (value === 0) out = out.replace(/\bno (?=\w)/, '?? ').replace(/\bnone of\b/, '?? of');
  return out.replace(/\?\? interception\b(?!s)/, '?? interceptions').replace(/\?\? touchdown pass\b(?!es)/, '?? touchdown passes');
}

// The line sits a little off the true value, on the half, never on it. Same stat, same line.
export function lineFor(stat: Stat): Line | undefined {
  const v = valueOf(stat);
  if (!v) return undefined;
  const rng = createRng(parseInt(stat.id.slice(-8), 16) || 1);
  const pct = v.unit === '%';
  const top = pct ? 100 : Infinity;
  const spread = pct ? 12 : Math.max(1.5, Math.abs(v.value) * 0.3);
  const offset = (0.25 + 0.75 * rng.next()) * spread * (rng.chance(0.5) ? 1 : -1);
  // Off the edge (below 0, above 100%), the line goes the other way instead of piling up at the edge.
  const raw = v.value + offset < 0 || v.value + offset > top ? v.value - offset : v.value + offset;
  let line = Math.min(top - 0.5, Math.max(0.5, Math.floor(raw) + 0.5));
  if (line === v.value) line += line + 1 < top ? 1 : -1;
  return {
    value: v.value,
    line,
    unit: v.unit,
    big: stat.numbers.record ? '?–?' : '??',
    text: hideWords(hideNumbers(stat.text, v.hide), v.value),
  };
}

export function createOverUnder(store: PlayStore, save: () => void, random: () => number = Math.random): Game {
  const history: boolean[] = [];
  return {
    id: 'overunder',
    choices: [
      { value: 'over', label: t('play.ou.over'), tone: 'line' },
      { value: 'under', label: t('play.ou.under'), tone: 'line' },
    ],
    deal(stats, { previous, ticker }) {
      const pool = stats.filter((s) => !ticker.has(s.id) && lineFor(s));
      const usable = pool.length ? pool : stats.filter((s) => lineFor(s));
      return usable.length ? pickReal(usable, previous, random) : undefined;
    },
    face(stat) {
      const l = lineFor(stat) as Line;
      return { big: l.big, text: l.text, line: t('play.ou.line', { line: `${l.line}${l.unit}` }) };
    },
    answer(stat, choice) {
      const l = lineFor(stat) as Line;
      const over = l.value > l.line;
      const ok = (choice === 'over') === over;
      store.ou = { w: store.ou.w + (ok ? 1 : 0), l: store.ou.l + (ok ? 0 : 1) };
      history.push(ok);
      save();
      return {
        ok,
        title: t(ok ? 'play.ou.right' : 'play.ou.wrong'),
        sub: t(over ? 'play.ou.cameOver' : 'play.ou.cameUnder', { value: headline(stat).value }),
      };
    },
    nextLabel: () => t('play.ou.next'),
    status: () => t('play.menu.ouStatus', { w: String(store.ou.w), l: String(store.ou.l) }),
    view() {
      const { w, l } = store.ou;
      const n = { w: String(w), l: String(l), pct: String(w + l ? Math.round((w / (w + l)) * 100) : 0) };
      return {
        line: t('play.ou.scoreline', n),
        title: t('play.ou.title'),
        big: `${w}–${l}`,
        bigLabel: t('play.ou.bigLabel'),
        details: [t('play.ou.pct', n), t('play.ou.bankroll')],
        dots: history.slice(-14),
      };
    },
  };
}
