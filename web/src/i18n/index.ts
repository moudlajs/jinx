// UI strings by key. English only for now; cs/sk add a sibling JSON and a picker.
import en from './en.json';

export type Key = keyof typeof en;

const strings: Record<Key, string> = en;

export function t(key: Key, vars: Record<string, string> = {}): string {
  return strings[key].replace(/\{(\w+)\}/g, (m, name: string) => vars[name] ?? m);
}

export function isKey(key: string): key is Key {
  return key in strings;
}

// Fills every [data-i18n] element's text (and [data-i18n-attr="aria-label"] etc.).
export function applyI18n(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n ?? '';
    if (!isKey(key)) throw new Error(`unknown i18n key: ${key}`);
    const attr = el.dataset.i18nAttr;
    if (attr) el.setAttribute(attr, t(key));
    else el.textContent = t(key);
  }
}
