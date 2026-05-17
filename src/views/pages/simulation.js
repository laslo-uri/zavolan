import { APP_SLUG, SIMULATION_PLAY_SEGMENT, SIMULATION_TOPIC_ID } from '../../config.js';
import { getCategoryIcon } from '../../icons.js';
import {
  getExamTimerSeconds,
  setExamTimerSeconds,
  timerPresetOptionsHtml,
} from '../../lib/exam-timer.js';
import { filterTopicsForDisplay } from '../../lib/hide-empty-chapters.js';
import { enrichQuestion } from '../../lib/question-key.js';
import { navigate } from '../../lib/router.js';
import {
  buildSubtopicSegments,
  mergeGlobalIntoGrouped,
  pickDistinctGlobalIndices,
  pickDistinctGlobalIndicesExcluding,
} from '../../lib/simulation-sample.js';
import { fetchQuestions, listSubtopicsWithQuestions } from '../../services/api.js';
import { escapeHtml, getTopicDisplayName } from '../../utils/dom.js';
import { mountEnrichedQuiz } from './quiz-mount.js';
import { clearQuizView } from './quiz-state.js';

const SIMULATION_SESSION_KEY = `${APP_SLUG}:simulation`;
const OLD_SESSION_KEYS = [`${APP_SLUG}:mixTest`, `${APP_SLUG}:miks`];

