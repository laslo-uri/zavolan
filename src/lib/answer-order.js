function hashString32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleDeterministic(items, seed) {
  const a = items.slice();
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function displayAnswersForQuestion(q) {
  const raw = q.answers || [];
  if (raw.length <= 1) return raw.slice();
  const key = q._compositeKey ?? q._fieldKey;
  const seed = hashString32(key != null ? String(key) : `q:${String(q.id)}`);
  return shuffleDeterministic(raw, seed);
}

export function getDisplayAnswerOrder(q) {
  const ordered = displayAnswersForQuestion(q);
  const correctIndices = ordered.map((o, idx) => (o.correct ? idx : -1)).filter((x) => x >= 0);
  return { ordered, correctIndices };
}
