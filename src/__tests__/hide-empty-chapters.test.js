/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APP_SLUG } from '../config.js';

let mod;

describe('hide-empty-chapters', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mod = await import('../lib/hide-empty-chapters.js');
  });

  it('defaults to false', () => {
    expect(mod.getHideEmptyChapters()).toBe(false);
  });

  it('setHideEmptyChapters(true) persists', () => {
    mod.setHideEmptyChapters(true);
    expect(mod.getHideEmptyChapters()).toBe(true);
  });

  it('setHideEmptyChapters(false) clears storage', () => {
    mod.setHideEmptyChapters(true);
    mod.setHideEmptyChapters(false);
    expect(localStorage.getItem(`${APP_SLUG}-hide-empty-chapters`)).toBeNull();
  });

  it('dispatches custom event on change', () => {
    const handler = vi.fn();
    window.addEventListener(`${APP_SLUG}-hide-empty-chapters-changed`, handler);
    mod.setHideEmptyChapters(true);
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(`${APP_SLUG}-hide-empty-chapters-changed`, handler);
  });
});

describe('filterTopicsForDisplay', () => {
  const topics = [
    { id: '1', subtopics: [{ id: '1-1' }, { id: '1-2' }] },
    { id: '2', subtopics: [{ id: '2-1' }] },
    { id: '3', subtopics: [{ id: '3-1' }] },
  ];
  const counts = { '1-1': 5, '1-2': 0, '2-1': 0, '3-1': 10 };

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mod = await import('../lib/hide-empty-chapters.js');
  });

  it('returns all topics when hideEmpty is false', () => {
    const result = mod.filterTopicsForDisplay(topics, counts, false);
    expect(result).toHaveLength(3);
  });

  it('filters out topics with no subtopics having questions', () => {
    const result = mod.filterTopicsForDisplay(topics, counts, true);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('filters out empty subtopics within remaining topics', () => {
    const result = mod.filterTopicsForDisplay(topics, counts, true);
    const topic1 = result.find((t) => t.id === '1');
    expect(topic1.subtopics).toHaveLength(1);
    expect(topic1.subtopics[0].id).toBe('1-1');
  });
});

describe('filterSubtopicsForDisplay', () => {
  const subtopics = [{ id: '1-1' }, { id: '1-2' }, { id: '1-3' }];
  const counts = { '1-1': 5, '1-2': 0, '1-3': 12 };

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mod = await import('../lib/hide-empty-chapters.js');
  });

  it('returns all when hideEmpty is false', () => {
    expect(mod.filterSubtopicsForDisplay(subtopics, counts, false)).toHaveLength(3);
  });

  it('filters empty when hideEmpty is true', () => {
    const result = mod.filterSubtopicsForDisplay(subtopics, counts, true);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(['1-1', '1-3']);
  });
});
