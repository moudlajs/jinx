// What a copied or shared stat looks like. The satire label always travels with it.
import { t } from './i18n';
import type { Stat } from './stat';

export function statUrl(stat: Stat, base: string): string {
  const url = new URL(base);
  url.hash = stat.seed ?? '';
  return url.toString();
}

export function shareBody(stat: Stat): string {
  const lines = [stat.punchline ? `${stat.text} ${stat.punchline}` : stat.text];
  if (stat.mode === 'fejk') lines.push(`(${t('share.satireLabel')})`);
  return lines.join('\n');
}

export function copyText(stat: Stat, base: string): string {
  return `${shareBody(stat)}\n${statUrl(stat, base)}`;
}
