import { APP_SLUG } from '../config.js';

const BY_SUBTOPIC_KEY = `${APP_SLUG}:quiz-results`;
const HISTORY_KEY = `${APP_SLUG}:quiz-history`;
const MAX_HISTORY = 50;

function readBySubtopic() {
  try {
    const raw = localStorage.getItem(BY_SUBTOPIC_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

function readHistoryRaw() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * @param {object} p
 * @param {string} p.subtopicId
 * @param {string} p.topicId
 * @param {string} p.topicName
 * @param {string} p.subtopicName
 * @param {number} p.correct
 * @param {number} p.total
 */
export function recordSubtopicAttempt(p) {
  const { subtopicId, topicId, topicName, subtopicName, correct, total } = p;
  if (!subtopicId || !topicId) return;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const entry = {
    subtopicId,
    topicId,
    topicName: topicName || '',
    subtopicName: subtopicName || '',
    correct,
    total,
    pct,
    ts: Date.now(),
  };
  try {
    const hist = readHistoryRaw();
    hist.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, MAX_HISTORY)));
    const bySub = readBySubtopic();
    bySub[subtopicId] = { lastPct: pct, correct, total, at: entry.ts };
    localStorage.setItem(BY_SUBTOPIC_KEY, JSON.stringify(bySub));
    window.dispatchEvent(new CustomEvent(`${APP_SLUG}-progress-changed`));
  } catch {
    void 0;
  }
}

/** @param {string} subtopicId */
export function getSubtopicLastResult(subtopicId) {
  if (!subtopicId) return null;
  const bySub = readBySubtopic();
  const r = bySub[subtopicId];
  if (!r || typeof r.lastPct !== 'number') return null;
  return r;
}

export function getQuizHistory() {
  return readHistoryRaw();
}
