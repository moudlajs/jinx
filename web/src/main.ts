import '@fontsource-variable/archivo/wdth.css';
import './style.css';
import { generate, nextStat } from './fake/generate';
import { randomSeed } from './fake/seed';
import { parseHash, parsePlayHash, setHash } from './hash';
import { applyI18n, t } from './i18n';
import { createDaily, dailyFive, dayNumber } from './play/daily';
import type { Game, GameId } from './play/game';
import { createGuess } from './play/guess';
import { createOverUnder } from './play/overunder';
import { loadPlay, savePlay } from './play/store';
import { attribution, randomQuote } from './quotes';
import { loadStats, pickReal } from './real';
import { copyText, shareBody, statUrl } from './share';
import type { Mode, Stat } from './stat';
import { initThemeToggle } from './theme';
import { renderCard } from './ui/card';
import { maskLabel, maskNumber, unmask } from './ui/mask';
import { renderProgress, renderScore, renderSquares } from './ui/score';
import { interleave, renderTicker } from './ui/ticker';
import { renderVisit } from './ui/visit';
import { newVisit, see } from './visit';

const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

applyI18n(document);
initThemeToggle(byId<HTMLButtonElement>('theme-toggle'));

const quote = randomQuote();
byId('quote-text').textContent = quote.text;
byId('quote-author').textContent = attribution(quote);

const STATS_URL = `${import.meta.env.BASE_URL}stats.json`;
const hero = byId('hero');
const deck = byId('deck');
const actions = byId('card-actions');
const els = {
  card: byId('card'),
  badge: byId('card-badge'),
  badgeShort: byId('card-badge-short'),
  badgeLong: byId('card-badge-long'),
  code: byId('card-code'),
  big: byId('card-big'),
  bigLabel: byId('card-big-label'),
  text: byId('stat-text'),
  punchline: byId('stat-punchline'),
  meta: byId('card-meta'),
  backBadge: byId('back-badge'),
  backTitle: byId('back-title'),
  backCode: byId('back-code'),
  dots: byId('back-dots'),
  backText: byId('back-text'),
  chips: byId('back-chips'),
  backSource: byId('back-source'),
};
const front = byId('card-front');
const backFace = byId('card-back');
let current: Stat | undefined;

const visitEls = {
  dealt: byId('visit-dealt'),
  dealtLabel: byId('visit-dealt-label'),
  fake: byId('visit-fake'),
  real: byId('visit-real'),
  bar: byId('visit-bar'),
  wildest: byId('visit-wildest'),
  wildestCard: byId('visit-wildest-card'),
  last: byId('visit-last'),
  empty: byId('visit-empty'),
};
let visit = newVisit();
renderVisit(visitEls, visit);

const status = byId('status');
let statusTimer: number | undefined;
function announce(message: string): void {
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => (status.textContent = ''), 3000);
}

function clearStatus(): void {
  clearTimeout(statusTimer);
  status.textContent = '';
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function setTurned(turned: boolean): void {
  els.card.classList.toggle('turned', turned);
  front.inert = turned;
  backFace.inert = !turned;
  byId('turn').setAttribute('aria-expanded', String(turned));
}

// Deal: a copy of the visible card is tossed off the table while the new one rises from the deck.
function toss(): void {
  const top = hero.hidden ? els.card : hero;
  if (reducedMotion.matches || top.hidden) return;
  const ghost = top.cloneNode(true) as HTMLElement;
  for (const el of [ghost, ...ghost.querySelectorAll('[id]')]) el.removeAttribute('id');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  // The copy keeps the card's classes; drop the rise so only the toss animation runs on it.
  ghost.classList.remove('rise');
  ghost.classList.add('ghost');
  deck.querySelectorAll('.ghost').forEach((g) => g.remove());
  deck.append(ghost);
  const done = () => ghost.remove();
  ghost.addEventListener('animationend', done, { once: true });
  window.setTimeout(done, 1500);
  els.card.classList.remove('rise');
  void els.card.offsetWidth; // restart the rise animation
  els.card.classList.add('rise');
}

function show(stat: Stat): void {
  clearStatus();
  toss();
  visit = see(visit, current, stat);
  renderVisit(visitEls, visit);
  current = stat;
  setTurned(false);
  renderCard(els, stat);
  hero.hidden = true;
  actions.hidden = false;
  setHash(stat);
}

const modeInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="mode"]')];
let mode: Mode = 'fake';
function setMode(m: Mode): void {
  mode = m;
  for (const input of modeInputs) input.checked = input.value === m;
}

