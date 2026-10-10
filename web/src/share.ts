// What a copied or shared stat looks like. Its satire or data label always travels with it.
import { hashFor } from './hash';
import { t } from './i18n';
import type { Stat } from './stat';

export function statUrl(stat: Stat, base: string): string {
  const url = new URL(base);
  url.hash = hashFor(stat);
  return url.toString();
}

export function shareBody(stat: Stat): string {
  const lines = [stat.punchline ? `${stat.text} ${stat.punchline}` : stat.text];
  lines.push(`(${t(stat.mode === 'fejk' ? 'share.satireLabel' : 'share.realLabel')})`);
  return lines.join('\n');
}

export function copyText(stat: Stat, base: string): string {
  return `${shareBody(stat)}\n${statUrl(stat, base)}`;
}
