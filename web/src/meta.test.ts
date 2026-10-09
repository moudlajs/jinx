import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, test } from 'vitest';

const dist = new URL('../dist/', import.meta.url);
let html = '';

beforeAll(() => {
  execFileSync('npx', ['vite', 'build', '--logLevel', 'error'], { cwd: new URL('..', import.meta.url) });
  html = readFileSync(new URL('index.html', dist), 'utf8');
}, 60_000);

const meta = (attr: string, name: string) =>
  new RegExp(`<meta ${attr}="${name}" content="([^"]+)"`).exec(html)?.[1];

describe('built index.html', () => {
  test('has Open Graph tags with absolute URLs', () => {
    expect(meta('property', 'og:title')).toMatch(/jinx/);
    expect(meta('property', 'og:url')).toBe('https://moudlajs.github.io/jinx/');
    expect(meta('property', 'og:image')).toBe('https://moudlajs.github.io/jinx/og.png');
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(meta('name', 'theme-color')).toBeTruthy();
    expect(html).not.toContain('%SITE_URL%');
  });

  test('ships the image and favicon', () => {
    expect(existsSync(new URL('og.png', dist))).toBe(true);
    expect(html).toContain('href="/jinx/favicon.svg"');
  });
});
