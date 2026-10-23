// The Play score: one line under the card on phones, a panel in the right rail on wide screens.
import type { ScoreView } from '../play/game';

export interface ScoreElements {
  line: HTMLElement;
  title: HTMLElement;
  big: HTMLElement;
  bigLabel: HTMLElement;
  details: HTMLElement;
  dots: HTMLElement;
}

const el = (tag: string, className: string, text = '') => Object.assign(document.createElement(tag), { className, textContent: text });

export function renderScore(els: ScoreElements, view: ScoreView): void {
  els.line.textContent = view.line;
  els.title.textContent = view.title;
  els.big.textContent = view.big;
  els.bigLabel.textContent = view.bigLabel;
  els.details.replaceChildren(...view.details.map((text) => el('span', '', text)));
  els.dots.replaceChildren(...view.dots.map((on) => el('span', on ? 'score-dot on' : 'score-dot')));
}

// Five segments for the Daily Five: right, wrong, or still to play.
export function renderProgress(el: HTMLElement, steps: (boolean | undefined)[] | undefined): void {
  el.hidden = !steps;
  el.replaceChildren(
    ...(steps ?? []).map((s) => Object.assign(document.createElement('span'), { className: s === undefined ? 'step' : s ? 'step on' : 'step off' })),
  );
}

export function renderSquares(el: HTMLElement, squares: boolean[]): void {
  el.replaceChildren(...squares.map((on) => Object.assign(document.createElement('span'), { className: on ? 'square on' : 'square' })));
}
