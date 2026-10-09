// Fejk generator: word banks + seeded RNG → a Stat. Pure, no DOM.
import conditionsData from '../data/fejk/conditions.json';
import metricsData from '../data/fejk/metrics.json';
import punchlinesData from '../data/fejk/punchlines.json';
import subjectsData from '../data/fejk/subjects.json';
import templatesData from '../data/fejk/templates.json';
import type { Stat } from '../stat';
import { createRng, type Rng } from './rng';
import { parseSeed, randomSeed, seedToNumber } from './seed';

export interface Subject {
  id: string;
  kind: 'team' | 'position' | 'archetype';
  number: 'sg' | 'pl';
  label: string;
}

export interface Condition {
  id: string;
  category: string;
  text: string;
}

export interface Metric {
  id: string;
  kind: 'record' | 'percentage' | 'count';
  extreme?: 'low' | 'high' | 'both';
  unit?: string;
  label: string;
  sg: string;
  pl: string;
}

export const banks = {
  subjects: subjectsData as Subject[],
  conditions: conditionsData as Condition[],
  metrics: metricsData as Metric[],
  templates: templatesData as string[],
  punchlines: punchlinesData as string[],
};

const PUNCHLINE_CHANCE = 0.35;
// Mostly 2–3 conditions; 4 is rare so the card stays readable on a phone.
const CONDITION_COUNTS = [2, 2, 2, 3, 3, 3, 4];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function fillRanges(text: string, rng: Rng): string {
  return text.replace(/\{(\d+)\.\.(\d+)\}/g, (_, a: string, b: string) => String(rng.int(Number(a), Number(b))));
}

export function joinConditions(parts: string[]): string {
  if (parts.length <= 2) return parts.join(' ');
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

export function fillTemplate(template: string, slots: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = slots[key];
    if (value === undefined) throw new Error(`template slot ${match} has no value: ${template}`);
    return value;
  });
}

function pickConditions(rng: Rng, count: number): Condition[] {
  const categories = rng.sample([...new Set(banks.conditions.map((c) => c.category))], count);
  return categories.map((cat) => rng.pick(banks.conditions.filter((c) => c.category === cat)));
}

function formatPct(p: number): string {
  return `${Number.isInteger(p) ? p : p.toFixed(1)}%`;
}

function numbersFor(metric: Metric, rng: Rng): { phrase: Record<string, string>; numbers: Stat['numbers'] } {
  switch (metric.kind) {
    case 'record': {
      const total = rng.int(8, 20);
      const few = rng.int(0, 3);
      const wins = rng.chance(0.6) ? few : total - few;
      const losses = total - wins;
      return { phrase: { record: `${wins}–${losses}` }, numbers: { sampleSize: total, record: { wins, losses } } };
    }
    case 'percentage': {
      const n = rng.int(9, 48);
      const extreme = metric.extreme === 'both' || !metric.extreme ? rng.pick(['low', 'high'] as const) : metric.extreme;
      const fraction = extreme === 'low' ? rng.int(2, 14) / 100 : rng.int(84, 99) / 100;
      const k = Math.min(n, Math.max(1, Math.round(n * fraction)));
      const pct = Math.round((k / n) * 1000) / 10;
      return { phrase: { pct: formatPct(pct) }, numbers: { sampleSize: n, percentage: pct } };
    }
    case 'count': {
      const count = rng.int(9, 41);
      return { phrase: { count: String(count) }, numbers: { sampleSize: rng.int(4, 16), count } };
    }
  }
}

export function generate(seed: string): Stat {
  if (parseSeed(seed) !== seed) throw new Error(`invalid seed: ${JSON.stringify(seed)}`);
  const rng = createRng(seedToNumber(seed));
  const subject = rng.pick(banks.subjects);
  const metric = rng.pick(banks.metrics);
  const conditions = pickConditions(rng, rng.pick(CONDITION_COUNTS)).map((c) => ({ id: c.id, label: fillRanges(c.text, rng) }));
  const { phrase, numbers } = numbersFor(metric, rng);
  const metricText = fillTemplate(subject.number === 'sg' ? metric.sg : metric.pl, phrase);
  const joined = joinConditions(conditions.map((c) => c.label));
  const unit = metric.unit ?? 'games';

  const text = fillTemplate(rng.pick(banks.templates), {
    subject: subject.label,
    Subject: capitalize(subject.label),
    metric: metricText,
    conditions: joined,
    Conditions: capitalize(joined),
    since: String(rng.int(1970, 2015)),
    years: String(rng.int(3, 12)),
    sample: `${numbers.sampleSize} ${unit}`,
  });

  const stat: Stat = {
    id: `fejk-${seed}`,
    mode: 'fejk',
    text,
    subject: { kind: subject.kind, label: subject.label },
    conditions,
    metric: { id: metric.id, label: metric.label },
    numbers,
    seed,
  };
  if (rng.chance(PUNCHLINE_CHANCE)) stat.punchline = rng.pick(banks.punchlines);
  return stat;
}

// A fresh stat whose text differs from the current one.
export function nextStat(current?: Stat, seedFn: () => string = randomSeed): Stat {
  for (let i = 0; i < 20; i++) {
    const stat = generate(seedFn());
    if (stat.text !== current?.text) return stat;
  }
  throw new Error('could not generate a different stat');
}
