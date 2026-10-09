// Renders a Stat into the card. Text only, via textContent.
import type { Stat } from '../stat';

export interface CardElements {
  card: HTMLElement;
  badge: HTMLElement;
  text: HTMLElement;
  punchline: HTMLElement;
}

export function renderCard(els: CardElements, stat: Stat): void {
  els.card.dataset.mode = stat.mode;
  els.card.dataset.seed = stat.seed ?? '';
  els.badge.hidden = stat.mode !== 'fejk';
  els.text.textContent = stat.text;
  els.punchline.textContent = stat.punchline ?? '';
  els.punchline.hidden = !stat.punchline;
  els.card.hidden = false;
}
