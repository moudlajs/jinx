// Fake or Real: call the label of a face-down card, as long as you like. Keeps a streak.
import { generate } from '../fake/generate';
import { randomSeed } from '../fake/seed';
import { t } from '../i18n';
import { pickReal } from '../real';
import type { Game } from './game';
import type { PlayStore } from './store';

export interface GuessScore {
  streak: number;
  best: number;
  right: number;
  total: number;
  history: boolean[];
}

export const HISTORY = 14;

export function newGuessScore(best = 0): GuessScore {
  return { streak: 0, best, right: 0, total: 0, history: [] };
}

export function scoreGuess(s: GuessScore, ok: boolean): GuessScore {
  const streak = ok ? s.streak + 1 : 0;
  return {
    streak,
    best: Math.max(s.best, streak),
    right: s.right + (ok ? 1 : 0),
    total: s.total + 1,
    history: [...s.history, ok].slice(-HISTORY),
  };
}

export function createGuess(store: PlayStore, save: () => void, random: () => number = Math.random): Game {
  let score = newGuessScore(store.guessBest);
  return {
    id: 'guess',
    choices: [
      { value: 'fake', label: t('play.fake'), tone: 'fake' },
      { value: 'real', label: t('play.real'), tone: 'real' },
    ],
    deal(stats, { previous, ticker }) {
      if (random() >= 0.5) return generate(randomSeed());
      const pool = stats.filter((s) => !ticker.has(s.id));
      return pickReal(pool.length ? pool : stats, previous, random);
    },
    answer(stat, choice) {
      const ok = choice === stat.mode;
      score = scoreGuess(score, ok);
      if (score.best > store.guessBest) {
        store.guessBest = score.best;
        save();
      }
      return { ok, title: t(ok ? 'play.right' : 'play.wrong'), sub: t(stat.mode === 'fake' ? 'play.wasFake' : 'play.wasReal') };
    },
    nextLabel: () => t('play.next'),
    status: () => t('play.menu.guessStatus', { best: String(score.best) }),
    view() {
      const n = { streak: String(score.streak), best: String(score.best), k: String(score.right), n: String(score.total) };
      return {
        line: t('play.guess.line', n),
        title: t('play.guess.title'),
        big: n.streak,
        bigLabel: t('play.guess.bigLabel'),
        details: [t('play.guess.best', n), t('play.guess.rightOf', n)],
        dots: score.history,
      };
    },
  };
}
