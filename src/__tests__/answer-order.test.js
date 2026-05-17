import { describe, it, expect } from 'vitest';
import { displayAnswersForQuestion, getDisplayAnswerOrder } from '../lib/answer-order.js';

describe('displayAnswersForQuestion', () => {
  it('returns empty array for question with no answers', () => {
    const q = { id: 1, answers: [], _compositeKey: '1-1:1' };
    expect(displayAnswersForQuestion(q)).toEqual([]);
  });

  it('returns single answer unchanged', () => {
    const ans = [{ text: 'Da', correct: true }];
    const q = { id: 1, answers: ans, _compositeKey: '1-1:1' };
    expect(displayAnswersForQuestion(q)).toEqual(ans);
  });

  it('returns a deterministic shuffle for the same key', () => {
    const answers = [
      { text: 'A', correct: true },
      { text: 'B', correct: false },
      { text: 'C', correct: false },
      { text: 'D', correct: false },
    ];
    const q = { id: 42, answers, _compositeKey: '3-2:42' };
    const first = displayAnswersForQuestion(q);
    const second = displayAnswersForQuestion(q);
    expect(first).toEqual(second);
  });

  it('does not mutate the original answers array', () => {
    const answers = [
      { text: 'A', correct: true },
      { text: 'B', correct: false },
    ];
    const original = [...answers];
    const q = { id: 1, answers, _compositeKey: '1-1:1' };
    displayAnswersForQuestion(q);
    expect(answers).toEqual(original);
  });

  it('preserves all answer objects', () => {
    const answers = [
      { text: 'A', correct: true },
      { text: 'B', correct: false },
      { text: 'C', correct: false },
    ];
    const q = { id: 1, answers, _compositeKey: '1-1:1' };
    const result = displayAnswersForQuestion(q);
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ text: 'A', correct: true });
    expect(result).toContainEqual({ text: 'B', correct: false });
    expect(result).toContainEqual({ text: 'C', correct: false });
  });

  it('uses _fieldKey when _compositeKey is absent', () => {
    const answers = [
      { text: 'X', correct: true },
      { text: 'Y', correct: false },
    ];
    const q = { id: 5, answers, _fieldKey: '2-1__zv__5' };
    const result = displayAnswersForQuestion(q);
    expect(result).toHaveLength(2);
  });
});

describe('getDisplayAnswerOrder', () => {
  it('returns correctIndices matching correct answers in shuffled order', () => {
    const answers = [
      { text: 'Wrong', correct: false },
      { text: 'Right', correct: true },
      { text: 'Also wrong', correct: false },
    ];
    const q = { id: 10, answers, _compositeKey: '1-1:10' };
    const { ordered, correctIndices } = getDisplayAnswerOrder(q);
    expect(ordered).toHaveLength(3);
    expect(correctIndices).toHaveLength(1);
    const correctAnswer = ordered[correctIndices[0]];
    expect(correctAnswer.correct).toBe(true);
    expect(correctAnswer.text).toBe('Right');
  });

  it('handles multiple correct answers', () => {
    const answers = [
      { text: 'A', correct: true },
      { text: 'B', correct: true },
      { text: 'C', correct: false },
    ];
    const q = { id: 7, answers, _compositeKey: '2-3:7' };
    const { ordered, correctIndices } = getDisplayAnswerOrder(q);
    expect(correctIndices).toHaveLength(2);
    correctIndices.forEach((idx) => {
      expect(ordered[idx].correct).toBe(true);
    });
  });
});
