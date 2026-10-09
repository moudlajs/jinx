import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
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

  test('a SITE_URL without a trailing slash still gives well-formed URLs', () => {
    const outDir = 'dist-site-url-test';
    execFileSync('npx', ['vite', 'build', '--logLevel', 'error', '--outDir', outDir], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, SITE_URL: 'https://jinx.example' },
    });
    const built = readFileSync(new URL(`../${outDir}/index.html`, import.meta.url), 'utf8');
    rmSync(new URL(`../${outDir}`, import.meta.url), { recursive: true });
    expect(built).toContain('<meta property="og:image" content="https://jinx.example/og.png"');
    expect(built).toContain('<meta property="og:url" content="https://jinx.example/"');
  }, 60_000);

  test('ships the image and favicon', () => {
    expect(existsSync(new URL('og.png', dist))).toBe(true);
    expect(html).toContain('href="/jinx/favicon.svg"');
  });
});
