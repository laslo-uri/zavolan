import { APP_SLUG } from '../config.js';

const STORAGE_KEY = `${APP_SLUG}:bookmarks`;

/** @type {Set<string> | null} */
let bookmarkSetCache = null;

function invalidateBookmarkCache() {
  bookmarkSetCache = null;
}

function readList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(keys) {
  const unique = [...new Set(keys)];
  unique.sort();
  if (unique.length === 0) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  invalidateBookmarkCache();
}

function getBookmarkSet() {
  if (!bookmarkSetCache) bookmarkSetCache = new Set(readList());
  return bookmarkSetCache;
}

export function getBookmarkKeys() {
  return [...getBookmarkSet()].sort();
}

export function getBookmarkKeySet() {
  return new Set(getBookmarkSet());
}

export function isBookmarked(compositeKey) {
  return getBookmarkSet().has(compositeKey);
}

export function toggleBookmark(compositeKey) {
  const list = readList();
  const i = list.indexOf(compositeKey);
  if (i >= 0) {
    list.splice(i, 1);
  } else {
    list.push(compositeKey);
  }
  writeList(list);
  window.dispatchEvent(new CustomEvent(`${APP_SLUG}-bookmarks-changed`));
  return i < 0;
}

export function bookmarkCount() {
  return getBookmarkSet().size;
}
