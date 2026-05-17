import { getDisplayAnswerOrder } from '../../lib/answer-order.js';
import { escapeHtml } from '../../utils/dom.js';
import { fieldKeyForQuestion, renderQuestionCard } from './question-card.js';

const PASS_THRESHOLD = 80;

export function isQuestionAnswerCorrect(q, results) {
  const fk = fieldKeyForQuestion(q);
  const { correctIndices } = getDisplayAnswerOrder(q);
  const userSelected = results.get(fk) || [];
  return (
    userSelected.length === correctIndices.length &&
    userSelected.every((idx) => correctIndices.includes(idx))
  );
}

export function filterWrongQuestions(questions, results) {
  return questions.filter((q) => !isQuestionAnswerCorrect(q, results));
}

function renderWeakAreasBlock(questions, results) {
  const wrongByTopic = new Map();
  for (const q of questions) {
    const fk = fieldKeyForQuestion(q);
    const { correctIndices } = getDisplayAnswerOrder(q);
    const userSelected = results.get(fk) || [];
    const ok =
      userSelected.length === correctIndices.length &&
      userSelected.every((idx) => correctIndices.includes(idx));
    if (!ok && q._topicName) {
      wrongByTopic.set(q._topicName, (wrongByTopic.get(q._topicName) || 0) + 1);
    }
  }
  if (wrongByTopic.size === 0) return '';
  const sorted = [...wrongByTopic.entries()].sort((a, b) => b[1] - a[1]);
  const items = sorted
    .map(
      ([name, n]) =>
        `<li class="weak-areas__item"><span class="weak-areas__name">${escapeHtml(name)}</span><span class="weak-areas__count">${n} netačno</span></li>`
    )
    .join('');
  return `
    <div class="weak-areas">
      <h3 class="weak-areas__title">Preporuka za vežbu</h3>
      <p class="weak-areas__hint">Oblasti sa najviše netačnih odgovora u ovom pokušaju:</p>
      <ul class="weak-areas__list">${items}</ul>
    </div>
  `;
}

