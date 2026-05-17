import { BOOKMARKS_TOPIC_ID, HISTORY_TOPIC_ID, SIMULATION_TOPIC_ID } from '../../config.js';
import { getCategoryIcon } from '../../icons.js';
import { bookmarkCount } from '../../lib/bookmarks.js';
import {
  filterSubtopicsForDisplay,
  filterTopicsForDisplay,
  setHideEmptyChapters,
} from '../../lib/hide-empty-chapters.js';
import { enrichQuestion } from '../../lib/question-key.js';
import { formatSubtopicPathSegment } from '../../lib/router.js';
import { fetchQuestions } from '../../services/api.js';
import { escapeHtml, getTopicDisplayName } from '../../utils/dom.js';
import { getSubtopicLastResult } from '../../lib/progress.js';
import { attachHeroBrand3D } from './home-brand.js';
import { mountEnrichedQuiz } from './quiz-mount.js';
import { clearQuizView } from './quiz-state.js';

function subtopicProgressSuffix(subtopicId) {
  const r = getSubtopicLastResult(subtopicId);
  if (!r) return '';
  const cls =
    r.lastPct >= 80 ? 'subtopic-progress subtopic-progress--strong' : 'subtopic-progress';
  return `<span class="${cls}" title="Poslednji rezultat: ${r.lastPct}%">${r.lastPct}%</span>`;
}

