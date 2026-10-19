import '@fontsource-variable/archivo/wdth.css';
import './style.css';
import { generate, nextStat } from './fake/generate';
import { randomSeed } from './fake/seed';
import { parseHash, setHash } from './hash';
import { applyI18n, t } from './i18n';
import { attribution, randomQuote } from './quotes';
import { loadStats, pickReal } from './real';
import { copyText, shareBody, statUrl } from './share';
import type { Mode, Stat } from './stat';
import { initThemeToggle } from './theme';
import { renderCard } from './ui/card';
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

const another = () => void showNext(mode);

for (const input of modeInputs) {
  input.addEventListener('change', () => {
    setMode(input.value === 'real' ? 'real' : 'fake');
    if (current) another();
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
  const target = parseHash(location.hash);
  if (!target) return;
  if (target.mode === 'fake' && target.seed !== current?.seed) {
    ++ticket;
    setMode('fake');
    show(generate(target.seed));
  } else if (target.mode === 'real' && target.id !== current?.id) {
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
    const real: Stat[] = [];
    while (real.length < Math.min(TICKER_SIZE, stats.length)) {
      const pick = pickReal(stats);
      if (!real.includes(pick)) real.push(pick);
    }
    renderTicker(track, interleave(fake, real));
  } catch {
    // Fake-only ticker is fine.
  }
}

window.addEventListener('hashchange', fromHash);
fromHash();
void fillTicker();
