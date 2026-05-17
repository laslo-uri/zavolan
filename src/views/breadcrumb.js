import { escapeHtml, getTopicDisplayName } from '../utils/dom.js';
import { getCategoryIcon } from '../icons.js';
import { BOOKMARKS_TOPIC_ID, HISTORY_TOPIC_ID, SIMULATION_TOPIC_ID } from '../config.js';

export function renderBreadcrumb(data, { topicId, subtopicId }) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;

  if (topicId === SIMULATION_TOPIC_ID) {
    bc.innerHTML = `<a href="/">Početna</a><span class="sep">/</span><span class="current breadcrumb-current--simulation" aria-current="page">Simulacija</span>`;
    return;
  }
  if (topicId === BOOKMARKS_TOPIC_ID) {
    bc.innerHTML = `<a href="/">Početna</a><span class="sep">/</span><span class="current breadcrumb-current--bookmarks" aria-current="page">Obeležena pitanja</span>`;
    return;
  }
  if (topicId === HISTORY_TOPIC_ID) {
    bc.innerHTML = `<a href="/">Početna</a><span class="sep">/</span><span class="current breadcrumb-current--history" aria-current="page">Istorija pokušaja</span>`;
    return;
  }

  const topic = data.topics?.find((t) => t.id === topicId);
  if (!topicId || !topic) {
    const isAllTopics = topicId === 'topics';
    bc.innerHTML = isAllTopics
      ? `<a href="/">Početna</a><span class="sep">/</span><span class="current" aria-current="page">Sve teme</span>`
      : '<a href="/">Početna</a>';
    return;
  }

  const sub = subtopicId && topic.subtopics?.find((s) => s.id === subtopicId);
  const topicIcon = getCategoryIcon(topicId);

  if (sub) {
    bc.innerHTML = `
      <a href="/">Početna</a>
      <span class="sep">/</span>
      <a href="/topics">Sve teme</a>
      <span class="sep">/</span>
      <a href="/${topicId}" class="breadcrumb-topic"><span class="breadcrumb-icon">${topicIcon}</span>${escapeHtml(getTopicDisplayName(topic, true))}</a>
      <span class="sep">/</span>
      <span class="current" aria-current="page">${escapeHtml(sub.name)}</span>
    `;
  } else {
    bc.innerHTML = `
      <a href="/">Početna</a>
      <span class="sep">/</span>
      <a href="/topics">Sve teme</a>
      <span class="sep">/</span>
      <span class="current breadcrumb-topic" aria-current="page"><span class="breadcrumb-icon">${topicIcon}</span>${escapeHtml(getTopicDisplayName(topic, true))}</span>
    `;
  }
}
