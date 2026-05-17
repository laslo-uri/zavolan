import {
  BASE,
  SIMULATION_TOPIC_ID,
  SIMULATION_PLAY_SEGMENT,
  BOOKMARKS_TOPIC_ID,
  HISTORY_TOPIC_ID,
} from '../config.js';

function getPath() {
  const path = location.pathname.replace(BASE, '') || '';
  return path.startsWith('/') ? path.slice(1) : path;
}

export function formatSubtopicPathSegment(topicId, subtopicFullId) {
  if (!topicId || !subtopicFullId) return subtopicFullId || '';
  const prefix = `${topicId}-`;
  return subtopicFullId.startsWith(prefix) ? subtopicFullId.slice(prefix.length) : subtopicFullId;
}

function resolveSubtopicIdFromPath(topicId, rawSegment) {
  if (!rawSegment || !topicId || topicId === 'topics') return rawSegment || null;
  if (rawSegment.includes('-') && rawSegment.startsWith(`${topicId}-`)) return rawSegment;
  if (/^\d+$/.test(rawSegment)) return `${topicId}-${rawSegment}`;
  return rawSegment;
}

export function redirectOldSimulationPaths() {
  const path = getPath();
  const parts = path.split('/').filter(Boolean);
  const first = parts[0];
  if (first !== 'miks' && first !== 'mix-test') return;
  const rawSub = parts[1] || null;
  const qRaw = parts[2];
  const questionIndex = qRaw != null && /^\d+$/.test(qRaw) ? parseInt(qRaw, 10) : null;
  let newSub = rawSub;
  if (first === 'miks' && rawSub === 'igra') newSub = SIMULATION_PLAY_SEGMENT;
  const newPath = pathForTopic(SIMULATION_TOPIC_ID, newSub, questionIndex);
  const want = newPath + location.search + location.hash;
  if (location.pathname + location.search + location.hash !== want) {
    history.replaceState(null, '', want);
  }
}

export function redirectOldBookmarksPath() {
  const path = getPath();
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'obelezeno') return;
  const qPart = parts[1];
  const questionIndex = qPart != null && /^\d+$/.test(qPart) ? parseInt(qPart, 10) : null;
  const want = pathForTopic(BOOKMARKS_TOPIC_ID, null, questionIndex) + location.search + location.hash;
  if (location.pathname + location.search + location.hash !== want) {
    history.replaceState(null, '', want);
  }
}

export function parseRoute() {
  const path = getPath();
  const parts = path.split('/').filter(Boolean);
  const topicId = parts[0] || null;

  if (topicId === BOOKMARKS_TOPIC_ID) {
    const qPart = parts[1];
    const questionIndex = qPart != null && /^\d+$/.test(qPart) ? parseInt(qPart, 10) : null;
    return { topicId: BOOKMARKS_TOPIC_ID, subtopicId: null, questionIndex };
  }

  if (topicId === HISTORY_TOPIC_ID) {
    return { topicId: HISTORY_TOPIC_ID, subtopicId: null, questionIndex: null };
  }

  const rawSubtopic = parts[1] || null;
  const qRaw = parts[2];
  const questionIndex = qRaw != null && /^\d+$/.test(qRaw) ? parseInt(qRaw, 10) : null;
  const subtopicId = resolveSubtopicIdFromPath(topicId, rawSubtopic);

  return {
    topicId,
    subtopicId,
    questionIndex,
  };
}

function pathForTopic(topicId, subtopicFullId, questionIndex) {
  let path = BASE;
  if (topicId) {
    if (topicId === BOOKMARKS_TOPIC_ID) {
      path += BOOKMARKS_TOPIC_ID;
      if (questionIndex != null && questionIndex >= 1) path += `/${questionIndex}`;
      return path;
    }
    if (topicId === HISTORY_TOPIC_ID) {
      path += HISTORY_TOPIC_ID;
      return path;
    }
    path += topicId;
    if (subtopicFullId) {
      path += `/${formatSubtopicPathSegment(topicId, subtopicFullId)}`;
    }
    if (questionIndex != null && questionIndex >= 1) path += `/${questionIndex}`;
  }
  return path;
}

export function navigate(topicId, subtopicRef = null, questionIndex = null) {
  const path = pathForTopic(topicId, subtopicRef, questionIndex);
  if (location.pathname + location.search !== path) {
    history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

export function replaceQuestionPath(topicId, subtopicFullId, questionIndex) {
  if (!topicId || questionIndex == null || questionIndex < 1) return;
  if (topicId !== BOOKMARKS_TOPIC_ID && !subtopicFullId) return;
  const path = pathForTopic(topicId, subtopicFullId, questionIndex);
  if (location.pathname !== path) {
    try {
      history.replaceState(null, '', path);
    } catch {
      void 0;
    }
  }
}
