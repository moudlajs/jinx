import { defineConfig, type Plugin } from 'vitest/config';

// Pages serves the site under /jinx/; set SITE_URL and BASE_PATH=/ for a custom domain.
const siteUrl = process.env.SITE_URL ?? 'https://moudlajs.github.io/jinx/';

// Link unfurlers need absolute URLs, so %SITE_URL% in index.html is filled at build time.
const siteUrlPlugin = (): Plugin => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
});

export default defineConfig({
  base: process.env.BASE_PATH ?? '/jinx/',
  build: { target: 'es2022' },
  plugins: [siteUrlPlugin()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
