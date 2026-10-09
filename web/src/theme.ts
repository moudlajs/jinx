// Dark/light toggle. The choice is kept in localStorage (no cookies); an inline
// script in index.html applies it before first paint.
import { t } from './i18n';

const KEY = 'jinx-theme';
type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function initThemeToggle(button: HTMLButtonElement): void {
  const label = () => {
    button.textContent = currentTheme() === 'dark' ? t('theme.toLight') : t('theme.toDark');
    button.setAttribute('aria-label', `${t('theme.label')}: ${button.textContent}`);
  };
  button.addEventListener('click', () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode: the toggle still works for this visit.
    }
    label();
  });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', label);
  label();
}