// Each request bumps the ticket, so a slow stats.json load can't override a later choice.
let ticket = 0;

async function showNext(m: Mode, wantedId?: string): Promise<void> {
  const mine = ++ticket;
  if (m === 'fake') {
    show(nextStat(current));
    return;
  }
  announce(t('real.loading'));
  try {
    const { stats } = await loadStats(STATS_URL);
    if (mine !== ticket) return;
    const wanted = wantedId ? stats.find((s) => s.id === wantedId) : undefined;
    show(wanted ?? pickReal(stats, current));
    if (wantedId && !wanted) announce(t('real.missing'));
  } catch {
    if (mine !== ticket) return;
    setMode('fake');
    announce(t('real.loadFailed'));
  }
}

// Play: one loop for every game. Deal a face-down card, take the answer, reveal, keep score.
const play = {
  top: byId('play-top'),
  progress: byId('progress'),
  actions: byId('game-actions'),
  answer: byId('answer'),
  a: byId<HTMLButtonElement>('answer-a'),
  b: byId<HTMLButtonElement>('answer-b'),
  verdictRow: byId('verdict-row'),
  verdict: byId('verdict'),
  verdictTitle: byId('verdict-title'),
  verdictSub: byId('verdict-sub'),
  next: byId<HTMLButtonElement>('next-round'),
  score: byId('score'),
  visit: byId('visit-title').closest('section') as HTMLElement,
  end: byId('daily-end'),
  menu: byId('play-menu'),
};
const scoreEls = {
  line: byId('scoreline'),
  title: byId('score-title'),
  big: byId('score-big'),
  bigLabel: byId('score-big-label'),
  details: byId('score-details'),
  dots: byId('score-dots'),
};
const gameInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="game"]')];
const endShare = byId('end-share');
const turn = byId('turn');
const store = loadPlay();
const save = () => savePlay(store);
const games: Record<GameId, Game> = {
  daily: createDaily(store, save, `${location.origin}${location.pathname}#play-daily`),
  guess: createGuess(store, save),
  overunder: createOverUnder(store, save),
};
const cardLine = byId('card-line');
let game: Game = games.guess;
let playing = false;
let round: Stat | undefined;
let answered = false;
let tickerIds = new Set<string>();

function renderPlayScore(): void {
  renderScore(scoreEls, game.view());
  renderProgress(play.progress, game.progress?.());
}

function setGame(id: keyof typeof games): void {
  game = games[id];
  for (const input of gameInputs) input.checked = input.value === id;
  const [a, b] = game.choices;
  for (const [button, choice] of [[play.a, a], [play.b, b]] as const) {
    button.textContent = choice.label;
    button.dataset.tone = choice.tone;
    button.dataset.value = choice.value;
  }
  renderPlayScore();
}

function showRound(stat: Stat): void {
  clearStatus();
  toss();
  round = stat;
  answered = false;
  setTurned(false);
  unmask(els, turn);
  renderCard(els, stat);
  const face = game.face?.(stat);
  if (face) maskNumber(els, turn, face);
  else maskLabel(els, turn);
  cardLine.textContent = face?.line ?? '';
  cardLine.hidden = !face;
  hero.hidden = true;
  play.end.hidden = true;
  play.answer.hidden = false;
  play.verdictRow.hidden = true;
}

function showEnd(): void {
  const end = game.end?.();
  if (!end) return announce(t('play.empty'));
  clearStatus();
  toss();
  round = undefined;
  els.card.hidden = true;
  hero.hidden = true;
  byId('end-kicker').textContent = end.kicker;
  byId('end-big').textContent = end.big;
  byId('end-text').textContent = end.text;
  renderSquares(byId('end-squares'), end.squares);
  endShare.dataset.text = end.share;
  play.end.hidden = false;
  play.answer.hidden = true;
  play.verdictRow.hidden = true;
  renderPlayScore();
}

