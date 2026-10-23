// The Play score: one line under the card on phones, a panel in the right rail on wide screens.
import { t } from '../i18n';
import type { GuessScore } from '../play/guess';

export interface ScoreElements {
  line: HTMLElement;
  title: HTMLElement;
  big: HTMLElement;
  bigLabel: HTMLElement;
  details: HTMLElement;
  dots: HTMLElement;
}

export interface ScoreView {
  line: string;
  title: string;
  big: string;
  bigLabel: string;
  details: string[];
  dots: boolean[];
}

export function guessView(s: GuessScore): ScoreView {
  const n = { streak: String(s.streak), best: String(s.best), k: String(s.right), n: String(s.total) };
  return {
    line: t('play.guess.line', n),
    title: t('play.guess.title'),
    big: n.streak,
    bigLabel: t('play.guess.bigLabel'),
    details: [t('play.guess.best', n), t('play.guess.rightOf', n)],
    dots: s.history,
  };
}

export function renderScore(els: ScoreElements, view: ScoreView): void {
  els.line.textContent = view.line;
  els.title.textContent = view.title;
  els.big.textContent = view.big;
  els.bigLabel.textContent = view.bigLabel;
  els.details.replaceChildren(...view.details.map((text) => Object.assign(document.createElement('span'), { textContent: text })));
  els.dots.replaceChildren(
    ...view.dots.map((on) => Object.assign(document.createElement('span'), { className: on ? 'score-dot on' : 'score-dot' })),
  );
}
