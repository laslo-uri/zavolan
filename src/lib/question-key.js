export function formFieldKey(subtopicId, questionId) {
  return `${subtopicId}__zv__${questionId}`;
}

export function compositeQuestionKey(subtopicId, questionId) {
  return `${subtopicId}:${questionId}`;
}

export function parseCompositeQuestionKey(key) {
  const idx = key.lastIndexOf(':');
  if (idx <= 0) return null;
  const subtopicId = key.slice(0, idx);
  const qid = Number(key.slice(idx + 1));
  if (!subtopicId || !Number.isFinite(qid)) return null;
  return { subtopicId, questionId: qid };
}

export function enrichQuestion(q, subtopicId, topicId, topicName) {
  return {
    ...q,
    _subtopicId: subtopicId,
    _topicId: topicId,
    _topicName: topicName,
    _fieldKey: formFieldKey(subtopicId, q.id),
    _compositeKey: compositeQuestionKey(subtopicId, q.id),
  };
}
