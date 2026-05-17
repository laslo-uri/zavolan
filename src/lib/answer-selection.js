const WAS_CHECKED = 'data-was-checked';

function resolveInput(target) {
  if (!(target instanceof Element)) return null;
  const label = target.closest('.answer-selectable');
  if (!label) return null;
  const input = label.querySelector('input[type="radio"], input[type="checkbox"]');
  return input instanceof HTMLInputElement ? input : null;
}

function shouldSkip(input, readOnly) {
  if (readOnly || input.disabled) return true;
  return false;
}

/**
 * Allows clicking an already-selected answer again to clear it (radio and checkbox).
 * @param {ParentNode} root
 * @param {{ readOnly?: boolean, signal?: AbortSignal }} [options]
 */
export function attachAnswerDeselectHandlers(root, options = {}) {
  const { readOnly = false, signal } = options;

  function onMouseDown(e) {
    const input = resolveInput(e.target);
    if (!input || shouldSkip(input, readOnly)) return;
    input.setAttribute(WAS_CHECKED, input.checked ? '1' : '0');
  }

  function onClick(e) {
    const input = resolveInput(e.target);
    if (!input || shouldSkip(input, readOnly)) return;

    if (input.getAttribute(WAS_CHECKED) === '1') {
      e.preventDefault();
      e.stopImmediatePropagation();
      input.checked = false;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    input.removeAttribute(WAS_CHECKED);
  }

  root.addEventListener('mousedown', onMouseDown, { signal, capture: true });
  root.addEventListener('click', onClick, { signal, capture: true });
}
