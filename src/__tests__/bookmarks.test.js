/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APP_SLUG } from '../config.js';

let bookmarks;

describe('bookmarks', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    bookmarks = await import('../lib/bookmarks.js');
  });

  it('starts with empty bookmark list', () => {
    expect(bookmarks.getBookmarkKeys()).toEqual([]);
    expect(bookmarks.bookmarkCount()).toBe(0);
  });

  it('toggleBookmark adds a new bookmark', () => {
    const result = bookmarks.toggleBookmark('1-1:5');
    expect(result).toBe(true);
    expect(bookmarks.isBookmarked('1-1:5')).toBe(true);
    expect(bookmarks.bookmarkCount()).toBe(1);
  });

  it('toggleBookmark removes an existing bookmark', () => {
    bookmarks.toggleBookmark('1-1:5');
    const result = bookmarks.toggleBookmark('1-1:5');
    expect(result).toBe(false);
    expect(bookmarks.isBookmarked('1-1:5')).toBe(false);
    expect(bookmarks.bookmarkCount()).toBe(0);
  });

  it('getBookmarkKeySet returns a Set', () => {
    bookmarks.toggleBookmark('2-1:3');
    bookmarks.toggleBookmark('3-2:7');
    const set = bookmarks.getBookmarkKeySet();
    expect(set).toBeInstanceOf(Set);
    expect(set.has('2-1:3')).toBe(true);
    expect(set.has('3-2:7')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('persists to localStorage', () => {
    bookmarks.toggleBookmark('1-1:1');
    const raw = localStorage.getItem(`${APP_SLUG}:bookmarks`);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed).toContain('1-1:1');
  });

  it('removes storage key when list is empty', () => {
    bookmarks.toggleBookmark('1-1:1');
    bookmarks.toggleBookmark('1-1:1');
    expect(localStorage.getItem(`${APP_SLUG}:bookmarks`)).toBeNull();
  });

  it('dispatches custom event on toggle', () => {
    const handler = vi.fn();
    window.addEventListener(`${APP_SLUG}-bookmarks-changed`, handler);
    bookmarks.toggleBookmark('1-1:1');
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(`${APP_SLUG}-bookmarks-changed`, handler);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(`${APP_SLUG}:bookmarks`, 'not-json');
    expect(bookmarks.getBookmarkKeys()).toEqual([]);
    expect(bookmarks.bookmarkCount()).toBe(0);
  });
});
