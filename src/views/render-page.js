import {
  APP_NAME,
  BOOKMARKS_TOPIC_ID,
  HISTORY_TOPIC_ID,
  SIMULATION_PLAY_SEGMENT,
  SIMULATION_TOPIC_ID,
} from '../config.js';
import { clearQuizView } from './pages/quiz-state.js';
import { renderTopicRoutes } from './pages/topic-routes.js';
import { escapeHtml, html } from '../utils/dom.js';

export async function renderPage(
  data,
  { topicId, subtopicId, questionIndex: routeQuestionIndex },
  counts = {},
  hideEmpty = false,
  renderOpts = {}
) {
  const { filterOnly = false } = renderOpts;
  const detail = document.getElementById('detail');
  if (!detail) return;

  if (topicId === SIMULATION_TOPIC_ID && subtopicId === SIMULATION_PLAY_SEGMENT) {
    document.title = `Simulacija · ${APP_NAME}`;
    const { renderSimulationPlay } = await import('./pages/simulation.js');
    await renderSimulationPlay(detail, data, counts, routeQuestionIndex);
    return;
  }
  if (topicId === SIMULATION_TOPIC_ID) {
    document.title = `Simulacija · ${APP_NAME}`;
    clearQuizView();
    const { renderSimulationSetup } = await import('./pages/simulation.js');
    renderSimulationSetup(detail, data, counts, hideEmpty, filterOnly);
    return;
  }
  if (topicId === BOOKMARKS_TOPIC_ID) {
    document.title = `Obeležena pitanja · ${APP_NAME}`;
    const { renderBookmarksPage } = await import('./pages/bookmarks-view.js');
    await renderBookmarksPage(detail, data, counts, routeQuestionIndex);
    return;
  }
  if (topicId === HISTORY_TOPIC_ID) {
    document.title = `Istorija pokušaja · ${APP_NAME}`;
    clearQuizView();
    const { renderHistoryPage } = await import('./pages/history-view.js');
    renderHistoryPage(detail);
    return;
  }

  const topic = data.topics?.find((t) => t.id === topicId);
  const subtopic = subtopicId && topic?.subtopics?.find((s) => s.id === subtopicId);

  if (topicId && topicId !== 'topics' && !topic) {
    document.title = `Stranica nije pronađena · ${APP_NAME}`;
    clearQuizView();
    detail.innerHTML = html`
      <article class="page page-404">
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">404</div>
          <h2 class="page-title">Stranica nije pronađena</h2>
          <p class="page-meta">Nema teme „${escapeHtml(topicId)}”. Proverite adresu ili se vratite na početnu.</p>
          <p><a href="/" class="soft-empty__link">Početna strana</a></p>
        </div>
      </article>
    `;
    return;
  }

  document.title = !topic
    ? `${APP_NAME} · Priprema za vozački ispit`
    : subtopic
      ? `${subtopic.name} · ${APP_NAME}`
      : `${topic.name} · ${APP_NAME}`;

  await renderTopicRoutes(
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
  );
}
