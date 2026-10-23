// What every Play game provides; main.ts runs the same deal → face down → answer → reveal loop for each.
import type { Stat } from '../stat';

export type GameId = 'daily' | 'guess' | 'overunder';

export interface Choice {
  value: string;
  label: string;
  tone: 'fake' | 'real' | 'line';
}

export interface Verdict {
  ok: boolean;
  title: string;
  sub: string;
}

export interface ScoreView {
  line: string;
  title: string;
  big: string;
  bigLabel: string;
  details: string[];
  dots: boolean[];
}

export interface EndView {
  kicker: string;
  big: string;
  text: string;
  squares: boolean[];
  share: string;
}

// Over / Under keeps the label and hides the number instead.
export interface Face {
  big: string;
  text: string;
  line: string;
}

export interface DealContext {
  previous: Stat | undefined;
  // Real stats on the ticker would give a round away.
  ticker: Set<string>;
}

export interface Game {
  id: GameId;
  choices: [Choice, Choice];
  // undefined: nothing left to deal (the Daily Five is done for today).
  deal(stats: Stat[], ctx: DealContext): Stat | undefined;
  face?(stat: Stat): Face;
  answer(stat: Stat, choice: string): Verdict;
  nextLabel(): string;
  view(): ScoreView;
  // One line for the Play menu.
  status(): string;
  progress?(): (boolean | undefined)[];
  end?(): EndView;
}
