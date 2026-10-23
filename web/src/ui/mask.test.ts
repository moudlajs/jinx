// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import { generate } from '../fake/generate';
import type { Stat } from '../stat';
import { renderCard, type CardElements } from './card';
import { maskLabel, unmask } from './mask';

const real: Stat = {
  id: 'real-9d86edf15bec',
  mode: 'real',
  text: 'The Vikings are 2–8 in prime time since 2015.',
  subject: { kind: 'team', label: 'Vikings' },
  conditions: [{ id: 'prime-time', label: 'in prime time' }],
  metric: { id: 'record', label: 'win-loss record' },
  numbers: { sampleSize: 10, record: { wins: 2, losses: 8 } },
  seasons: { from: 2015, to: 2026 },
};

function elements(): CardElements {
  const keys = ['card', 'badge', 'badgeShort', 'badgeLong', 'code', 'big', 'bigLabel', 'text', 'punchline', 'meta',
    'backBadge', 'backTitle', 'backCode', 'dots', 'backText', 'chips', 'backSource'] as const;
  return Object.fromEntries(keys.map((k) => [k, document.createElement('div')])) as unknown as CardElements;
}

// What a player could read off the card, or off the DOM with Inspect, that differs between Fake and Real.
function tells(els: CardElements): string {
  const { card, text, big, bigLabel, ...rest } = els;
  return JSON.stringify([card.dataset, Object.values(rest).map((el) => [el.textContent, el.className, el.getAttribute('aria-label')])]);
}

test.each([['fake', generate('abc12')], ['real', real]] as const)('a face-down %s card shows nothing that gives it away', (_, stat) => {
  const masked = (s: Stat) => {
    const els = elements();
    const turn = document.createElement('button');
    renderCard(els, s);
    maskLabel(els, turn);
    expect(turn.hidden).toBe(true);
    expect(els.punchline.hidden).toBe(true);
    return els;
  };
  // The tells come out the same for a Fake and a Real card, so none of them can be an answer.
  expect(tells(masked(stat))).toBe(tells(masked(stat.mode === 'fake' ? real : generate('abc12'))));
  expect(masked(stat).card.dataset.mode).toBeUndefined();
});

test('unmask plus renderCard brings everything back', () => {
  const els = elements();
  const turn = document.createElement('button');
  renderCard(els, real);
  const before = tells(els);
  maskLabel(els, turn);
  unmask(els, turn);
  renderCard(els, real);
  expect(tells(els)).toBe(before);
  expect(turn.hidden).toBe(false);
});
