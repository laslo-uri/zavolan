import { APP_SLUG } from '../config.js';

const STORAGE_KEY = `${APP_SLUG}:examTimerSeconds`;

export function getExamTimerSeconds() {
  try {
    const n = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  } catch {
    return 0;
  }
}

export function setExamTimerSeconds(seconds) {
  const n = Math.max(0, Math.min(7200, Math.floor(Number(seconds) || 0)));
  if (n === 0) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, String(n));
  window.dispatchEvent(new CustomEvent(`${APP_SLUG}-exam-timer-changed`));
}

const PRESETS = [
  { value: 0, label: 'Isključeno' },
  { value: 900, label: '15 min' },
  { value: 1800, label: '30 min' },
  { value: 2700, label: '45 min' },
  { value: 3600, label: '60 min' },
];

export function timerPresetOptionsHtml(selectedSeconds) {
  return PRESETS.map(
    (p) =>
      `<option value="${p.value}"${p.value === selectedSeconds ? ' selected' : ''}>${p.label}</option>`
  ).join('');
}

export function startExamCountdown(mount, opts) {
  const { totalSeconds, onExpire } = opts;
  if (!mount || totalSeconds <= 0) return () => {};

  const deadline = Date.now() + totalSeconds * 1000;
  const bar = mount.querySelector('.exam-timer__fill');
  const label = mount.querySelector('.exam-timer__text');

  function render() {
    const leftSec = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const m = Math.floor(leftSec / 60);
    const s = leftSec % 60;
    if (label) {
      label.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    if (bar) {
      const pct = Math.max(0, Math.min(100, (leftSec / totalSeconds) * 100));
      bar.style.width = `${pct}%`;
    }
    return leftSec;
  }

  render();
  const id = window.setInterval(() => {
    const leftSec = render();
    if (leftSec <= 0) {
      window.clearInterval(id);
      onExpire();
    }
  }, 250);

  return () => window.clearInterval(id);
}
