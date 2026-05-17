import { PATHS } from '../../config.js';
import { ICONS } from '../../icons.js';
import { getDisplayAnswerOrder } from '../../lib/answer-order.js';
import { isBookmarked } from '../../lib/bookmarks.js';
import { escapeHtml, html } from '../../utils/dom.js';

export function fieldKeyForQuestion(q) {
  return q._fieldKey ?? String(q.id);
}

export function renderQuestionCard(q, i, ctx) {
  const {
    showAnswers,
    isSimulation,
    isResults,
    results,
    totalQuestions,
    bookmarksEnabled = false,
    showTopicSource = false,
  } = ctx;
  const fieldKey = fieldKeyForQuestion(q);
  const compositeKey = q._compositeKey ?? fieldKey;
  const { ordered, correctIndices } = getDisplayAnswerOrder(q);
  const requiredCount = correctIndices.length > 0 ? correctIndices.length : (q.correctAnswerCount ?? 1);
  const isSingle = requiredCount <= 1;
  const userSelected = results?.get(fieldKey);
  const isCorrect =
    userSelected != null
      ? userSelected.length === correctIndices.length && userSelected.every((idx) => correctIndices.includes(idx))
      : null;

  const answersHtml = ordered
    .map((o, idx) => {
      const correct = o.correct;
      let stateClass = '';
      if (isResults && userSelected !== undefined) {
        const selected = userSelected.includes(idx);
        if (correct && selected) stateClass = 'correct';
        else if (correct && !selected) stateClass = 'correct-missed';
        else if (!correct && selected) stateClass = 'incorrect';
      }
      const checked = userSelected?.includes(idx) ? 'checked' : '';
      return html`
        <label class="answer answer-selectable ${stateClass}" data-index="${idx}" data-correct="${correct}">
          <input type="${isSingle ? 'radio' : 'checkbox'}" name="${fieldKey}" value="${idx}"${checked ? ' checked' : ''}>
          <span class="answer-text">${o.text}</span>
        </label>
      `;
    })
    .join('');

  const isRevealed = showAnswers || isResults;
  const cardClass = `question-card ${isSimulation ? 'simulation' : ''} ${isRevealed ? 'revealed' : ''}`;
  const isImageGrid =
    q.image &&
    ordered.length === 4 &&
    ordered.every((o) => /^[1-4]$/.test(String(o.text || '').trim()));
  const answersClass = `answers${isImageGrid ? ' answers-image-grid' : ''}`;
  const resultBadge =
    isResults && userSelected !== undefined
      ? `<span class="result-badge ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? '✓ Tačno' : '✗ Netačno'}</span>`
      : '';

  const hintParts = [];
  if (isSimulation && !isResults && !isSingle)
    hintParts.push(`Broj potrebnih odgovora: ${requiredCount}`);
  const hintHtml = hintParts.length ? `<p class="question-hint">${hintParts.join(' · ')}</p>` : '';
  const explanationHtml = q.explanation
    ? `<p class="question-explanation">${escapeHtml(q.explanation)}</p>`
    : '';
  const imgHtml = q.image
    ? `<img src="${PATHS.image(q.image)}" alt="Ilustracija pitanja" class="question-img" width="640" height="360" loading="lazy" decoding="async">`
    : '';

  const eyeBtn =
    !isResults
      ? `<button type="button" class="btn-reveal-question" aria-label="Prikaži odgovor" title="Prikaži odgovor">${ICONS.eyeOn}</button>`
      : '';

  const starOn = bookmarksEnabled && isBookmarked(compositeKey);
  const bookmarkBtn =
    bookmarksEnabled && !isResults
      ? `<button type="button" class="btn-bookmark${starOn ? ' is-active' : ''}" data-composite-key="${escapeHtml(compositeKey)}" aria-pressed="${starOn ? 'true' : 'false'}" aria-label="${starOn ? 'Ukloni obeležje' : 'Obeleži pitanje'}" title="${starOn ? 'Ukloni obeležje' : 'Obeleži pitanje'}"><span class="btn-bookmark__icon" aria-hidden="true">${starOn ? '★' : '☆'}</span></button>`
      : '';

  const sourceHtml =
    showTopicSource && q._topicName ? `<p class="question-source">${escapeHtml(q._topicName)}</p>` : '';

  return html`
    <div class="${cardClass}" data-id="${q.id}" data-question-index="${i}" data-field-key="${escapeHtml(fieldKey)}">
      <div class="question-header">
        <span class="question-num">${totalQuestions != null ? `${i + 1} / ${totalQuestions}` : i + 1}</span>
        <div class="question-content">
          <p class="question-text">${q.text}</p>
          ${html.raw(sourceHtml)}
          ${html.raw(hintHtml)}
          ${html.raw(resultBadge)}
          ${html.raw(imgHtml)}
        </div>
        <div class="question-header-actions">
          ${html.raw(bookmarkBtn)}
          ${html.raw(eyeBtn)}
        </div>
      </div>
      <div class="${answersClass}">
        ${html.raw(answersHtml)}
      </div>
      ${html.raw(explanationHtml)}
    </div>
  `;
}
