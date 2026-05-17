import { BOOKMARKS_TOPIC_ID } from '../../config.js';
import { getBookmarkKeys } from '../../lib/bookmarks.js';
import { enrichQuestion, parseCompositeQuestionKey } from '../../lib/question-key.js';
import { fetchQuestions } from '../../services/api.js';
import { mountEnrichedQuiz } from './quiz-mount.js';
import { clearQuizView } from './quiz-state.js';

function subtopicMetaForBookmark(data, subtopicId) {
  for (const t of data.topics || []) {
    const s = t.subtopics?.find((x) => x.id === subtopicId);
    if (s) return { topicId: t.id, topicName: t.name, subtopic: s };
  }
  return null;
}

async function loadOrderedBookmarkQuestions(data, counts) {
  const keys = getBookmarkKeys();
  const subtopicIds = new Set();
  for (const key of keys) {
    const p = parseCompositeQuestionKey(key);
    if (!p || (counts[p.subtopicId] ?? 0) < 1) continue;
    subtopicIds.add(p.subtopicId);
  }

  const cache = new Map();
  await Promise.all(
    [...subtopicIds].map(async (sid) => {
      const qs = await fetchQuestions(sid);
      cache.set(sid, qs);
    })
  );

  const ordered = [];
  for (const key of keys) {
    const p = parseCompositeQuestionKey(key);
    if (!p || (counts[p.subtopicId] ?? 0) < 1) continue;
    const list = cache.get(p.subtopicId);
    const q = list?.find((x) => x.id === p.questionId);
    if (!q) continue;
    const meta = subtopicMetaForBookmark(data, p.subtopicId);
    if (!meta) continue;
    ordered.push(enrichQuestion(q, p.subtopicId, meta.topicId, meta.topicName));
  }
  return ordered;
}

const BOOKMARKS_LOADING_SKELETON = `
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
      </div>`;

export async function renderBookmarksPage(detail, data, counts, routeQuestionIndex) {
  if (getBookmarkKeys().length === 0) {
    clearQuizView();
    detail.innerHTML = `
      <article class="page page-bookmarks-empty">
        <div class="bookmarks-empty">
          <div class="bookmarks-empty__icon" aria-hidden="true">☆</div>
          <h2 class="bookmarks-empty__title">Još ništa nije obeleženo</h2>
          <p class="bookmarks-empty__text">Tokom vežbe kliknite zvezdicu na kartici pitanja — lista će se pojaviti ovde.</p>
          <a href="/" class="bookmarks-empty__cta">Na početnu</a>
        </div>
      </article>`;
    return;
  }

  clearQuizView();
  detail.innerHTML = `
    <article class="page page--bookmarks-mode" aria-busy="true">
      <h2 class="page-title">Obeležena pitanja</h2>
      <p class="page-meta">Učitavanje…</p>
      ${BOOKMARKS_LOADING_SKELETON}
    </article>`;

  const ordered = await loadOrderedBookmarkQuestions(data, counts);
  const shell = detail.querySelector('.page.page--bookmarks-mode');
  shell?.removeAttribute('aria-busy');

  if (!ordered.length) {
    clearQuizView();
    detail.innerHTML = `
      <article class="page page-bookmarks-empty">
        <div class="bookmarks-empty">
          <div class="bookmarks-empty__icon" aria-hidden="true">☆</div>
          <h2 class="bookmarks-empty__title">Još ništa nije obeleženo</h2>
          <p class="bookmarks-empty__text">Tokom vežbe kliknite zvezdicu na kartici pitanja — lista će se pojaviti ovde.</p>
          <a href="/" class="bookmarks-empty__cta">Na početnu</a>
        </div>
      </article>`;
    return;
  }

  mountEnrichedQuiz({
    detail,
    questions: ordered,
    pageTitle: 'Obeležena pitanja',
    metaLine: `${ordered.length} pitanja · vežba sa liste`,
    descriptionBlock: '',
    pathTopicId: BOOKMARKS_TOPIC_ID,
    pathSubtopicId: null,
    routeQuestionIndex,
    showTopicSource: true,
    bookmarksEnabled: true,
    onRetry: () => {
      void renderBookmarksPage(detail, data, counts, null);
    },
  });
}
