// The big number on a card and what it counts. Pure, no DOM.
import { isKey, t } from '../i18n';
import type { Stat } from '../stat';

export interface Headline {
  value: string;
  label: string;
}

export function formatPct(p: number): string {
  return `${Number.isInteger(p) ? p : p.toFixed(1)}%`;
}

// Points per game has no number field, so take the first number in the text that isn't a year.
function firstNumber(text: string): string | undefined {
  return text.match(/\d+(?:\.\d+)?/g)?.find((n) => !/^(19|20)\d\d$/.test(n));
}

export function headline(stat: Stat): Headline {
  const { record, percentage, count } = stat.numbers;
  const key = `headline.${stat.metric.id}`;
  const label = stat.mode === 'real' && isKey(key) ? t(key) : stat.metric.label;
  if (record) {
    const ties = record.ties ? `–${record.ties}` : '';
    return { value: `${record.wins}–${record.losses}${ties}`, label };
  }
  if (percentage !== undefined) return { value: formatPct(percentage), label };
  if (count !== undefined) return { value: String(count), label };
  return { value: firstNumber(stat.text) ?? String(stat.numbers.sampleSize), label };
}

// "No. K3F9A2": the seed for Fake, a slice of the id for Real.
export function cardCode(stat: Stat): string {
  return (stat.seed ?? stat.id.replace(/^real-/, '').slice(0, 6)).toUpperCase();
}
