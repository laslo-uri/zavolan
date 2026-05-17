import { escapeHtml } from '../../utils/dom.js';

function getCompactQuestionText(q) {
  return q?.textShort ?? q?.text ?? 'Pitanje bez teksta';
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getModalFocusables(overlay) {
  const panel = overlay.querySelector('.modal-overlay__content');
  if (!panel) return [];
  return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

export function showSubmitConfirmModal(opts) {
  const { unanswered, totalQuestions, onProceed, onCancel, onGoToQuestion } = opts;
  const answered = totalQuestions ? totalQuestions - unanswered.length : 0;
  const returnFocusEl =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay submit-confirm-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'submitConfirmTitle');

  const listHtml = unanswered
    .map(
      ({ q, index }) => `
        <li class="submit-confirm-modal__item">
          <button type="button" class="submit-confirm-modal__link" data-question-index="${index}">
            <span class="submit-confirm-modal__num">${index + 1}</span>
            <span class="submit-confirm-modal__snippet">${escapeHtml(getCompactQuestionText(q))}</span>
          </button>
        </li>
      `
    )
    .join('');

  overlay.innerHTML = `
    <div class="modal-overlay__backdrop" data-dismiss></div>
    <div class="modal-overlay__content submit-confirm-modal__content">
      <h2 id="submitConfirmTitle" class="submit-confirm-modal__title">Niste odgovorili na sva pitanja</h2>
      <p class="submit-confirm-modal__counter">Odgovorili ste na <strong>${answered}</strong> od <strong>${totalQuestions}</strong> pitanja.</p>
      <p class="submit-confirm-modal__text">Da li želite da proverite rezultat? Nedostaju sledeća pitanja:</p>
      <ul class="submit-confirm-modal__list">${listHtml}</ul>
      <p class="submit-confirm-modal__hint">Kliknite na pitanje da pređete direktno na njega.</p>
      <div class="submit-confirm-modal__actions">
        <button type="button" class="btn-secondary" id="btnSubmitConfirmCancel">Otkaži</button>
        <button type="button" class="btn-primary btn-warning" id="btnSubmitConfirmProceed">Proveri ipak</button>
      </div>
    </div>
  `;

  function restoreFocus() {
    if (
      returnFocusEl &&
      document.body.contains(returnFocusEl) &&
      typeof returnFocusEl.focus === 'function'
    ) {
      try {
        returnFocusEl.focus();
      } catch {
        void 0;
      }
    }
  }

  function onTrapKeydown(e) {
    if (e.key !== 'Tab') return;
    const list = getModalFocusables(overlay);
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onEscapeKeydown(e) {
    if (e.key !== 'Escape') return;
    onCancel();
    closeModal();
  }

  function removeListeners() {
    document.removeEventListener('keydown', onTrapKeydown, true);
    document.removeEventListener('keydown', onEscapeKeydown);
  }

  function closeModal(options = {}) {
    const { afterRemove } = options;
    removeListeners();
    overlay.classList.remove('visible');
    overlay.style.pointerEvents = 'none';
    let finished = false;
    function complete() {
      if (finished) return;
      finished = true;
      overlay.removeEventListener('transitionend', onTransitionEnd);
      overlay.remove();
      restoreFocus();
      afterRemove?.();
    }
    function onTransitionEnd(e) {
      if (e.target === overlay && e.propertyName === 'opacity') complete();
    }
    overlay.addEventListener('transitionend', onTransitionEnd);
    window.setTimeout(complete, 400);
  }

  overlay.querySelector('[data-dismiss]').addEventListener('click', () => {
    onCancel();
    closeModal();
  });

  overlay.querySelector('#btnSubmitConfirmCancel').addEventListener('click', () => {
    onCancel();
    closeModal();
  });

  overlay.querySelector('#btnSubmitConfirmProceed').addEventListener('click', () => {
    closeModal();
    onProceed();
  });

  overlay.querySelectorAll('.submit-confirm-modal__link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.questionIndex, 10);
      if (!Number.isNaN(index)) {
        closeModal({ afterRemove: () => onGoToQuestion(index) });
      }
    });
  });

  document.body.appendChild(overlay);
  document.addEventListener('keydown', onTrapKeydown, true);
  document.addEventListener('keydown', onEscapeKeydown);
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    requestAnimationFrame(() => {
      const cancelBtn = overlay.querySelector('#btnSubmitConfirmCancel');
      if (cancelBtn && typeof cancelBtn.focus === 'function') cancelBtn.focus();
    });
  });
}
