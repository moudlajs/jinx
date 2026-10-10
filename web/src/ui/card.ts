// Renders a Stat into the card. Text only, via text nodes; numbers get a highlight span.
import { t } from '../i18n';
import type { Stat } from '../stat';

export interface CardElements {
  card: HTMLElement;
  badge: HTMLElement;
  badgeShort: HTMLElement;
  badgeLong: HTMLElement;
  text: HTMLElement;
  punchline: HTMLElement;
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

export function renderCard(els: CardElements, stat: Stat): void {
  const fake = stat.mode === 'fake';
  els.card.dataset.mode = stat.mode;
  els.card.dataset.seed = stat.seed ?? '';
  els.badge.classList.toggle('badge-real', !fake);
  els.badgeShort.textContent = t(fake ? 'card.badge.satire' : 'card.badge.real');
  els.badgeLong.textContent = t(fake ? 'card.badge.satireLong' : 'card.badge.realLong');
  highlightNumbers(els.text, stat.text);
  els.punchline.textContent = stat.punchline ?? '';
  els.punchline.hidden = !stat.punchline;
  els.card.hidden = false;
  els.card.classList.remove('enter');
  void els.card.offsetWidth; // restart the entry animation
  els.card.classList.add('enter');
}