function readSimulationSessionRaw() {
  const primary = sessionStorage.getItem(SIMULATION_SESSION_KEY);
  if (primary) return primary;
  for (const k of OLD_SESSION_KEYS) {
    const v = sessionStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function buildSimulationQuestionList(data, counts, { topicIds, count }) {
  const subs = listSubtopicsWithQuestions(data, counts).filter(
    (s) => !topicIds?.length || topicIds.includes(s.topicId)
  );
  const { segments, poolSize } = buildSubtopicSegments(subs, counts);
  if (poolSize <= 0) return { questions: [], poolSize: 0 };

  const n = Math.min(Math.max(1, count), poolSize);
  const tried = new Set();
  const grouped = new Map();
  const cache = new Map();

  for (const g of pickDistinctGlobalIndices(poolSize, n)) {
    tried.add(g);
    mergeGlobalIntoGrouped(segments, grouped, g);
  }

  async function prefetchGrouped() {
    await Promise.all(
      [...grouped.keys()].map(async (subId) => {
        if (!cache.has(subId)) cache.set(subId, await fetchQuestions(subId));
      })
    );
  }

  function materialize() {
    const out = [];
    for (const { subtopic, indices } of grouped.values()) {
      const qs = cache.get(subtopic.id) ?? [];
      for (const idx of indices) {
        const q = qs[idx];
        if (q) {
          out.push(enrichQuestion(q, subtopic.id, subtopic.topicId, subtopic.topicName));
        }
      }
    }
    return out;
  }

  await prefetchGrouped();
  let questions = materialize();

  let rounds = 0;
  while (questions.length < n && tried.size < poolSize && rounds < 400) {
    rounds++;
    const need = n - questions.length;
    const room = poolSize - tried.size;
    if (need <= 0 || room <= 0) break;
    const batch = pickDistinctGlobalIndicesExcluding(poolSize, Math.min(need, room), tried);
    if (!batch.length) break;
    for (const g of batch) {
      tried.add(g);
      mergeGlobalIntoGrouped(segments, grouped, g);
    }
    await prefetchGrouped();
    questions = materialize();
  }

  shuffleInPlace(questions);
  const trimmed = questions.slice(0, Math.min(n, questions.length));
  return { questions: trimmed, poolSize };
}

export function renderSimulationSetup(detail, data, counts, hideEmpty, filterOnly) {
  const topicsWithData = filterTopicsForDisplay(data.topics || [], counts, hideEmpty).filter((t) =>
    (t.subtopics || []).some((s) => (counts[s.id] ?? 0) > 0)
  );
  const topicQuestionTotal = (t) =>
    (t.subtopics || []).reduce((sum, s) => sum + (counts[s.id] ?? 0), 0);
  const maxQ = topicsWithData.reduce((sum, t) => sum + topicQuestionTotal(t), 0);
  const defaultCount = Math.min(20, Math.max(1, maxQ));
  const presetVals = [10, 20, 30, 40];
  const presetBtns = presetVals
    .map(
      (n) =>
        `<button type="button" class="simulation-preset" data-count="${n}" ${maxQ ? '' : 'disabled'}>${n}</button>`
    )
    .join('');
  const topicToggles = topicsWithData.length
    ? topicsWithData
        .map((t) => {
          const nQ = topicQuestionTotal(t);
          const displayName = getTopicDisplayName(t, true);
          const name = escapeHtml(displayName);
          const icon = getCategoryIcon(t.id);
          const countLabel = nQ === 1 ? '1 pitanje' : `${nQ} pitanja`;
          const tid = escapeHtml(t.id);
          const aria = escapeHtml(`${displayName}, ${countLabel}, uključeno u simulaciju`);
          return `<button type="button" class="simulation-topic-toggle is-on" data-topic-id="${tid}" data-q="${nQ}" aria-pressed="true" aria-label="${aria}">
            <span class="simulation-topic-toggle__check" aria-hidden="true">✓</span>
            <span class="simulation-topic-toggle__emoji" aria-hidden="true">${icon}</span>
            <span class="simulation-topic-toggle__body">
              <span class="simulation-topic-toggle__name">${name}</span>
              <span class="simulation-topic-toggle__count">${countLabel}</span>
            </span>
          </button>`;
        })
        .join('')
    : '';

  detail.innerHTML = `
    <article class="page simulation-setup simulation-page${filterOnly ? ' page--filter-only' : ''}">
      <div class="simulation-page__panel">
        <header class="simulation-page__sheet-head">
          <h2 class="simulation-page__title">Simulacija</h2>
          <p class="simulation-page__stat" id="simulationStatWrap" role="status"${maxQ > 0 ? '' : ' hidden'}>
            <strong id="simulationStatTotal">${maxQ}</strong><span>pitanja u ovom skupu</span>
          </p>
        </header>
        <form class="simulation-form-compact" id="simulationForm" novalidate>
          <div class="simulation-controls">
            <div class="simulation-controls__cell">
              <label class="simulation-controls__label" for="simulationCount">Koliko pitanja</label>
              <div class="simulation-count-group" role="presentation">
                <div class="simulation-presets" role="group" aria-label="Brz izbor broja pitanja">
                  ${presetBtns}
                </div>
                <input type="number" class="simulation-count-input" id="simulationCount" name="count" min="1" max="${Math.max(1, maxQ)}" value="${defaultCount}" required inputmode="numeric" aria-describedby="simulationCountHint simulationPresetsHint">
              </div>
              <p class="simulation-controls__hint simulation-controls__hint--sr-only" id="simulationPresetsHint">Brzi izbor: 10, 20, 30 ili 40 pitanja.</p>
              <p class="simulation-controls__hint" id="simulationCountHint">Najviše <strong>${maxQ}</strong> u uključenim oblastima.</p>
            </div>
            <div class="simulation-controls__cell">
              <label class="simulation-controls__label" for="simulationTimer">Tajmer</label>
              <select class="simulation-select" id="simulationTimer" name="timer" aria-label="Vreme za simulaciju">
                ${timerPresetOptionsHtml(getExamTimerSeconds())}
              </select>
              <p class="simulation-controls__hint simulation-controls__hint--muted">Isključeno ili kao na ispitu.</p>
            </div>
          </div>

          <div class="simulation-topics-block">
            ${
              topicToggles
                ? `<div class="simulation-topics-head">
              <div class="simulation-topics-head__row">
                <span class="simulation-topics-head__title">Oblasti</span>
                <div class="simulation-topics-head__actions">
                  <button type="button" class="simulation-chip-btn" id="simulationTopicsAll">Sve</button>
                  <button type="button" class="simulation-chip-btn" id="simulationTopicsNone">Ništa</button>
                </div>
              </div>
              <p class="simulation-topics-head__hint">Klik na karticu uključuje ili isključuje oblast.</p>
            </div>
            <div class="simulation-topic-grid" role="group" aria-label="Oblasti u simulaciji. Klik uključuje ili isključuje oblast.">${topicToggles}</div>`
                : '<p class="simulation-topic-grid-empty">Nema oblasti sa pitanjima u trenutnom filteru. Proverite početnu ili isključite „Sakrij oblasti bez pitanja“.</p>'
            }
          </div>

          <p class="simulation-form-error" id="simulationFormError" hidden role="alert"></p>
          <button type="submit" class="simulation-submit"${maxQ ? '' : ' disabled'}>Započni simulaciju</button>
        </form>
      </div>
    </article>
  `;

  const form = detail.querySelector('#simulationForm');
  if (!form) return;
  const countInput = form.querySelector('#simulationCount');
  const submitBtn = form.querySelector('.simulation-submit');
  const statWrap = detail.querySelector('#simulationStatWrap');
  const statTotal = detail.querySelector('#simulationStatTotal');
  const countHint = detail.querySelector('#simulationCountHint');
  const countMax = () => parseInt(countInput?.getAttribute('max') || '1', 10);

  function syncSimulationTotals() {
    let sum = 0;
    form.querySelectorAll('.simulation-topic-toggle.is-on').forEach((btn) => {
      sum += parseInt(btn.getAttribute('data-q') || '0', 10);
    });
    if (statWrap) statWrap.hidden = sum <= 0;
    if (statTotal && sum > 0) statTotal.textContent = String(sum);
    if (countHint) countHint.innerHTML = `Najviše <strong>${sum}</strong> u uključenim oblastima.`;
    if (countInput) {
      const cap = Math.max(1, sum);
      countInput.max = String(cap);
      const v = parseInt(countInput.value, 10);
      if (Number.isFinite(v)) {
        if (v > cap) countInput.value = String(cap);
        if (sum > 0 && v < 1) countInput.value = '1';
      }
    }
    if (submitBtn) submitBtn.disabled = sum <= 0;
    form.querySelectorAll('.simulation-preset').forEach((b) => {
      b.disabled = sum <= 0;
    });
  }

  detail.querySelectorAll('.simulation-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = parseInt(String(btn.getAttribute('data-count')), 10);
      const cap = countMax();
      if (countInput && Number.isFinite(n)) {
        countInput.value = String(Math.min(cap, Math.max(1, n)));
      }
    });
  });

  form.querySelectorAll('.simulation-topic-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nowOn = !btn.classList.contains('is-on');
      btn.classList.toggle('is-on', nowOn);
      btn.classList.toggle('is-off', !nowOn);
      btn.setAttribute('aria-pressed', nowOn ? 'true' : 'false');
      syncSimulationTotals();
    });
  });

  detail.querySelector('#simulationTopicsAll')?.addEventListener('click', () => {
    form.querySelectorAll('.simulation-topic-toggle').forEach((btn) => {
      btn.classList.add('is-on');
      btn.classList.remove('is-off');
      btn.setAttribute('aria-pressed', 'true');
    });
    syncSimulationTotals();
  });
  detail.querySelector('#simulationTopicsNone')?.addEventListener('click', () => {
    form.querySelectorAll('.simulation-topic-toggle').forEach((btn) => {
      btn.classList.remove('is-on');
      btn.classList.add('is-off');
      btn.setAttribute('aria-pressed', 'false');
    });
    syncSimulationTotals();
  });

  const formErr = form.querySelector('#simulationFormError');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (formErr) {
      formErr.hidden = true;
      formErr.textContent = '';
    }
    const selected = Array.from(form.querySelectorAll('.simulation-topic-toggle.is-on')).map((b) =>
      b.getAttribute('data-topic-id')
    );
    if (selected.length === 0) {
      if (formErr) {
        formErr.textContent = 'Uključite bar jednu oblast.';
        formErr.hidden = false;
      }
      return;
    }
    const fd = new FormData(form);
    const count = parseInt(String(fd.get('count') || '20'), 10);
    const timer = parseInt(String(fd.get('timer') || '0'), 10);
    setExamTimerSeconds(timer);
    const topicIds = selected;
    for (const k of OLD_SESSION_KEYS) sessionStorage.removeItem(k);
    sessionStorage.setItem(SIMULATION_SESSION_KEY, JSON.stringify({ count, topicIds }));
    navigate(SIMULATION_TOPIC_ID, SIMULATION_PLAY_SEGMENT, null);
  });
}

