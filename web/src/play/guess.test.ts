import { expect, test } from 'vitest';
import { HISTORY, newGuessScore, scoreGuess } from './guess';

test('a streak grows on right calls, resets on a miss, and best keeps the high', () => {
  let s = newGuessScore(2);
  for (const ok of [true, true, true, false, true]) s = scoreGuess(s, ok);
  expect(s).toMatchObject({ streak: 1, best: 3, right: 4, total: 5 });
  expect(s.history).toEqual([true, true, true, false, true]);
});

test('history keeps only the latest calls', () => {
  let s = newGuessScore();
  for (let i = 0; i < HISTORY + 5; i++) s = scoreGuess(s, i % 2 === 0);
  expect(s.history).toHaveLength(HISTORY);
});
