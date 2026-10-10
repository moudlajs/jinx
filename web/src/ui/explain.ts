// "How did we compute this?" for Real stats: filters, sample, seasons and the SQL. Text only.
import type { Stat } from '../stat';

export interface ExplainElements {
  root: HTMLDetailsElement;
  metric: HTMLElement;
  filters: HTMLElement;
  sample: HTMLElement;
  seasons: HTMLElement;
  query: HTMLElement;
}

export function renderExplain(els: ExplainElements, stat: Stat): void {
  const real = stat.mode === 'real' && stat.query !== undefined && stat.seasons !== undefined;
  els.root.hidden = !real;
  els.root.open = false;
  if (!real) return;
  els.metric.textContent = stat.metric.label;
  els.filters.replaceChildren(
    ...stat.conditions.map((c) => {
      const li = document.createElement('li');
      li.textContent = c.label;
      return li;
    }),
  );
  els.sample.textContent = String(stat.numbers.sampleSize);
  els.seasons.textContent = `${stat.seasons?.from}–${stat.seasons?.to}`;
  els.query.textContent = stat.query ?? '';
}
