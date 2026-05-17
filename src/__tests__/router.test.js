import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatSubtopicPathSegment } from '../lib/router.js';

vi.stubGlobal('location', {
  pathname: '/',
  protocol: 'https:',
  search: '',
  hash: '',
  origin: 'https://example.com',
});

vi.mock('../config.js', () => ({
  BASE: '/',
  SIMULATION_TOPIC_ID: 'simulacija',
  SIMULATION_PLAY_SEGMENT: 'play',
  BOOKMARKS_TOPIC_ID: 'bookmarked',
  HISTORY_TOPIC_ID: 'istorija',
}));

describe('formatSubtopicPathSegment', () => {
  it('strips topic prefix from subtopic id', () => {
    expect(formatSubtopicPathSegment('3', '3-2')).toBe('2');
  });

  it('returns original if no prefix match', () => {
    expect(formatSubtopicPathSegment('3', '4-2')).toBe('4-2');
  });

  it('returns subtopicFullId when topicId is empty', () => {
    expect(formatSubtopicPathSegment('', '3-2')).toBe('3-2');
  });

  it('returns empty string when both are empty', () => {
    expect(formatSubtopicPathSegment('', '')).toBe('');
  });

  it('handles numeric-only subtopic segment', () => {
    expect(formatSubtopicPathSegment('10', '10-3')).toBe('3');
  });
});

describe('parseRoute', () => {
  beforeEach(() => {
    vi.stubGlobal('location', {
      pathname: '/',
      protocol: 'https:',
      search: '',
      hash: '',
      origin: 'https://example.com',
    });
  });

  it('returns null topicId for root path', async () => {
    const { parseRoute } = await import('../lib/router.js');
    location.pathname = '/';
    const route = parseRoute();
    expect(route.topicId).toBeNull();
    expect(route.subtopicId).toBeNull();
    expect(route.questionIndex).toBeNull();
  });

  it('parses topic-only path', async () => {
    const { parseRoute } = await import('../lib/router.js');
    location.pathname = '/3';
    const route = parseRoute();
    expect(route.topicId).toBe('3');
    expect(route.subtopicId).toBeNull();
  });

  it('parses topic + subtopic path', async () => {
    const { parseRoute } = await import('../lib/router.js');
    location.pathname = '/3/2';
    const route = parseRoute();
    expect(route.topicId).toBe('3');
    expect(route.subtopicId).toBe('3-2');
  });

  it('parses bookmarked route with question index', async () => {
    const { parseRoute } = await import('../lib/router.js');
    location.pathname = '/bookmarked/5';
    const route = parseRoute();
    expect(route.topicId).toBe('bookmarked');
    expect(route.subtopicId).toBeNull();
    expect(route.questionIndex).toBe(5);
  });

  it('parses full path with question index', async () => {
    const { parseRoute } = await import('../lib/router.js');
    location.pathname = '/3/2/7';
    const route = parseRoute();
    expect(route.topicId).toBe('3');
    expect(route.subtopicId).toBe('3-2');
    expect(route.questionIndex).toBe(7);
  });
});
