/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APP_SLUG } from '../config.js';

let mod;

describe('exam-timer', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mod = await import('../lib/exam-timer.js');
  });

  it('defaults to 0 seconds', () => {
    expect(mod.getExamTimerSeconds()).toBe(0);
  });

  it('persists a valid value', () => {
    mod.setExamTimerSeconds(1800);
    expect(mod.getExamTimerSeconds()).toBe(1800);
  });

  it('clamps to 0-7200 range', () => {
    mod.setExamTimerSeconds(-100);
    expect(mod.getExamTimerSeconds()).toBe(0);

    mod.setExamTimerSeconds(99999);
    expect(mod.getExamTimerSeconds()).toBe(7200);
  });

  it('removes storage key when set to 0', () => {
    mod.setExamTimerSeconds(900);
    mod.setExamTimerSeconds(0);
    expect(localStorage.getItem(`${APP_SLUG}:examTimerSeconds`)).toBeNull();
  });

  it('dispatches custom event on change', () => {
    const handler = vi.fn();
    window.addEventListener(`${APP_SLUG}-exam-timer-changed`, handler);
    mod.setExamTimerSeconds(1800);
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(`${APP_SLUG}-exam-timer-changed`, handler);
  });

  it('handles corrupted localStorage', () => {
    localStorage.setItem(`${APP_SLUG}:examTimerSeconds`, 'not-a-number');
    expect(mod.getExamTimerSeconds()).toBe(0);
  });
});

describe('timerPresetOptionsHtml', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mod = await import('../lib/exam-timer.js');
  });

  it('marks correct option as selected', () => {
    const html = mod.timerPresetOptionsHtml(1800);
    expect(html).toContain('value="1800" selected');
    expect(html).not.toContain('value="0" selected');
  });

  it('includes all presets', () => {
    const html = mod.timerPresetOptionsHtml(0);
    expect(html).toContain('Isključeno');
    expect(html).toContain('15 min');
    expect(html).toContain('30 min');
    expect(html).toContain('45 min');
    expect(html).toContain('60 min');
  });
});
