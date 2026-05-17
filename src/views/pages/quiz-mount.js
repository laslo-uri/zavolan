import { BOOKMARKS_TOPIC_ID, SIMULATION_TOPIC_ID } from '../../config.js';
import { ICONS } from '../../icons.js';
import { toggleBookmark } from '../../lib/bookmarks.js';
import { getExamTimerSeconds, startExamCountdown } from '../../lib/exam-timer.js';
import { recordSubtopicAttempt } from '../../lib/progress.js';
import { replaceQuestionPath } from '../../lib/router.js';
import { attachAnswerDeselectHandlers } from '../../lib/answer-selection.js';
import { getDisplayAnswerOrder } from '../../lib/answer-order.js';
import { fieldKeyForQuestion } from './question-card.js';
import { filterWrongQuestions, renderQuestionsView } from './quiz-templates.js';
import { clearQuizView, quizLifecycle } from './quiz-state.js';
import { showSubmitConfirmModal } from './submit-modal.js';

function attachQuizNavForQuiz(detail, total, pathTopicId, pathSubtopicId, initialQuestionIndex, redirectRef) {
  if (quizLifecycle.navAbortController) {
    quizLifecycle.navAbortController.abort();
    quizLifecycle.navAbortController = null;
  }
  quizLifecycle.navAbortController = new AbortController();
  const signal = quizLifecycle.navAbortController.signal;

  const scrollEl = document.querySelector('.content');
  const cards = detail.querySelectorAll('.question-card');
  const counter = detail.querySelector('#quizNavCounter');
  const btnTop = detail.querySelector('#btnQuizNavTop');
  const btnBottom = detail.querySelector('#btnQuizNavBottom');
  const btnPrev = detail.querySelector('#btnQuizNavPrev');
  const btnNext = detail.querySelector('#btnQuizNavNext');
  if (!scrollEl || !cards.length || !counter) return;

  const initialIdx =
    initialQuestionIndex != null && initialQuestionIndex >= 1 && initialQuestionIndex <= total
      ? initialQuestionIndex - 1
      : 0;
  let currentIndex = initialIdx;

  setActiveCard(initialIdx);
  updateCounter();

  function updateUrl() {
    replaceQuestionPath(pathTopicId, pathSubtopicId, currentIndex + 1);
  }

  function updateCounter() {
    counter.textContent = `${currentIndex + 1} / ${total}`;
    if (btnPrev) btnPrev.disabled = currentIndex <= 0;
    if (btnNext) btnNext.disabled = currentIndex >= total - 1;
    updateUrl();
  }

  function setActiveCard(index) {
    cards.forEach((c, i) => c.classList.toggle('active', i === index));
  }

  function scrollToCard(index, instant = false) {
    const card = cards[index];
    if (card) {
      currentIndex = index;
      setActiveCard(index);
      updateCounter();
      card.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
    }
  }

  if (btnTop) {
    btnTop.addEventListener(
      'click',
      () => {
        scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
        currentIndex = 0;
        setActiveCard(0);
        updateCounter();
      },
      { signal }
    );
  }
  if (btnBottom) {
    btnBottom.addEventListener(
      'click',
      () => {
        const maxScroll = scrollEl ? scrollEl.scrollHeight - scrollEl.clientHeight : 0;
        scrollEl?.scrollTo({ top: maxScroll, behavior: 'smooth' });
        currentIndex = total - 1;
        setActiveCard(total - 1);
        updateCounter();
      },
      { signal }
    );
  }
  if (btnPrev) {
    btnPrev.addEventListener(
      'click',
      () => {
        if (currentIndex > 0) {
          currentIndex--;
          updateCounter();
          scrollToCard(currentIndex);
        }
      },
      { signal }
    );
  }
  if (btnNext) {
    btnNext.addEventListener(
      'click',
      () => {
        if (currentIndex < total - 1) {
          currentIndex++;
          updateCounter();
          scrollToCard(currentIndex);
        }
      },
      { signal }
    );
  }

  function onKeyDown(e) {
    if (!document.body.classList.contains('quiz-page') || !detail.querySelector('.quiz-nav')) return;
    const active = document.activeElement;
    if (active && active.closest('.question-card') && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName)) return;
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      if (currentIndex > 0) {
        e.preventDefault();
        currentIndex--;
        scrollToCard(currentIndex);
      }
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      if (currentIndex < total - 1) {
        e.preventDefault();
        currentIndex++;
        scrollToCard(currentIndex);
      }
    }
  }
  document.addEventListener('keydown', onKeyDown, { signal });

  function syncFromScroll() {
    if (redirectRef.current) return;
    const focusY = window.innerHeight * 0.35;
    let bestIdx = 0;
    let bestDist = Infinity;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const centerY = r.top + r.height / 2;
      const dist = Math.abs(centerY - focusY);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    currentIndex = bestIdx;
    setActiveCard(bestIdx);
    updateCounter();
  }

  let scrollRafId = null;
  function onScroll() {
    if (scrollRafId) return;
    scrollRafId = requestAnimationFrame(() => {
      syncFromScroll();
      scrollRafId = null;
    });
  }

  scrollEl?.addEventListener('scroll', onScroll, { passive: true, signal });
  if ('onscrollend' in window) {
    scrollEl?.addEventListener('scrollend', syncFromScroll, { signal });
  }

  quizLifecycle.navObserver = new IntersectionObserver(
    (entries) => {
      let bestIdx = -1;
      let bestRatio = 0;
      for (const e of entries) {
        if (e.isIntersecting) {
          const idx = parseInt(e.target.dataset.questionIndex, 10);
          if (!Number.isNaN(idx) && idx >= 0 && e.intersectionRatio > bestRatio) {
            bestIdx = idx;
            bestRatio = e.intersectionRatio;
          }
        }
      }
      if (bestIdx >= 0) {
        currentIndex = bestIdx;
        setActiveCard(bestIdx);
        updateCounter();
      }
    },
    { root: scrollEl, rootMargin: '-30% 0px -30% 0px', threshold: [0, 0.1, 0.5, 1] }
  );
  cards.forEach((c) => quizLifecycle.navObserver.observe(c));

  if (initialIdx > 0) {
    requestAnimationFrame(() => {
      scrollToCard(initialIdx, true);
      syncFromScroll();
    });
  } else {
    syncFromScroll();
  }
}

