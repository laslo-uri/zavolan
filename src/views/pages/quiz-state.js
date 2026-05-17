export const quizLifecycle = {
  /** @type {AbortController | null} */
  navAbortController: null,
  /** @type {IntersectionObserver | null} */
  navObserver: null,
  /** @type {(() => void) | null} */
  examTimerCleanup: null,
};

export function clearQuizView() {
  document.body.classList.remove('quiz-page');
  if (quizLifecycle.examTimerCleanup) {
    quizLifecycle.examTimerCleanup();
    quizLifecycle.examTimerCleanup = null;
  }
  if (quizLifecycle.navAbortController) {
    quizLifecycle.navAbortController.abort();
    quizLifecycle.navAbortController = null;
  }
  if (quizLifecycle.navObserver) {
    quizLifecycle.navObserver.disconnect();
    quizLifecycle.navObserver = null;
  }
}
