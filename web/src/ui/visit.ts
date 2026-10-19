// The right rail on wide screens: the visit's scorecard and the last cards, each a link back to its card.
import { hashFor } from '../hash';
import { t } from '../i18n';
import type { Stat } from '../stat';
import type { Visit } from '../visit';
import { headline } from './headline';

export interface VisitElements {
  dealt: HTMLElement;
  dealtLabel: HTMLElement;
  fake: HTMLElement;
  real: HTMLElement;
  bar: HTMLElement;
  wildest: HTMLElement;
  wildestCard: HTMLElement;
  last: HTMLElement;
  empty: HTMLElement;
}

const span = (className: string, text: string) => Object.assign(document.createElement('span'), { className, textContent: text });

export function mini(stat: Stat): HTMLAnchorElement {
  const a = document.createElement('a');
  a.className = 'mini';
  a.href = `#${hashFor(stat)}`;
  const fake = stat.mode === 'fake';
  const badge = span(fake ? 'badge' : 'badge badge-real', t(fake ? 'card.badge.satire' : 'card.badge.real'));
  const body = span('mini-body', '');
  body.append(badge, span('mini-text', stat.text));
  a.append(span('mini-thumb', headline(stat).value), body);
  return a;
}

export function renderVisit(els: VisitElements, visit: Visit): void {
  const dealt = visit.fake + visit.real;
  els.dealt.textContent = String(dealt);
  els.dealtLabel.textContent = t(dealt === 1 ? 'visit.dealtOne' : 'visit.dealt');
  els.fake.textContent = t('visit.fake', { n: String(visit.fake) });
  els.real.textContent = t('visit.real', { n: String(visit.real) });
  els.bar.style.setProperty('--fake', String(visit.fake));
  els.bar.style.setProperty('--real', String(visit.real));
  els.wildest.hidden = !visit.wildest;
  els.wildestCard.replaceChildren(...(visit.wildest ? [mini(visit.wildest)] : []));
  els.last.replaceChildren(...visit.last.map(li));
  els.empty.hidden = visit.last.length > 0;
}

function li(stat: Stat): HTMLLIElement {
  const item = document.createElement('li');
  item.append(mini(stat));
  return item;
}