function renderResultSummary(questions, results) {
  let correct = 0;
  questions.forEach((q) => {
    const { correctIndices } = getDisplayAnswerOrder(q);
    const userSelected = results.get(fieldKeyForQuestion(q)) || [];
    if (
      userSelected.length === correctIndices.length &&
      userSelected.every((idx) => correctIndices.includes(idx))
    ) {
      correct++;
    }
  });
  const total = questions.length;
  const wrong = total - correct;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= PASS_THRESHOLD;
  const weakHtml = renderWeakAreasBlock(questions, results);

  return `
    <div class="result-summary result-summary--${passed ? 'pass' : 'fail'}">
      <div class="result-summary__score-ring" aria-hidden="true">
        <svg viewBox="0 0 36 36" class="result-summary__ring-svg">
          <path class="result-summary__ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path class="result-summary__ring-fill" stroke-dasharray="${pct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <span class="result-summary__score-value">${pct}<small>%</small></span>
      </div>
      <div class="result-summary__body">
        <h2 class="result-summary__title">${passed ? 'Odlično! Položeno!' : 'Probaj ponovo'}</h2>
        <p class="result-summary__subtitle">${passed ? 'Zadovoljili ste uslove za polaganje.' : 'Potrebno je najmanje 80% tačnih odgovora.'}</p>
        <div class="result-summary__stats">
          <span class="result-summary__stat result-summary__stat--correct">
            <span class="result-summary__stat-value">${correct}</span>
            <span class="result-summary__stat-label">tačno</span>
          </span>
          <span class="result-summary__stat result-summary__stat--wrong">
            <span class="result-summary__stat-value">${wrong}</span>
            <span class="result-summary__stat-label">netačno</span>
          </span>
        </div>
        ${weakHtml}
        <div class="result-summary__actions">
          <button type="button" class="btn-retry" id="btnRetry">
            <span class="btn-retry__icon" aria-hidden="true">↻</span>
            Pokušaj ponovo
          </button>
          <button type="button" class="btn-retry btn-retry--secondary" id="btnRetryWrong"${
            wrong === 0 ? ' disabled' : ''
          } aria-label="Vežbaj samo netačna pitanja iz ovog pokušaja">
            Samo netačna (${wrong})
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderExamTimerNavEmbed() {
  return `<div class="exam-timer exam-timer--nav" role="timer" aria-live="off" aria-label="Preostalo vreme za test">
    <span class="exam-timer__text">--:--</span>
    <div class="exam-timer__track" aria-hidden="true"><div class="exam-timer__fill"></div></div>
  </div>`;
}

export function renderQuestionsView(questions, results = null, viewOpts = {}) {
  const {
    showTopicSource = false,
    bookmarksEnabled = false,
    showTimerMount = false,
    pageTitle = '',
    metaLine = '',
    descriptionBlock = '',
    articleClassExtra = '',
  } = viewOpts;
  const descSafe = descriptionBlock || '';
  const articleClass = ['page', articleClassExtra].filter(Boolean).join(' ');
  const isBookmarksQuizPage = articleClassExtra.split(/\s+/).includes('page--bookmarks-mode');

  const isResults = results !== null;
  const ctx = {
    showAnswers: false,
    isSimulation: true,
    isResults,
    results,
    totalQuestions: questions.length,
    bookmarksEnabled,
    showTopicSource,
  };
  const questionsHtml = questions.map((q, i) => renderQuestionCard(q, i, ctx)).join('');

  const resultSummary = isResults && results ? renderResultSummary(questions, results) : '';

  const bottomActions = !isResults
    ? `<div class="quiz-actions">
          <p class="quiz-actions-hint">Odgovorili ste na sva pitanja? Proverite svoje znanje.</p>
          <button type="button" class="btn-submit" id="btnSubmit">Proveri rezultat</button>
        </div>`
    : '';

  const timerNavEmbed =
    !isResults && showTimerMount && !isBookmarksQuizPage ? renderExamTimerNavEmbed() : '';
  const navAria =
    timerNavEmbed !== ''
      ? 'Navigacija kroz pitanja i preostalo vreme'
      : 'Navigacija kroz pitanja';

  const kbdHint =
    !isResults && questions.length > 1
      ? `<p class="quiz-nav-hint-kbd" id="quizNavKbdHint">Tip: tastaturi ← → ili ↑ ↓ menjaju aktivno pitanje (van polja za odgovor).</p>`
      : '';

  return `
      <article class="${articleClass}">
        <h2 class="page-title">${pageTitle}</h2>
        ${metaLine ? `<p class="page-meta page-meta-with-icon">${metaLine}</p>` : ''}
        ${descSafe}
        ${resultSummary}
        <div class="questions-list">
          ${questionsHtml}
        </div>
        ${bottomActions}
        <nav class="quiz-nav${timerNavEmbed ? ' quiz-nav--has-timer' : ''}" aria-label="${navAria}">
          ${timerNavEmbed}
          <button type="button" class="quiz-nav__btn quiz-nav__btn--top" id="btnQuizNavTop" aria-label="Na vrh" title="Na vrh">↑</button>
          <button type="button" class="quiz-nav__btn quiz-nav__btn--prev" id="btnQuizNavPrev" aria-label="Prethodno pitanje" title="Prethodno">←</button>
          <span class="quiz-nav__counter" id="quizNavCounter">1 / ${questions.length}</span>
          <button type="button" class="quiz-nav__btn quiz-nav__btn--next" id="btnQuizNavNext" aria-label="Sledeće pitanje" title="Sledeće">→</button>
          <button type="button" class="quiz-nav__btn quiz-nav__btn--bottom" id="btnQuizNavBottom" aria-label="Na dno" title="Na dno">↓</button>
          ${kbdHint}
        </nav>
      </article>
    `;
}
