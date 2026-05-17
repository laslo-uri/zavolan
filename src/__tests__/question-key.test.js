import { describe, it, expect } from 'vitest';
import {
  formFieldKey,
  compositeQuestionKey,
  parseCompositeQuestionKey,
  enrichQuestion,
} from '../lib/question-key.js';

describe('formFieldKey', () => {
  it('joins subtopicId and questionId with __zv__', () => {
    expect(formFieldKey('3-2', 42)).toBe('3-2__zv__42');
  });
});

describe('compositeQuestionKey', () => {
  it('joins subtopicId and questionId with colon', () => {
    expect(compositeQuestionKey('1-1', 5)).toBe('1-1:5');
  });
});

describe('parseCompositeQuestionKey', () => {
  it('parses a valid key', () => {
    expect(parseCompositeQuestionKey('3-2:42')).toEqual({
      subtopicId: '3-2',
      questionId: 42,
    });
  });

  it('handles subtopic IDs with multiple dashes', () => {
    expect(parseCompositeQuestionKey('10-1:99')).toEqual({
      subtopicId: '10-1',
      questionId: 99,
    });
  });

  it('returns null for key without colon', () => {
    expect(parseCompositeQuestionKey('nocolon')).toBeNull();
  });

  it('returns null for key with colon at start', () => {
    expect(parseCompositeQuestionKey(':5')).toBeNull();
  });

  it('returns null for non-numeric question id', () => {
    expect(parseCompositeQuestionKey('1-1:abc')).toBeNull();
  });
});

describe('enrichQuestion', () => {
  it('adds metadata fields without mutating original', () => {
    const q = { id: 7, text: 'Some question', answers: [] };
    const enriched = enrichQuestion(q, '2-1', '2', 'Topic Two');
    expect(enriched._subtopicId).toBe('2-1');
    expect(enriched._topicId).toBe('2');
    expect(enriched._topicName).toBe('Topic Two');
    expect(enriched._fieldKey).toBe('2-1__zv__7');
    expect(enriched._compositeKey).toBe('2-1:7');
    expect(enriched.text).toBe('Some question');
    expect(q).not.toHaveProperty('_subtopicId');
  });
});
