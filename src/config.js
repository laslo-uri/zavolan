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

export const BREAKPOINTS = {
  mobile: 768,
};
