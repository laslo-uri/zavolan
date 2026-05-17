import { PATHS } from '../config.js';

const devWarn = (...args) => {
  if (import.meta.env.DEV) console.warn(...args);
};

export async function loadData() {
  const res = await fetch(PATHS.data);
  if (!res.ok) throw new Error(`Ne mogu da učitam podatke (${res.status})`);
  const data = await res.json();
  if (!data?.topics) throw new Error('Neispravan format podataka');
  return data;
}

export async function fetchCounts() {
  try {
    const res = await fetch(PATHS.counts);
    if (res.ok) return res.json();
    devWarn('[fetchCounts]', res.status, res.statusText);
  } catch (err) {
    devWarn('[fetchCounts]', err?.message ?? err);
  }
  return {};
}

export async function fetchQuestions(subtopicId) {
  try {
    const res = await fetch(PATHS.database(subtopicId));
    if (res.ok) {
      const json = await res.json();
      return json.questions ?? [];
    }
    devWarn('[fetchQuestions]', subtopicId, res.status, res.statusText);
  } catch (err) {
    devWarn('[fetchQuestions]', subtopicId, err?.message ?? err);
  }
  return [];
}

export function listSubtopicsWithQuestions(data, counts) {
  const out = [];
  for (const t of data.topics || []) {
    for (const s of t.subtopics || []) {
      if ((counts[s.id] ?? 0) > 0) {
        out.push({
          id: s.id,
          name: s.name,
          description: s.description,
          topicId: t.id,
          topicName: t.name,
        });
      }
    }
  }
  return out;
}
