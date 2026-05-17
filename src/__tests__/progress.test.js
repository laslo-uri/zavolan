/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

let progress;

describe('progress', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    progress = await import('../lib/progress.js');
  });

  it('recordSubtopicAttempt stores history and by-subtopic summary', () => {
    progress.recordSubtopicAttempt({
      subtopicId: '1-1',
      topicId: '1',
      topicName: 'T1',
      subtopicName: 'S1',
      correct: 7,
      total: 10,
    });
    const hist = progress.getQuizHistory();
    expect(hist).toHaveLength(1);
    expect(hist[0].pct).toBe(70);
    expect(hist[0].correct).toBe(7);
    const last = progress.getSubtopicLastResult('1-1');
    expect(last?.lastPct).toBe(70);
  });

  it('getSubtopicLastResult returns null for unknown id', () => {
    expect(progress.getSubtopicLastResult('9-9')).toBeNull();
  });
});
