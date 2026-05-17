import { defineConfig } from 'vitest/config';

export default defineConfig({
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
