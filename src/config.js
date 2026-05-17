export const APP_NAME = 'ZaVolan';
export const APP_SLUG = 'zavolan';

export const SIMULATION_TOPIC_ID = 'simulacija';
export const SIMULATION_PLAY_SEGMENT = 'play';

export const BOOKMARKS_TOPIC_ID = 'bookmarked';

export const HISTORY_TOPIC_ID = 'istorija';

export const BASE =
  typeof location !== 'undefined' && location.protocol === 'file:'
    ? ''
    : (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

export const PATHS = {
  data: `${BASE}data.json`,
  database: (subtopicId) => `${BASE}database/podoblast${subtopicId}.json`,
  counts: `${BASE}database/counts.json`,
  image: (path) => `${BASE}database/${path}`,
};

/** Safe relative path fragment for `PATHS.image` (mitigates breakout via question JSON). */
export function safeQuestionImagePath(raw) {
  if (raw == null || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (
    !s ||
    s.includes('..') ||
    s.startsWith('/') ||
    s.includes('://') ||
    s.includes(':') ||
    /[\0<>"'`]/.test(s) ||
    !/^[\w./-]+$/.test(s)
  ) {
    return null;
  }
  return s;
}

export const BREAKPOINTS = {
  mobile: 768,
};
