// Renders a Stat into both faces of the card. Text only, via text nodes; numbers get a highlight span.
import { t } from '../i18n';
import type { Stat } from '../stat';
import { back } from './back';
import { cardCode, headline } from './headline';

export interface CardElements {
  card: HTMLElement;
  badge: HTMLElement;
  badgeShort: HTMLElement;
  badgeLong: HTMLElement;
  code: HTMLElement;
  big: HTMLElement;
  bigLabel: HTMLElement;
  text: HTMLElement;
  punchline: HTMLElement;
  meta: HTMLElement;
  backBadge: HTMLElement;
  backTitle: HTMLElement;
  backCode: HTMLElement;
  dots: HTMLElement;
  backText: HTMLElement;
  chips: HTMLElement;
  backSource: HTMLElement;
}

// Records (3–11), percentages, #jersey, $price and plain counts.
const NUMBER_RE = /(\d+–\d+|[#$]?\d+(?:\.\d+)?%?)/;

export function highlightNumbers(el: HTMLElement, text: string): void {
  el.replaceChildren(
    ...text.split(NUMBER_RE).map((part, i) => {
      if (i % 2 === 0) return document.createTextNode(part);
      const span = document.createElement('span');
      span.className = 'num';
      span.textContent = part;
      return span;
    }),
  );
}

function items(tag: string, className: string, texts: string[]): HTMLElement[] {
  return texts.map((text) => {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  });
}

export function renderCard(els: CardElements, stat: Stat): void {
  const fake = stat.mode === 'fake';
  els.card.dataset.mode = stat.mode;
  els.card.dataset.seed = stat.seed ?? '';
  // Both faces carry the satire or real-data badge, so a turned card is still labelled.
  for (const badge of [els.badge, els.backBadge]) badge.classList.toggle('badge-real', !fake);
  els.backBadge.textContent = t(fake ? 'card.badge.satireLong' : 'card.badge.realLong');
  els.badgeShort.textContent = t(fake ? 'card.badge.satire' : 'card.badge.real');
  els.badgeLong.textContent = t(fake ? 'card.badge.satireLong' : 'card.badge.realLong');
  const code = t('card.number', { code: cardCode(stat) });
  els.code.textContent = code;

  const head = headline(stat);
  els.big.textContent = head.value;
  els.bigLabel.textContent = head.label;
  highlightNumbers(els.text, stat.text);
  els.punchline.textContent = stat.punchline ?? '';
  els.punchline.hidden = !stat.punchline;
  els.meta.textContent = fake
    ? t('card.fakeMeta')
    : t('card.realMeta', { from: String(stat.seasons?.from ?? ''), to: String(stat.seasons?.to ?? '') });

  const b = back(stat);
  els.backTitle.textContent = b.title;
  els.backCode.textContent = code;
  els.dots.replaceChildren(...b.dots.map((on) => Object.assign(document.createElement('span'), { className: on ? 'dot on' : 'dot' })));
  els.dots.hidden = b.dots.length === 0;
  if (b.dotsLabel) els.dots.setAttribute('aria-label', b.dotsLabel);
  else els.dots.removeAttribute('aria-label');
  els.backText.textContent = b.text;
  els.chips.replaceChildren(...items('li', 'chip', b.chips));
  els.backSource.textContent = b.source;
  els.card.hidden = false;
}
