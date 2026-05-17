import { APP_SLUG } from '../config.js';

const STORAGE_KEY = `${APP_SLUG}-theme`;

/** @returns {'light' | 'dark'} */
export function getStoredTheme() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    void 0;
  }
  return 'dark';
}

export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    void 0;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'light' ? '#f4f4f5' : '#212121');
}

export function toggleTheme() {
  const next = getStoredTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function initThemeFromStorage() {
  applyTheme(getStoredTheme());
}
