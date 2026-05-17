/**
 * Build contiguous global index ranges for simulation sampling (one range per subtopic).
 * @param {Array<{ id: string }>} subs
 * @param {Record<string, number>} counts
 */
export function buildSubtopicSegments(subs, counts) {
  const segments = [];
  let start = 0;
  for (const s of subs) {
    const c = counts[s.id] ?? 0;
    if (c <= 0) continue;
    segments.push({ subtopic: s, start, count: c });
    start += c;
  }
  return { segments, poolSize: start };
}

/**
 * Map a global index in [0, poolSize) to (subtopic, index within that JSON).
 * @param {Array<{ subtopic: unknown, start: number, count: number }>} segments
 * @param {number} g
 */
export function globalIndexToLocal(segments, g) {
  if (!segments.length) throw new Error('empty segments');
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const seg = segments[mid];
    if (g < seg.start + seg.count) hi = mid;
    else lo = mid + 1;
  }
  const seg = segments[lo];
  const localIndex = g - seg.start;
  if (localIndex < 0 || localIndex >= seg.count) {
    throw new Error('global index out of range');
  }
  return { subtopic: seg.subtopic, localIndex };
}

/**
 * @param {number} poolSize
 * @param {number} n
 * @param {() => number} rng returns uniform [0, 1)
 */
export function pickDistinctGlobalIndices(poolSize, n, rng = Math.random) {
  if (poolSize <= 0 || n <= 0) return [];
  const k = Math.min(n, poolSize);
  const chosen = new Set();
  while (chosen.size < k) {
    chosen.add(Math.floor(rng() * poolSize));
  }
  return [...chosen];
}

/**
 * Like pickDistinctGlobalIndices but never picks indices present in `exclude`.
 * @param {Set<number> | ReadonlySet<number>} exclude
 */
export function pickDistinctGlobalIndicesExcluding(poolSize, k, exclude, rng = Math.random) {
  if (poolSize <= 0 || k <= 0) return [];
  const cap = Math.min(k, poolSize - exclude.size);
  if (cap <= 0) return [];
  const chosen = new Set();
  let guard = 0;
  const maxGuard = cap * 120 + 2500;
  while (chosen.size < cap && guard++ < maxGuard) {
    const g = Math.floor(rng() * poolSize);
    if (exclude.has(g) || chosen.has(g)) continue;
    chosen.add(g);
  }
  return [...chosen];
}

/** Add one global index's (subtopic, localIndex) into grouped (mutates `grouped`). */
export function mergeGlobalIntoGrouped(segments, grouped, g) {
  const { subtopic, localIndex } = globalIndexToLocal(segments, g);
  const id = subtopic.id;
  let row = grouped.get(id);
  if (!row) {
    row = { subtopic, indices: new Set() };
    grouped.set(id, row);
  }
  row.indices.add(localIndex);
}

/**
 * @param {Array<{ subtopic: { id: string }, start: number, count: number }>} segments
 * @param {number[]} globalIndices
 * @returns {Map<string, { subtopic: unknown, indices: Set<number> }>}
 */
export function groupIndicesBySubtopic(segments, globalIndices) {
  const map = new Map();
  for (const g of globalIndices) {
    const { subtopic, localIndex } = globalIndexToLocal(segments, g);
    const id = subtopic.id;
    let row = map.get(id);
    if (!row) {
      row = { subtopic, indices: new Set() };
      map.set(id, row);
    }
    row.indices.add(localIndex);
  }
  return map;
}
