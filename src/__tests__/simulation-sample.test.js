import { describe, expect, it } from 'vitest';
import {
  buildSubtopicSegments,
  globalIndexToLocal,
  groupIndicesBySubtopic,
  mergeGlobalIntoGrouped,
  pickDistinctGlobalIndices,
  pickDistinctGlobalIndicesExcluding,
} from '../lib/simulation-sample.js';

describe('buildSubtopicSegments', () => {
  it('skips zero counts and sums pool', () => {
    const subs = [{ id: 'a' }, { id: 'b' }];
    const counts = { a: 3, b: 0, c: 2 };
    const { segments, poolSize } = buildSubtopicSegments(subs, counts);
    expect(poolSize).toBe(3);
    expect(segments).toHaveLength(1);
    expect(segments[0].subtopic.id).toBe('a');
    expect(segments[0].start).toBe(0);
    expect(segments[0].count).toBe(3);
  });

  it('chains multiple subtopics', () => {
    const subs = [{ id: 'x' }, { id: 'y' }];
    const counts = { x: 2, y: 5 };
    const { segments, poolSize } = buildSubtopicSegments(subs, counts);
    expect(poolSize).toBe(7);
    expect(segments[0]).toMatchObject({ start: 0, count: 2 });
    expect(segments[1]).toMatchObject({ start: 2, count: 5 });
  });
});

describe('globalIndexToLocal', () => {
  const subs = [{ id: 'a' }, { id: 'b' }];
  const { segments } = buildSubtopicSegments(subs, { a: 2, b: 3 });

  it('maps first and last of each segment', () => {
    expect(globalIndexToLocal(segments, 0)).toEqual({
      subtopic: subs[0],
      localIndex: 0,
    });
    expect(globalIndexToLocal(segments, 1)).toEqual({
      subtopic: subs[0],
      localIndex: 1,
    });
    expect(globalIndexToLocal(segments, 2)).toEqual({
      subtopic: subs[1],
      localIndex: 0,
    });
    expect(globalIndexToLocal(segments, 4)).toEqual({
      subtopic: subs[1],
      localIndex: 2,
    });
  });

  it('throws when out of range', () => {
    expect(() => globalIndexToLocal(segments, 5)).toThrow(/out of range/);
  });
});

describe('pickDistinctGlobalIndices', () => {
  it('returns k unique indices in range', () => {
    let x = 0;
    const rng = () => {
      x += 0.413;
      return x % 1;
    };
    const out = pickDistinctGlobalIndices(80, 15, rng);
    expect(out).toHaveLength(15);
    expect(new Set(out).size).toBe(15);
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(80);
    }
  });
});

describe('groupIndicesBySubtopic', () => {
  it('merges two globals from same subtopic', () => {
    const subs = [{ id: 'a' }];
    const { segments } = buildSubtopicSegments(subs, { a: 10 });
    const map = groupIndicesBySubtopic(segments, [1, 3, 1]);
    expect(map.size).toBe(1);
    expect([...map.get('a').indices].sort((x, y) => x - y)).toEqual([1, 3]);
  });
});

describe('pickDistinctGlobalIndicesExcluding', () => {
  it('never returns values in exclude', () => {
    const exclude = new Set([0, 1, 2, 3, 4]);
    let x = 0;
    const rng = () => {
      x += 0.31;
      return x % 1;
    };
    const out = pickDistinctGlobalIndicesExcluding(20, 5, exclude, rng);
    expect(out.length).toBe(5);
    for (const v of out) expect(exclude.has(v)).toBe(false);
  });

  it('returns empty when pool is exhausted', () => {
    const exclude = new Set([0, 1, 2]);
    const out = pickDistinctGlobalIndicesExcluding(3, 5, exclude);
    expect(out).toHaveLength(0);
  });
});

describe('mergeGlobalIntoGrouped', () => {
  it('accumulates indices for the same subtopic', () => {
    const subs = [{ id: 'a' }];
    const { segments } = buildSubtopicSegments(subs, { a: 5 });
    const grouped = new Map();
    mergeGlobalIntoGrouped(segments, grouped, 1);
    mergeGlobalIntoGrouped(segments, grouped, 3);
    expect(grouped.size).toBe(1);
    expect([...grouped.get('a').indices].sort((p, q) => p - q)).toEqual([1, 3]);
  });
});