export async function renderTopicRoutes(
  detail,
  data,
  counts,
  hideEmpty,
  filterOnly,
  topicId,
  subtopicId,
  routeQuestionIndex,
  topic,
  subtopic
) {
  if (!topicId || !topic) {
    clearQuizView();
    if (topicId === 'topics') {
      const topicsForList = filterTopicsForDisplay(data.topics || [], counts, hideEmpty);
      detail.innerHTML = `
        <h2 class="page-title">Sve teme</h2>
        <p class="page-meta">Kliknite na temu da započnete vežbanje</p>
        ${
          topicsForList.length === 0
            ? `<p class="page-meta topics-list-empty">Nema oblasti sa pitanjima za prikaz. Isključite „Sakrij oblasti bez pitanja“ na početnoj ili u meniju pored „Sve teme“.</p>`
            : `<div class="compact-topic-list${filterOnly ? ' compact-topic-list--filter-only' : ''}">
          ${topicsForList
            .map(
              (t) => {
                const topicCount = (t.subtopics || []).reduce((sum, s) => sum + (counts[s.id] ?? 0), 0);
                return `
            <section class="compact-topic">
              <a href="/${t.id}" class="compact-topic-header">
                <span class="topic-list-icon">${getCategoryIcon(t.id)}</span>
                <span>${escapeHtml(getTopicDisplayName(t, true))}</span>
                <span class="item-count"> (${topicCount})</span>
              </a>
              <div class="compact-subtopics">
                ${(t.subtopics || [])
                  .map(
                    (s, i) => {
                      const n = counts[s.id] ?? 0;
                      return `<a href="/${t.id}/${formatSubtopicPathSegment(t.id, s.id)}" class="compact-subtopic-pill">${i + 1}. ${escapeHtml(s.name)}<span class="item-count"> (${n})</span>${subtopicProgressSuffix(s.id)}</a>`;
                    }
                  )
                  .join('')}
              </div>
            </section>
          `;
              }
            )
            .join('')}
        </div>`
        }
      `;
    } else {
      const topicsForHome = filterTopicsForDisplay(data.topics || [], counts, hideEmpty);
      const bmHome = bookmarkCount();
      const obDesc =
        bmHome > 0
          ? `${bmHome} ${bmHome === 1 ? 'pitanje' : 'pitanja'} na vašoj listi.`
          : 'Sačuvajte pitanja zvezdicom tokom vežbe i vratite se ovde.';
      detail.innerHTML = `
        <div class="home-hero${filterOnly ? ' home-hero--filter-only' : ''}">
          <a href="/" class="home-hero-brand" aria-label="ZaVolan – početna" id="homeHeroBrand">
            <span class="home-hero-brand-inner">
              <img src="/logo.svg" alt="" class="home-hero-logo" width="64" height="64">
              <span class="home-hero-wordmark">ZaVolan</span>
            </span>
          </a>
          <h1 class="home-hero-title">Koje teme želite da vežbate?</h1>
          <p class="home-hero-subtitle">Izaberite službenu oblast ispod — tu je i filter za prikaz samo oblasti sa pitanjima.</p>
          <div class="home-topics-block">
            <div class="home-topics-toolbar">
              <div class="home-filter-empty-wrap">
                <label class="home-filter-empty">
                  <span class="home-filter-empty__text">Sakrij oblasti bez pitanja</span>
                  <span class="home-filter-empty__switch">
                    <input
                      type="checkbox"
                      class="home-filter-empty__input"
                      id="homeHideEmptyChapters"
                      role="switch"
                      ${hideEmpty ? 'checked' : ''}
                      aria-checked="${hideEmpty ? 'true' : 'false'}"
                    />
                    <span class="home-filter-empty__track" aria-hidden="true"></span>
                  </span>
                </label>
              </div>
              <a href="/topics" class="home-topics-all-link">Pregled svih tema →</a>
            </div>
            ${
              topicsForHome.length === 0
                ? `<p class="home-no-matching-topics">Nijedna oblast nema učitana pitanja za prikaz. Isključite filter iznad ili proverite bazu.</p>`
                : `<div class="home-topic-chips">
            ${topicsForHome
              .map(
                (t) => {
                  const topicCount = (t.subtopics || []).reduce((sum, s) => sum + (counts[s.id] ?? 0), 0);
                  return `
              <a href="/${t.id}" class="topic-chip">
                <span class="topic-chip-icon">${getCategoryIcon(t.id)}</span>
                <span class="topic-chip-text">${escapeHtml(getTopicDisplayName(t, true))}<span class="item-count"> (${topicCount})</span></span>
              </a>
            `;
                }
              )
              .join('')}
          </div>`
            }
          </div>
          <div class="home-secondary">
            <section class="home-shortcuts" aria-label="Simulacija, obeležena pitanja i istorija">
              <div class="home-shortcuts__grid">
                <a href="/${SIMULATION_TOPIC_ID}" class="home-shortcut-card home-shortcut-card--simulation">
                  <span class="home-shortcut-card__icon" aria-hidden="true">🎲</span>
                  <span class="home-shortcut-card__body">
                    <span class="home-shortcut-card__title">Simulacija</span>
                    <span class="home-shortcut-card__desc">Slučajna pitanja iz više oblasti — broj i teme birate vi.</span>
                  </span>
                  <span class="home-shortcut-card__go" aria-hidden="true">→</span>
                </a>
                <a href="/${BOOKMARKS_TOPIC_ID}" class="home-shortcut-card home-shortcut-card--star">
                  <span class="home-shortcut-card__icon" aria-hidden="true">★</span>
                  <span class="home-shortcut-card__body">
                    <span class="home-shortcut-card__title">Obeleženo</span>
                    <span class="home-shortcut-card__desc">${escapeHtml(obDesc)}</span>
                  </span>
                  <span class="home-shortcut-card__go" aria-hidden="true">→</span>
                </a>
                <a href="/${HISTORY_TOPIC_ID}" class="home-shortcut-card home-shortcut-card--history">
                  <span class="home-shortcut-card__icon" aria-hidden="true">📊</span>
                  <span class="home-shortcut-card__body">
                    <span class="home-shortcut-card__title">Istorija</span>
                    <span class="home-shortcut-card__desc">Poslednji rezultati po podoblastima, sačuvani lokalno.</span>
                  </span>
                  <span class="home-shortcut-card__go" aria-hidden="true">→</span>
                </a>
              </div>
            </section>
          </div>
        </div>
      `;
      const homeCb = detail.querySelector('#homeHideEmptyChapters');
      if (homeCb) {
        homeCb.addEventListener('change', () => setHideEmptyChapters(homeCb.checked));
      }
    }
    attachHeroBrand3D(detail);
    return;
  }

  if (!subtopic) {
    clearQuizView();
    const subtopics = filterSubtopicsForDisplay(topic.subtopics, counts, hideEmpty);
    const topicIcon = getCategoryIcon(topicId);
    const topicDescBlock = topic.description ? `<div class="page-description"><p>${escapeHtml(topic.description)}</p></div>` : '';
    if (subtopics.length === 0) {
      const hint = hideEmpty
        ? `<p class="page-meta filter-empty-hint">Isključite opciju „Sakrij oblasti bez pitanja“ na početnoj ili u meniju da vidite sve podoblasti.</p>`
        : `<p class="page-meta">Trenutno nema podataka za vežbu u ovoj oblasti.</p>`;
      detail.innerHTML = `
      <article class="page${filterOnly ? ' page--filter-only' : ''}">
        <h2 class="page-title page-title-with-icon"><span class="page-title-icon">${topicIcon}</span>${escapeHtml(topic.name)}</h2>
        ${topicDescBlock}
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">∅</div>
          <p>Nema podoblasti sa pitanjima za prikaz.</p>
          ${hint}
        </div>
      </article>
    `;
      return;
    }
    detail.innerHTML = `
      <article class="page${filterOnly ? ' page--filter-only' : ''}">
        <h2 class="page-title page-title-with-icon"><span class="page-title-icon">${topicIcon}</span>${escapeHtml(topic.name)}</h2>
        ${topicDescBlock}
        <p class="page-meta">Odaberite podoblast za vežbanje</p>
        <div class="compact-topic">
          <div class="compact-subtopics">
            ${subtopics
              .map(
                (s, i) => {
                  const n = counts[s.id] ?? 0;
                  return `<a href="/${topicId}/${formatSubtopicPathSegment(topicId, s.id)}" class="compact-subtopic-pill" title="${escapeHtml(s.description || s.name)}">${i + 1}. ${escapeHtml(s.name)}<span class="item-count"> (${n})</span>${subtopicProgressSuffix(s.id)}</a>`;
                }
              )
              .join('')}
          </div>
        </div>
      </article>
    `;
    return;
  }

  const topicIcon = getCategoryIcon(topicId);
  const descriptionBlock = subtopic.description ? `<div class="page-description"><p>${escapeHtml(subtopic.description)}</p></div>` : '';
  detail.innerHTML = `
    <article class="page">
      <h2 class="page-title">${escapeHtml(subtopic.name)}</h2>
      <p class="page-meta page-meta-with-icon"><span class="page-meta-icon">${topicIcon}</span>Deo teme „${escapeHtml(topic.name)}”</p>
      ${descriptionBlock}
      <div class="loading-skeleton">
        <div class="skeleton-card">
          <div class="skeleton-line long"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-line long"></div>
          <div class="skeleton-line medium"></div>
        </div>
        <div class="skeleton-card">
          <div class="skeleton-line long"></div>
        </div>
      </div>
    </article>
  `;

  const questionsRaw = await fetchQuestions(subtopicId);

  if (!questionsRaw.length) {
    clearQuizView();
    const descBlock = subtopic.description ? `<div class="page-description"><p>${escapeHtml(subtopic.description)}</p></div>` : '';
    detail.innerHTML = `
      <article class="page">
        <h2 class="page-title">${escapeHtml(subtopic.name)}</h2>
        <p class="page-meta page-meta-with-icon"><span class="page-meta-icon">${topicIcon}</span>Deo teme „${escapeHtml(topic.name)}”</p>
        ${descBlock}
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">?</div>
          <p>Trenutno nema pitanja za ovu temu.</p>
        </div>
      </article>
    `;
    return;
  }

  const enriched = questionsRaw.map((q) => enrichQuestion(q, subtopicId, topicId, topic.name));

  function mountSubtopicQuiz() {
    mountEnrichedQuiz({
      detail,
      questions: enriched,
      pageTitle: escapeHtml(subtopic.name),
      metaLine: `<span class="page-meta-icon">${topicIcon}</span>Deo teme „${escapeHtml(topic.name)}” · ${enriched.length} pitanja`,
      descriptionBlock,
      pathTopicId: topicId,
      pathSubtopicId: subtopicId,
      routeQuestionIndex,
      showTopicSource: false,
      bookmarksEnabled: true,
      onRetry: mountSubtopicQuiz,
      progressMeta: {
        subtopicId,
        topicId,
        topicName: topic.name,
        subtopicName: subtopic.name,
      },
    });
  }

  mountSubtopicQuiz();
}
