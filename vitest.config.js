import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/__tests__/dom.test.js', 'jsdom'],
      ['src/__tests__/bookmarks.test.js', 'jsdom'],
      ['src/__tests__/hide-empty-chapters.test.js', 'jsdom'],
      ['src/__tests__/exam-timer.test.js', 'jsdom'],
    ],
  },
});
