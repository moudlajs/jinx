import './style.css';
import { generate, nextStat } from './fake/generate';
import { parseHash, setHash } from './hash';
import { applyI18n, t } from './i18n';
import { attribution, randomQuote } from './quotes';
import { loadStats, pickReal } from './real';
import { copyText, shareBody, statUrl } from './share';
import type { Mode, Stat } from './stat';
import { initThemeToggle } from './theme';
import { renderCard } from './ui/card';
import { renderExplain } from './ui/explain';

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

const hero = byId('hero');
const els = {
  card: byId('card'),
  badge: byId('card-badge'),
  badgeShort: byId('card-badge-short'),
  badgeLong: byId('card-badge-long'),
  text: byId('stat-text'),
  punchline: byId('stat-punchline'),
};
const explain = {
  root: byId<HTMLDetailsElement>('explain'),
  metric: byId('explain-metric'),
  filters: byId('explain-filters'),
  sample: byId('explain-sample'),
  seasons: byId('explain-seasons'),
  query: byId('explain-query'),
};
let current: Stat | undefined;

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

function show(stat: Stat): void {
  clearStatus();
  current = stat;
  renderCard(els, stat);
  renderExplain(explain, stat);
  hero.hidden = true;
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
    const { stats } = await loadStats(`${import.meta.env.BASE_URL}stats.json`);
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

window.addEventListener('hashchange', fromHash);
fromHash();