async function dealRound(): Promise<void> {
  const mine = ++ticket;
  // Only a first, slow load is worth announcing; after that stats.json is cached.
  const slow = window.setTimeout(() => announce(t('real.loading')), 300);
  try {
    const { stats } = await loadStats(STATS_URL);
    clearTimeout(slow);
    if (mine !== ticket || !playing) return;
    const stat = game.deal(stats, { previous: round, ticker: tickerIds });
    if (stat) showRound(stat);
    else showEnd();
  } catch {
    clearTimeout(slow);
    if (mine !== ticket || !playing) return;
    stopPlay();
    setMode('fake');
    show(nextStat(current));
    announce(t('play.loadFailed'));
  }
}

function answer(choice: string): void {
  if (!round || answered) return;
  answered = true;
  const verdict = game.answer(round, choice);
  unmask(els, turn);
  renderCard(els, round);
  play.verdictTitle.textContent = verdict.title;
  play.verdictSub.textContent = verdict.sub;
  play.verdict.classList.toggle('right', verdict.ok);
  play.next.textContent = game.nextLabel();
  play.answer.hidden = true;
  play.verdictRow.hidden = false;
  play.next.focus();
  renderPlayScore();
}

function startPlay(id?: GameId): void {
  playing = true;
  for (const input of modeInputs) input.checked = input.value === 'play';
  actions.hidden = true;
  play.actions.hidden = false;
  play.visit.hidden = true;
  play.score.hidden = false;
  if (id) void selectGame(id);
  else showMenu();
}

function selectGame(id: GameId): Promise<void> {
  setGame(id);
  play.menu.hidden = true;
  play.top.hidden = false;
  // A game's link is fine to keep: it names the game, not a face-down card.
  history.replaceState(null, '', `${location.pathname}${location.search}#play-${id}`);
  return dealRound();
}

// The menu: the three games with where you stand in each.
function showMenu(): void {
  ++ticket;
  clearStatus();
  round = undefined;
  els.card.hidden = true;
  hero.hidden = true;
  cardLine.hidden = true;
  play.end.hidden = true;
  play.top.hidden = true;
  play.answer.hidden = true;
  play.verdictRow.hidden = true;
  for (const id of Object.keys(games) as GameId[]) byId(`menu-status-${id}`).textContent = games[id].status();
  renderScore(scoreEls, {
    line: '',
    title: t('play.menu.scoresTitle'),
    big: String(Object.keys(store.daily).length),
    bigLabel: t('play.menu.daysLabel'),
    details: [games.guess.status(), games.overunder.status()],
    dots: [],
  });
  play.menu.hidden = false;
  history.replaceState(null, '', location.pathname + location.search);
}

function stopPlay(): void {
  // Leave the card fully labelled, whatever the caller deals next (or fails to).
  unmask(els, turn);
  if (round) renderCard(els, round);
  playing = false;
  round = undefined;
  ++ticket;
  cardLine.hidden = true;
  play.top.hidden = true;
  play.actions.hidden = true;
  play.end.hidden = true;
  play.menu.hidden = true;
  play.visit.hidden = false;
  play.score.hidden = true;
  if (els.card.hidden) hero.hidden = false;
}

play.a.addEventListener('click', () => answer(play.a.dataset.value ?? ''));
play.b.addEventListener('click', () => answer(play.b.dataset.value ?? ''));
play.next.addEventListener('click', () =>
  void dealRound().then(() => (play.end.hidden ? play.a : endShare.hidden ? byId('end-copy') : endShare).focus()),
);
for (const input of gameInputs) {
  input.addEventListener('change', () => void selectGame(input.value in games ? (input.value as GameId) : 'guess'));
}
for (const button of document.querySelectorAll<HTMLButtonElement>('.menu-game')) {
  button.addEventListener('click', () => {
    const id = button.dataset.game ?? '';
    void selectGame(id in games ? (id as GameId) : 'guess').then(() => {
      if (playing) (play.end.hidden ? play.a : byId('end-share')).focus();
    });
  });
}
byId('games-back').addEventListener('click', () => {
  showMenu();
  document.querySelector<HTMLButtonElement>('.menu-game')?.focus();
});
byId('end-guess').addEventListener('click', () => {
  void selectGame('guess').then(() => play.a.focus());
});

