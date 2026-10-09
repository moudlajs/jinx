import { defineConfig } from 'vitest/config';

// Pages serves the site under /jinx/; BASE_PATH=/ for a custom domain.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/jinx/',
  build: { target: 'es2022' },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
