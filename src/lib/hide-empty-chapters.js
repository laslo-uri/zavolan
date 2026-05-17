import { APP_SLUG } from '../config.js';

const STORAGE_KEY = `${APP_SLUG}-hide-empty-chapters`;

export function getHideEmptyChapters() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setHideEmptyChapters(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    void 0;
  }
  window.dispatchEvent(
    new CustomEvent(`${APP_SLUG}-hide-empty-chapters-changed`, { detail: { value } })
  );
}

export function filterTopicsForDisplay(topics, counts, hideEmpty) {
  if (!hideEmpty || !topics?.length) return topics || [];
  return topics
    .map((t) => ({
      ...t,
      subtopics: (t.subtopics || []).filter((s) => (counts[s.id] ?? 0) > 0),
    }))
    .filter((t) => (t.subtopics?.length ?? 0) > 0);
}

export function filterSubtopicsForDisplay(subtopics, counts, hideEmpty) {
  const list = subtopics || [];
  if (!hideEmpty) return list;
  return list.filter((s) => (counts[s.id] ?? 0) > 0);
}