async function copyRow(): Promise<void> {
  try {
    await navigator.clipboard.writeText(endShare.dataset.text ?? '');
    announce(t('play.copiedRow'));
  } catch {
    announce(t('card.copyFailed'));
  }
}
byId('end-copy').addEventListener('click', () => void copyRow());
// Like the card's Share button: only where the browser can share, Copy otherwise.
endShare.hidden = typeof navigator.share !== 'function';
endShare.addEventListener('click', () => {
  navigator.share({ title: t('share.title'), text: endShare.dataset.text ?? '' }).catch((err: unknown) => {
    if (!(err instanceof DOMException && err.name === 'AbortError')) void copyRow();
  });
});

const another = () => {
  if (playing) {
    if (answered) void dealRound();
    return;
  }
  void showNext(mode);
};

for (const input of modeInputs) {
  input.addEventListener('change', () => {
    if (input.value === 'play') {
      startPlay();
      return;
    }
    const wasPlaying = playing;
    if (playing) stopPlay();
    setMode(input.value === 'real' ? 'real' : 'fake');
    if (current || wasPlaying) another();
  });
}

byId('generate').addEventListener('click', () => {
  another();
  byId('another').focus();
});
byId('another').addEventListener('click', another);
byId('turn').addEventListener('click', () => {
  setTurned(true);
  byId('turn-back').focus();
});
byId('turn-back').addEventListener('click', () => {
  setTurned(false);
  byId('turn').focus();
});

// Space = next, unless a control has focus (it would fire twice).
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select, [contenteditable]')) return;
  e.preventDefault();
  another();
});

function fromHash(): void {
  const gameId = parsePlayHash(location.hash);
  if (gameId) {
    if (playing) void selectGame(gameId);
    else startPlay(gameId);
    return;
  }
  const target = parseHash(location.hash);
  if (!target) return;
  // A link (the ticker, say) leaves the game for that card.
  const left = playing;
  if (playing) stopPlay();
  if (target.mode === 'fake' && (left || target.seed !== current?.seed)) {
    ++ticket;
    setMode('fake');
    show(generate(target.seed));
  } else if (target.mode === 'real' && (left || target.id !== current?.id)) {
    setMode('real');
    void showNext('real', target.id);
  }
}

async function copy(): Promise<void> {
  if (!current) return;
  try {
    await navigator.clipboard.writeText(copyText(current, location.href));
    announce(t('card.copied'));
  } catch {
    announce(t('card.copyFailed'));
  }
}

byId('copy').addEventListener('click', () => void copy());

const shareButton = byId('share');
if (typeof navigator.share === 'function') {
  shareButton.hidden = false;
  shareButton.addEventListener('click', () => {
    if (!current) return;
    const data = { title: t('share.title'), text: shareBody(current), url: statUrl(current, location.href) };
    navigator.share(data).catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === 'AbortError')) void copy();
    });
  });
}

// The ticker starts with Fake stats and mixes in Real ones once stats.json arrives, if it does.
const TICKER_SIZE = 6;
async function fillTicker(): Promise<void> {
  const fake = Array.from({ length: TICKER_SIZE }, () => generate(randomSeed()));
  const track = byId('ticker-track');
  byId('ticker').hidden = false;
  renderTicker(track, fake);
  try {
    const { stats } = await loadStats(STATS_URL);
    // Today's Daily Five stays off the ticker, or it would give those cards away.
    const daily = new Set(dailyFive(dayNumber(new Date()), stats).map((s) => s.id));
    const pool = stats.filter((s) => !daily.has(s.id));
    const real: Stat[] = [];
    while (real.length < Math.min(TICKER_SIZE, pool.length)) {
      const pick = pickReal(pool);
      if (!real.includes(pick)) real.push(pick);
    }
    tickerIds = new Set(real.map((s) => s.id));
    renderTicker(track, interleave(fake, real));
  } catch {
    // Fake-only ticker is fine.
  }
}

window.addEventListener('hashchange', fromHash);
fromHash();
void fillTicker();
