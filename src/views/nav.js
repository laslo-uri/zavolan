import { escapeHtml, getTopicDisplayName } from '../utils/dom.js';
import { getCategoryIcon, ICONS } from '../icons.js';
import { filterTopicsForDisplay, getHideEmptyChapters } from '../lib/hide-empty-chapters.js';
import { formatSubtopicPathSegment } from '../lib/router.js';
import { SIMULATION_TOPIC_ID, BOOKMARKS_TOPIC_ID, HISTORY_TOPIC_ID } from '../config.js';
import { getSubtopicLastResult } from '../lib/progress.js';
import { getStoredTheme } from '../lib/theme.js';
import { bookmarkCount } from '../lib/bookmarks.js';
import { syncScrollablePanels } from '../lib/scrollable-panels.js';

function subtopicProgressSuffixNav(subtopicId) {
  const r = getSubtopicLastResult(subtopicId);
  if (!r) return '';
  const cls = r.lastPct >= 80 ? 'subtopic-progress subtopic-progress--strong' : 'subtopic-progress';
  return `<span class="${cls}" title="Poslednji rezultat: ${r.lastPct}%">${r.lastPct}%</span>`;
}

export function renderNav(
  data,
  { topicId, subtopicId },
  counts = {},
  collapsedTopics = new Set(),
  hideEmpty = getHideEmptyChapters()
) {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const topicsTree = filterTopicsForDisplay(data.topics || [], counts, hideEmpty);
  const bm = bookmarkCount();
  const bmBadge = `<span class="nav-bookmark-count${bm > 0 ? '' : ' nav-bookmark-count--empty'}" id="navBookmarkCount" ${bm > 0 ? `aria-label="${bm} obeleženih"` : 'aria-hidden="true"'}>${bm > 0 ? bm : ''}</span>`;
  const simulationActive = topicId === SIMULATION_TOPIC_ID;
  const obActive = topicId === BOOKMARKS_TOPIC_ID;
  const historyActive = topicId === HISTORY_TOPIC_ID;
  const allTopicsActive = topicId === 'topics';
  const themeBtnLabel = getStoredTheme() === 'dark' ? 'Svetla tema' : 'Tamna tema';
  const filterTooltip = hideEmpty
    ? 'Isključi filter: ponovo prikaži u meniju sve teme i podoblasti, uključujući one koje još nemaju nijedno pitanje (0).'
    : 'Filter praznih oblasti: sakrij iz ovog menija teme i podoblasti koje nemaju nijedno pitanje u bazi. Jednako je kao opcija ispod naslova na početnoj strani.';
  const filterAria = hideEmpty
    ? 'Isključi filter praznih oblasti. Prikaži sve teme u meniju, uključujući bez pitanja.'
    : 'Uključi filter praznih oblasti. Sakrij iz menija teme i podoblasti koje nemaju pitanja.';

  const topicsHtml = topicsTree
    .map((topic) => {
      const active = topic.id === topicId;
      const expanded = active && topic.subtopics?.length && !collapsedTopics.has(topic.id);
      const icon = getCategoryIcon(topic.id);
      const topicCount = (topic.subtopics || []).reduce((sum, s) => sum + (counts[s.id] ?? 0), 0);
      const subtopicsHtml = expanded
        ? `
      <div class="nav-sublist">
        ${(topic.subtopics || [])
          .map((sub) => {
            const n = counts[sub.id] ?? 0;
            return `<a href="/${topic.id}/${formatSubtopicPathSegment(topic.id, sub.id)}" class="nav-subitem ${sub.id === subtopicId ? 'active' : ''}" title="${escapeHtml(sub.description || sub.name)}"><span class="nav-subitem-text">${escapeHtml(sub.name)}</span><span class="topic-count" aria-label="${n} pitanja">${n}</span>${subtopicProgressSuffixNav(sub.id)}</a>`;
          })
          .join('')}
      </div>
    `
        : '';
      return `
      <a href="/${topic.id}" class="nav-item nav-item--topic ${active ? 'active' : ''}" title="${escapeHtml(topic.description || topic.name)}"><span class="nav-item-icon">${icon}</span><span class="nav-item-text">${escapeHtml(getTopicDisplayName(topic, true))}</span><span class="topic-count">(${topicCount})</span></a>
      ${subtopicsHtml}
    `;
    })
    .join('');

  nav.innerHTML = `
    <div class="nav-scroll" role="navigation" aria-label="Teme ispita">
      <div class="nav-all-topics-row">
        <a href="/topics" class="nav-item nav-item--all-topics ${allTopicsActive ? 'active' : ''}"><span class="nav-item-icon">${ICONS.allTopics}</span><span class="nav-item-text">Sve teme</span></a>
        <button type="button" class="nav-hide-empty-btn" id="navHideEmptyToggle" aria-pressed="${hideEmpty ? 'true' : 'false'}" title="${escapeHtml(filterTooltip)}" aria-label="${escapeHtml(filterAria)}">${ICONS.hideEmptyChapters}</button>
      </div>
      ${topicsHtml}
    </div>
    <div class="nav-extras" role="region" aria-label="Simulacija, obeleženo i podešavanja">
      <hr class="nav-extras__rule" />
      <div class="nav-extras__tabs">
        <a href="/${SIMULATION_TOPIC_ID}" class="nav-extra-tab nav-extra-tab--simulation ${simulationActive ? 'is-active' : ''}">
          <span class="nav-extra-tab__icon" aria-hidden="true">🎲</span>
          <span class="nav-extra-tab__text">Simulacija</span>
        </a>
        <a href="/bookmarked" class="nav-extra-tab nav-extra-tab--bookmarks ${obActive ? 'is-active' : ''}">
          <span class="nav-extra-tab__icon" aria-hidden="true">★</span>
          <span class="nav-extra-tab__text">Obeleženo</span>${bmBadge}
        </a>
        <a href="/${HISTORY_TOPIC_ID}" class="nav-extra-tab nav-extra-tab--history ${historyActive ? 'is-active' : ''}">
          <span class="nav-extra-tab__icon" aria-hidden="true">📊</span>
          <span class="nav-extra-tab__text">Istorija</span>
        </a>
      </div>
      <div class="nav-extras__tools">
        <button type="button" class="nav-theme-btn" id="navThemeToggle" aria-label="Promeni svetlu ili tamnu temu">${escapeHtml(themeBtnLabel)}</button>
      </div>
    </div>
  `;

  const ns = nav.querySelector('.nav-scroll');
  if (ns) {
    if (nav._navScrollAbort) nav._navScrollAbort.abort();
    nav._navScrollAbort = new AbortController();
    ns.addEventListener('scroll', () => syncScrollablePanels(), {
      signal: nav._navScrollAbort.signal,
      passive: true,
    });
  }
  requestAnimationFrame(() => syncScrollablePanels());
}
