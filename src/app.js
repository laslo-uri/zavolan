import { APP_SLUG } from './config.js';
import {
  parseRoute,
  navigate,
  redirectOldSimulationPaths,
  redirectOldBookmarksPath,
} from './lib/router.js';
import { loadData, fetchCounts } from './services/api.js';
import { initSidebar, clearMobileDrawerTouchLock } from './lib/sidebar.js';
import { initScrollablePanels, syncScrollablePanels } from './lib/scrollable-panels.js';
import { escapeHtml, html } from './utils/dom.js';
import { renderNav } from './views/nav.js';
import { renderBreadcrumb } from './views/breadcrumb.js';
import { renderPage } from './views/render-page.js';
import { getHideEmptyChapters, setHideEmptyChapters } from './lib/hide-empty-chapters.js';
import { bookmarkCount } from './lib/bookmarks.js';
import { initThemeFromStorage, toggleTheme } from './lib/theme.js';

/** @type {import('./services/api.js').AppData} */
let data = { topics: [] };

/** @type {Record<string, number>} subtopicId -> question count */
let counts = {};

const collapsedTopics = new Set();

let lastRenderState = null;

let lastRouteForTransition = null;

function syncOfflineBanner() {
  const el = document.getElementById('offlineBanner');
  if (!el) return;
  el.hidden = navigator.onLine;
}

async function load() {
  initThemeFromStorage();
  syncOfflineBanner();
  window.addEventListener('online', syncOfflineBanner);
  window.addEventListener('offline', syncOfflineBanner);

  try {
    [data, counts] = await Promise.all([loadData(), fetchCounts()]);
  } catch (err) {
    showLoadError(err);
    return;
  }
  window.addEventListener('popstate', render);
  document.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('#navThemeToggle');
    if (themeBtn) {
      e.preventDefault();
      toggleTheme();
      const route = parseRoute();
      renderNav(data, route, counts, collapsedTopics, getHideEmptyChapters());
      syncScrollablePanels();
      return;
    }
    const toggle = e.target.closest('#navHideEmptyToggle');
    if (toggle) {
      e.preventDefault();
      setHideEmptyChapters(!getHideEmptyChapters());
      return;
    }
    const a = e.target.closest('a[href^="/"]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    e.preventDefault();
    const path = (a.getAttribute('href') || '/').replace(/^\/?/, '');
    const parts = path.split('/').filter(Boolean);
    const route = parseRoute();
    if (parts.length === 1 && route.topicId === parts[0] && route.topicId !== 'topics') {
      const topicId = parts[0];
      if (collapsedTopics.has(topicId)) {
        collapsedTopics.delete(topicId);
      } else {
        collapsedTopics.add(topicId);
      }
      renderNav(data, route, counts, collapsedTopics, getHideEmptyChapters());
      syncScrollablePanels();
      return;
    }
    if (parts.length >= 1 && parts[0] !== 'topics') collapsedTopics.delete(parts[0]);
    let subRef = parts[1] || null;
    let qIdx = parts[2] != null && /^\d+$/.test(parts[2]) ? parseInt(parts[2], 10) : null;
    if (parts[0] === 'bookmarked' && parts[1] && /^\d+$/.test(parts[1])) {
      subRef = null;
      qIdx = parseInt(parts[1], 10);
    }
    navigate(parts[0] || null, subRef, Number.isNaN(qIdx) ? null : qIdx);
  });
  window.addEventListener(`${APP_SLUG}-hide-empty-chapters-changed`, () => {
    render();
  });
  window.addEventListener(`${APP_SLUG}-bookmarks-changed`, () => {
    const el = document.getElementById('navBookmarkCount');
    if (!el) return;
    const n = bookmarkCount();
    el.textContent = n > 0 ? String(n) : '';
    el.classList.toggle('nav-bookmark-count--empty', n === 0);
    if (n > 0) {
      el.setAttribute('aria-label', `${n} obeleženih`);
      el.removeAttribute('aria-hidden');
    } else {
      el.removeAttribute('aria-label');
      el.setAttribute('aria-hidden', 'true');
    }
  });
  window.addEventListener(`${APP_SLUG}-progress-changed`, () => {
    const route = parseRoute();
    renderNav(data, route, counts, collapsedTopics, getHideEmptyChapters());
    syncScrollablePanels();
  });
  render();
  initSidebar();
  initScrollablePanels();
}