export async function renderSimulationPlay(detail, data, counts, routeQuestionIndex) {
  const raw = readSimulationSessionRaw();
  if (!raw) {
    clearQuizView();
    detail.innerHTML = `<article class="page page-muted"><div class="soft-empty"><p class="soft-empty__title">Nema aktivne simulacije</p><p class="soft-empty__text">Prvo podesite simulaciju na početnoj ili ispod.</p><p class="soft-empty__action"><a href="/${SIMULATION_TOPIC_ID}" class="soft-empty__link">Podešavanje simulacije</a></p></div></article>`;
    return;
  }
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch {
    clearQuizView();
    detail.innerHTML = `<article class="page page-muted"><div class="soft-empty"><p class="soft-empty__title">Sesija je istekla</p><p class="soft-empty__text">Pokrenite novu simulaciju.</p><p class="soft-empty__action"><a href="/${SIMULATION_TOPIC_ID}" class="soft-empty__link">Nazad na podešavanje</a></p></div></article>`;
    return;
  }
  const { questions, poolSize } = await buildSimulationQuestionList(data, counts, {
    topicIds: cfg.topicIds,
    count: cfg.count,
  });
  if (!questions.length) {
    clearQuizView();
    detail.innerHTML = `<article class="page page-muted"><div class="soft-empty"><p class="soft-empty__title">Nema pitanja u izboru</p><p class="soft-empty__text">Izmenite teme ili broj pitanja u podešavanju.</p><p class="soft-empty__action"><a href="/${SIMULATION_TOPIC_ID}" class="soft-empty__link">Izmeni podešavanje</a></p></div></article>`;
    return;
  }

  const notice =
    questions.length < cfg.count
      ? `<p class="page-meta simulation-notice">Tražili ste ${cfg.count} pitanja; u bazi je dostupno ${poolSize}, pa je prikazano ${questions.length}.</p>`
      : '';

  mountEnrichedQuiz({
    detail,
    questions,
    pageTitle: 'Simulacija',
    metaLine: `${questions.length} slučajnih pitanja`,
    descriptionBlock: notice,
    pathTopicId: SIMULATION_TOPIC_ID,
    pathSubtopicId: SIMULATION_PLAY_SEGMENT,
    routeQuestionIndex,
    showTopicSource: true,
    bookmarksEnabled: true,
    onRetry: () => {
      sessionStorage.setItem(SIMULATION_SESSION_KEY, JSON.stringify(cfg));
      void renderSimulationPlay(detail, data, counts, null);
    },
  });
}
