// "On the board": a scrolling strip of other stats. Each one links to its own card via the hash.
import { hashFor } from '../hash';
import { t } from '../i18n';
import type { Stat } from '../stat';

const PX_PER_SECOND = 70;

// Fake and Real alternate while both last.
export function interleave(fake: Stat[], real: Stat[]): Stat[] {
  const out: Stat[] = [];
  for (let i = 0; i < Math.max(fake.length, real.length); i++) {
    if (real[i]) out.push(real[i] as Stat);
    if (fake[i]) out.push(fake[i] as Stat);
  }
  return out;
}

function item(stat: Stat, copy: boolean): HTMLAnchorElement {
  const a = document.createElement('a');
  a.className = 'ticker-item';
  a.href = `#${hashFor(stat)}`;
  if (copy) a.tabIndex = -1;
  if (stat.mode === 'fake') {
    const tag = document.createElement('span');
    tag.className = 'ticker-tag';
    tag.textContent = `${t('ticker.fake')} ·`;
    a.append(tag, ' ');
  }
  a.append(stat.text);
  return a;
}

// The list is drawn twice so the loop is seamless; the copy is hidden from assistive tech.
export function renderTicker(track: HTMLElement, stats: Stat[]): void {
  const list = (copy: boolean) => {
    const group = document.createElement('div');
    group.className = 'ticker-group';
    if (copy) group.setAttribute('aria-hidden', 'true');
    group.append(...stats.map((s) => item(s, copy)));
    return group;
  };
  track.replaceChildren(list(false), list(true));
  // Constant reading speed, however long the list is.
  track.style.setProperty('--ticker-duration', `${Math.max(30, Math.round(track.scrollWidth / 2 / PX_PER_SECOND))}s`);
}
