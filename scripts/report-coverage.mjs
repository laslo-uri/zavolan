#!/usr/bin/env node
/**
 * Summarize question bank coverage from public/database/counts.json vs public/data.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.join(__dirname, '..');
const countsPath = path.join(root, 'public', 'database', 'counts.json');
const dataPath = path.join(root, 'public', 'data.json');

function main() {
  if (!fs.existsSync(countsPath)) {
    console.error('Missing', countsPath);
    process.exit(1);
  }
  if (!fs.existsSync(dataPath)) {
    console.error('Missing', dataPath);
    process.exit(1);
  }

  const counts = JSON.parse(fs.readFileSync(countsPath, 'utf8'));
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const topics = data.topics || [];

  const declared = [];
  for (const t of topics) {
    for (const s of t.subtopics || []) {
      declared.push({
        topicId: t.id,
        topicName: t.name,
        subtopicId: s.id,
        subtopicName: s.name,
        count: counts[s.id] ?? 0,
      });
    }
  }

  const withQuestions = declared.filter((d) => d.count > 0);
  const empty = declared.filter((d) => d.count === 0);
  const totalQuestions = withQuestions.reduce((sum, d) => sum + d.count, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      subtopicsInHierarchy: declared.length,
      subtopicsWithQuestions: withQuestions.length,
      subtopicsEmpty: empty.length,
      totalQuestionSlots: totalQuestions,
    },
    emptySubtopicIds: empty.map((d) => d.subtopicId).sort(),
    populatedSubtopics: withQuestions
      .map((d) => ({ id: d.subtopicId, count: d.count, topicId: d.topicId }))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