function attachPitanjaHandlersForQuiz(detail, questions, ctx) {
  const {
    pathTopicId,
    pathSubtopicId,
    routeQuestionIndex,
    redirectRef,
    onRetry,
    bookmarksEnabled,
    mountOpts,
    lastResults,
  } = ctx;

  detail.querySelectorAll('.btn-bookmark').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-composite-key');
      if (!key) return;
      const nowStarred = toggleBookmark(key);
      btn.classList.toggle('is-active', nowStarred);
      btn.setAttribute('aria-pressed', nowStarred ? 'true' : 'false');
      btn.setAttribute('aria-label', nowStarred ? 'Ukloni obeležje' : 'Obeleži pitanje');
      btn.setAttribute('title', nowStarred ? 'Ukloni obeležje' : 'Obeleži pitanje');
      const icon = btn.querySelector('.btn-bookmark__icon');
      if (icon) icon.textContent = nowStarred ? '★' : '☆';
    });
  });

  detail.querySelectorAll('.btn-reveal-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.question-card');
      if (card) {
        const isRevealed = card.classList.toggle('revealed');
        btn.classList.toggle('active', isRevealed);
        btn.setAttribute('aria-label', isRevealed ? 'Skrij odgovor' : 'Prikaži odgovor');
        btn.setAttribute('title', isRevealed ? 'Skrij odgovor' : 'Prikaži odgovor');
        btn.innerHTML = isRevealed ? ICONS.eyeOff : ICONS.eyeOn;
      }
    });
  });

  const btnSubmit = detail.querySelector('#btnSubmit');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      const results = new Map();
      const unanswered = [];
      questions.forEach((q, i) => {
        const fk = fieldKeyForQuestion(q);
        const checked = detail.querySelectorAll(`input[name="${CSS.escape(fk)}"]:checked`);
        const collected = Array.from(checked).map((el) => parseInt(el.value, 10));
        results.set(fk, collected);
        if (collected.length === 0) unanswered.push({ q, index: i });
      });

      function doSubmit() {
        if (quizLifecycle.examTimerCleanup) {
          quizLifecycle.examTimerCleanup();
          quizLifecycle.examTimerCleanup = null;
        }
        if (ctx.progressMeta) {
          let correct = 0;
          for (const q of questions) {
            const fk = fieldKeyForQuestion(q);
            const { correctIndices } = getDisplayAnswerOrder(q);
            const userSelected = results.get(fk) || [];
            if (
              userSelected.length === correctIndices.length &&
              userSelected.every((idx) => correctIndices.includes(idx))
            ) {
              correct++;
            }
          }
          recordSubtopicAttempt({
            ...ctx.progressMeta,
            correct,
            total: questions.length,
          });
        }
        clearQuizView();
        document.body.classList.add('quiz-page');
        detail.innerHTML = renderQuestionsView(questions, results, {
          showTopicSource: ctx.showTopicSource,
          bookmarksEnabled,
          showTimerMount: false,
          pageTitle: ctx.pageTitle,
          metaLine: ctx.metaLine,
          descriptionBlock: ctx.descriptionBlock,
          articleClassExtra: ctx.articleClassExtra,
        });
        attachPitanjaHandlersForQuiz(detail, questions, {
          ...ctx,
          onRetry,
          lastResults: results,
        });
      }

      if (unanswered.length === 0) {
        doSubmit();
        return;
      }

      showSubmitConfirmModal({
        unanswered,
        totalQuestions: questions.length,
        onProceed: doSubmit,
        onCancel: () => {},
        onGoToQuestion: (index) => {
          redirectRef.current = true;
          const card = detail.querySelector(`.question-card[data-question-index="${index}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            card.classList.add('highlight-pulse');
            setTimeout(() => {
              card.classList.remove('highlight-pulse');
              redirectRef.current = false;
            }, 1800);
          } else {
            redirectRef.current = false;
          }
        },
      });
    });
  }

  const btnRetry = detail.querySelector('#btnRetry');
  if (btnRetry) {
    btnRetry.addEventListener('click', () => {
      onRetry();
    });
  }

  const btnRetryWrong = detail.querySelector('#btnRetryWrong');
  if (btnRetryWrong && lastResults && mountOpts) {
    btnRetryWrong.addEventListener('click', () => {
      const wrongQs = filterWrongQuestions(questions, lastResults);
      if (wrongQs.length === 0) return;
      mountEnrichedQuiz({
        ...mountOpts,
        questions: wrongQs,
        routeQuestionIndex: null,
        progressMeta: null,
      });
    });
  }

  attachQuizNavForQuiz(detail, questions.length, pathTopicId, pathSubtopicId, routeQuestionIndex, redirectRef);

  attachAnswerDeselectHandlers(detail, {
    readOnly: Boolean(lastResults),
    signal: quizLifecycle.navAbortController?.signal,
  });
}

function startExamTimerIfNeeded(detail) {
  const sec = getExamTimerSeconds();
  if (sec <= 0) return;
  const mount = detail.querySelector('.quiz-nav .exam-timer');
  if (!mount) return;
  quizLifecycle.examTimerCleanup = startExamCountdown(mount, {
    totalSeconds: sec,
    onExpire: () => {
      const sub = detail.querySelector('#btnSubmit');
      if (sub) sub.click();
    },
  });
}

export function mountEnrichedQuiz(opts) {
  const {
    detail,
    questions,
    pageTitle,
    metaLine,
    descriptionBlock,
    pathTopicId,
    pathSubtopicId,
    routeQuestionIndex,
    showTopicSource = false,
    bookmarksEnabled = true,
    onRetry,
    progressMeta = null,
  } = opts;

  const articleClassExtra =
    pathTopicId === BOOKMARKS_TOPIC_ID
      ? 'page--bookmarks-mode'
      : pathTopicId === SIMULATION_TOPIC_ID
        ? 'page--simulation-quiz'
        : '';

  const mountOpts = { ...opts, progressMeta };
  const redirectRef = { current: false };
  const ctx = {
    pathTopicId,
    pathSubtopicId,
    routeQuestionIndex,
    redirectRef,
    showTopicSource,
    pageTitle,
    metaLine,
    descriptionBlock,
    onRetry,
    bookmarksEnabled,
    articleClassExtra,
    progressMeta,
    mountOpts,
    lastResults: null,
  };

  clearQuizView();
  document.body.classList.add('quiz-page');
  const examTimerAllowed = pathTopicId !== BOOKMARKS_TOPIC_ID;
  const timerOn = examTimerAllowed && getExamTimerSeconds() > 0;

  detail.innerHTML = renderQuestionsView(questions, null, {
    showTopicSource,
    bookmarksEnabled,
    showTimerMount: timerOn,
    pageTitle,
    metaLine,
    descriptionBlock,
    articleClassExtra,
  });

  startExamTimerIfNeeded(detail);
  attachPitanjaHandlersForQuiz(detail, questions, ctx);
}
