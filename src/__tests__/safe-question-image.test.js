import { describe, expect, it } from 'vitest';
import { safeQuestionImagePath } from '../config.js';

describe('safeQuestionImagePath', () => {
  it('accepts typical relative paths', () => {
    expect(safeQuestionImagePath('slike/foo.jpeg')).toBe('slike/foo.jpeg');
    expect(safeQuestionImagePath('  podoblast/slika.jpg  ')).toBe('podoblast/slika.jpg');
  });

  it('rejects traversal, absolute, and URLs', () => {
    expect(safeQuestionImagePath('../evil')).toBe(null);
    expect(safeQuestionImagePath('/abs')).toBe(null);
    expect(safeQuestionImagePath('https://x/evil')).toBe(null);
    expect(safeQuestionImagePath('javascript:alert(1)')).toBe(null);
  });

  it('rejects quote-like injection', () => {
    expect(safeQuestionImagePath('x" onerror')).toBe(null);
    expect(safeQuestionImagePath("x'><script")).toBe(null);
  });
});