function showLoadError(err) {
  const detail = document.getElementById('detail');
  if (!detail) return;
  const msg = err?.message || String(err);
  detail.innerHTML = html`
    <div class="load-error" role="alert">
      <p>Podaci se ne učitavaju. Proverite internet konekciju ili pokušajte kasnije.</p>
      <details class="load-error-details">
        <summary class="load-error-details__summary">Tehnički detalji</summary>
        <pre class="load-error-details__pre">${escapeHtml(msg)}</pre>
      </details>
      <p><button type="button" class="btn-retry">Pokušaj ponovo</button></p>
    </div>
  `;
  detail.querySelector('.btn-retry')?.addEventListener('click', () => {
    location.reload();
  });
  initSidebar();
  initScrollablePanels();
}

function showRenderError(err) {
  const detail = document.getElementById('detail');
  if (!detail) return;
  const msg = err?.message || String(err);
  detail.innerHTML = html`
    <div class="load-error" role="alert">
      <p>Stranica se nije mogla prikazati. Osvežite stranicu ili se vratite na početnu.</p>
      <details class="load-error-details">
        <summary class="load-error-details__summary">Tehnički detalji</summary>
        <pre class="load-error-details__pre">${escapeHtml(msg)}</pre>
      </details>
      <p>
        <button type="button" class="btn-retry" id="btnRenderErrorRetry">Osveži stranicu</button>
      </p>
    </div>
  `;
  detail.querySelector('#btnRenderErrorRetry')?.addEventListener('click', () => {
    location.reload();
  });
}

async function render() {
  redirectOldSimulationPaths();
  redirectOldBookmarksPath();
  const route = parseRoute();
  if (route.topicId && route.topicId !== 'topics') collapsedTopics.delete(route.topicId);
  const hideEmpty = getHideEmptyChapters();

  const prevState = lastRenderState;
  const isFilterOnlyUpdate =
    prevState != null &&
    prevState.topicId === route.topicId &&
    prevState.subtopicId === route.subtopicId &&
    prevState.questionIndex === route.questionIndex &&
    prevState.hideEmpty !== hideEmpty;

  lastRenderState = {
    topicId: route.topicId,
    subtopicId: route.subtopicId,
    questionIndex: route.questionIndex,
    hideEmpty,
  };

  const onQuizView =
    Boolean(route.subtopicId) && route.topicId != null && route.topicId !== 'topics';
  if (isFilterOnlyUpdate && onQuizView) {
    renderNav(data, route, counts, collapsedTopics, hideEmpty);
    renderBreadcrumb(data, route);
    lastRouteForTransition = { ...route };
    requestAnimationFrame(() => syncScrollablePanels());
    return;
  }

  const doRender = async () => {
    try {
      renderNav(data, route, counts, collapsedTopics, hideEmpty);
      renderBreadcrumb(data, route);
      await renderPage(data, route, counts, hideEmpty, { filterOnly: isFilterOnlyUpdate });
      if (!isFilterOnlyUpdate) {
        requestAnimationFrame(() => {
          const content = document.querySelector('.content');
          if (content) content.scrollTo({ top: 0, behavior: 'auto' });
        });
        clearMobileDrawerTouchLock();
        document.body.classList.remove('sidebar-open');
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
          overlay.classList.remove('visible');
          overlay.setAttribute('aria-hidden', 'true');
        }
      }
    } catch (err) {
      showRenderError(err);
    }
  };

  const prevRoute = lastRouteForTransition;
  const isSimpleNav =
    (prevRoute?.topicId === 'topics' || !prevRoute?.topicId) &&
    (route.topicId === 'topics' || !route.topicId);
  lastRouteForTransition = { ...route };

  const useViewTransition =
    typeof document.startViewTransition === 'function' && !isSimpleNav && !isFilterOnlyUpdate;

  if (useViewTransition) {
    try {
      const vt = document.startViewTransition(() => doRender());
      await vt.finished;
    } catch {
      await doRender();
    }
  } else {
    await doRender();
    if (!isSimpleNav && !isFilterOnlyUpdate) {
      const detail = document.getElementById('detail');
      if (detail) {
        detail.classList.add('page-entering');
        setTimeout(() => detail.classList.remove('page-entering'), 520);
      }
    }
  }

  requestAnimationFrame(() => syncScrollablePanels());
}

load();
