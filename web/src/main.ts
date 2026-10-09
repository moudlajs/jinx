import './style.css';
import { generate, nextStat } from './fejk/generate';
import { seedFromHash, setHashSeed } from './hash';
import { applyI18n, t } from './i18n';
import { attribution, randomQuote } from './quotes';
import { copyText, shareBody, statUrl } from './share';
import type { Stat } from './stat';
import { initThemeToggle } from './theme';
import { renderCard } from './ui/card';

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
  text: byId('stat-text'),
  punchline: byId('stat-punchline'),
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
  hero.hidden = true;
  if (stat.seed) setHashSeed(stat.seed);
}

const another = () => show(nextStat(current));

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
  const seed = seedFromHash(location.hash);
  if (seed && seed !== current?.seed) show(generate(seed));
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
