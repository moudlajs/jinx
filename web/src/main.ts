import './style.css';
import { generate, nextStat } from './fejk/generate';
import { seedFromHash, setHashSeed } from './hash';
import { applyI18n } from './i18n';
import { attribution, randomQuote } from './quotes';
import type { Stat } from './stat';
import { renderCard } from './ui/card';

const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

applyI18n(document);

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

function show(stat: Stat): void {
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

window.addEventListener('hashchange', fromHash);
fromHash();
