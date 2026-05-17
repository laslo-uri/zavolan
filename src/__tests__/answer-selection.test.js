/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { attachAnswerDeselectHandlers } from '../lib/answer-selection.js';

function mountAnswers(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

function mouseDown(el) {
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

describe('attachAnswerDeselectHandlers', () => {
  /** @type {AbortController} */
  let abort;

  beforeEach(() => {
    document.body.innerHTML = '';
    abort = new AbortController();
  });

  afterEach(() => {
    abort.abort();
    document.body.innerHTML = '';
  });

  it('unchecks a radio when clicking it again', () => {
    const root = mountAnswers(`
      <label class="answer answer-selectable">
        <input type="radio" name="q1" value="0">
        <span class="answer-text">A</span>
      </label>
    `);
    const input = root.querySelector('input');
    attachAnswerDeselectHandlers(root, { signal: abort.signal });

    const label = root.querySelector('label');
    input.checked = true;
    mouseDown(label);
    click(label);

    expect(input.checked).toBe(false);
  });

  it('unchecks a checkbox when clicking it again', () => {
    const root = mountAnswers(`
      <label class="answer answer-selectable">
        <input type="checkbox" name="q1" value="0">
        <span class="answer-text">A</span>
      </label>
    `);
    const input = root.querySelector('input');
    attachAnswerDeselectHandlers(root, { signal: abort.signal });

    const label = root.querySelector('label');
    input.checked = true;
    mouseDown(label);
    click(label);

    expect(input.checked).toBe(false);
  });

  it('clears the second radio in a group when clicked again', () => {
    const root = mountAnswers(`
      <label class="answer answer-selectable">
        <input type="radio" name="q1" value="0">
        <span class="answer-text">A</span>
      </label>
      <label class="answer answer-selectable">
        <input type="radio" name="q1" value="1">
        <span class="answer-text">B</span>
      </label>
    `);
    const [r0, r1] = root.querySelectorAll('input');
    attachAnswerDeselectHandlers(root, { signal: abort.signal });

    const labels = root.querySelectorAll('label');
    r0.checked = false;
    r1.checked = true;
    mouseDown(labels[1]);
    click(labels[1]);

    expect(r1.checked).toBe(false);
    expect(r0.checked).toBe(false);
  });

  it('does not uncheck when readOnly is true', () => {
    const root = mountAnswers(`
      <label class="answer answer-selectable">
        <input type="radio" name="q1" value="0">
        <span class="answer-text">A</span>
      </label>
    `);
    const input = root.querySelector('input');
    attachAnswerDeselectHandlers(root, { readOnly: true, signal: abort.signal });

    const label = root.querySelector('label');
    input.checked = true;
    mouseDown(label);
    click(label);

    expect(input.checked).toBe(true);
  });

  it('dispatches change when deselecting', () => {
    const root = mountAnswers(`
      <label class="answer answer-selectable">
        <input type="checkbox" name="q1" value="0">
        <span class="answer-text">A</span>
      </label>
    `);
    const input = root.querySelector('input');
    attachAnswerDeselectHandlers(root, { signal: abort.signal });

    const onChange = vi.fn();
    input.addEventListener('change', onChange);

    const label = root.querySelector('label');
    input.checked = true;
    mouseDown(label);
    click(label);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
