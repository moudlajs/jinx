// Fake or Real: call the label of a face-down card. Pure score keeping.
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
