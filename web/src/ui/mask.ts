// Play: turn a rendered card's giveaways face down until the player answers.
import { t } from '../i18n';
import type { Face } from '../play/game';
import { highlightNumbers, type CardElements } from './card';

// The back explains the count, so it goes face down too.
function clearBack(els: CardElements): void {
  for (const el of [els.backBadge, els.backTitle, els.backCode, els.backText, els.backSource]) el.textContent = '';
  els.chips.replaceChildren();
  els.dots.replaceChildren();
  els.dots.removeAttribute('aria-label');
}

// Everything that says Fake or Real, in what's shown and in the DOM behind it: the badge, the card
// number (seeds and ids look different), the meta line, the punchline (Fake only), the back, and the
// card's data attributes. renderCard() puts it all back on reveal.
export function maskLabel(els: CardElements, turn: HTMLElement): void {
  delete els.card.dataset.mode;
  delete els.card.dataset.seed;
  clearBack(els);
  els.punchline.textContent = '';
  for (const badge of [els.badge, els.backBadge]) {
    badge.classList.remove('badge-real');
    badge.classList.add('badge-hidden');
  }
  els.badgeShort.textContent = t('play.hiddenBadge');
  els.badgeLong.textContent = t('play.hiddenBadgeLong');
  els.code.textContent = t('play.hiddenCode');
  els.meta.textContent = t('play.hiddenMeta');
  els.punchline.hidden = true;
  turn.hidden = true;
}

// Over / Under: the label stays, the number and every number that gives it away go.
export function maskNumber(els: CardElements, turn: HTMLElement, face: Face): void {
  clearBack(els);
  els.big.textContent = face.big;
  highlightNumbers(els.text, face.text);
  turn.hidden = true;
}

// renderCard() redraws every field; this clears what the mask added on top.
export function unmask(els: CardElements, turn: HTMLElement): void {
  for (const badge of [els.badge, els.backBadge]) badge.classList.remove('badge-hidden');
  turn.hidden = false;
}
