// The back of the card: how a Real stat was counted, or what a Fake one is made of. Pure, no DOM.
import { isKey, t } from '../i18n';
import type { Stat } from '../stat';
import { headline } from './headline';

export interface Back {
  title: string;
  text: string;
  // One dot per game or try, filled for the ones that count; empty when there are too many to draw.
  dots: boolean[];
  dotsLabel: string;
  chips: string[];
  source: string;
}

const MAX_DOTS = 40;

function dotsFor(stat: Stat): { total: number; hits: number } | undefined {
  const { record, percentage, count, sampleSize } = stat.numbers;
  if (record) return { total: record.wins + record.losses + (record.ties ?? 0), hits: record.wins };
  if (percentage !== undefined && count !== undefined) return { total: sampleSize, hits: count };
  return undefined;
}

function realText(stat: Stat): string {
  const { record, count, sampleSize } = stat.numbers;
  const vars = { n: String(sampleSize), k: String(count ?? 0), value: headline(stat).value };
  if (record) {
    const r = { ...vars, wins: String(record.wins), losses: String(record.losses), ties: String(record.ties ?? 0) };
    return t(record.ties ? 'back.recordTies' : 'back.record', r);
  }
  const key = `back.${stat.metric.id}`;
  return t(isKey(key) ? key : 'back.generic', vars);
}

export function back(stat: Stat): Back {
  if (stat.mode === 'fake') {
    return {
      title: t('back.fakeTitle'),
      text: t('back.fakeText'),
      dots: [],
      dotsLabel: '',
      chips: [stat.subject.label, stat.metric.label, ...stat.conditions.map((c) => c.label)],
      source: t('back.fakeSource'),
    };
  }
  const d = dotsFor(stat);
  const draw = d !== undefined && d.total <= MAX_DOTS;
  const chips = stat.conditions.map((c) => c.label);
  if (stat.seasons) chips.push(`${stat.seasons.from}–${stat.seasons.to}`);
  return {
    title: t('back.realTitle'),
    text: realText(stat),
    dots: draw ? Array.from({ length: d.total }, (_, i) => i < d.hits) : [],
    dotsLabel: draw ? t('back.dots', { k: String(d.hits), n: String(d.total) }) : '',
    chips,
    source: t('back.realSource'),
  };
}
