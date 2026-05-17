#!/usr/bin/env node
// Serbian → English keys in public/database/*.json (only if old files remain).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_DIR = path.join(__dirname, '..', 'public', 'database');

function migrateQuestion(q) {
  const answers = (q.odgovori || q.answers || []).map((a) => ({
    text: a.tekst ?? a.text,
    correct: a.tacan ?? a.correct,
  }));
  return {
    id: q.id,
    text: q.tekst ?? q.text,
    correctAnswerCount: q.broj_tacnih_odgovora ?? q.correctAnswerCount ?? 1,
    answers,
    correctAnswers:
      q.tacno_resenje ?? q.correctAnswers ?? answers.filter((a) => a.correct).map((a) => a.text),
    explanation: q.objasnjenje ?? q.explanation ?? null,
    image: q.slika ?? q.image ?? null,
  };
}

function migrateFile(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const meta = content.meta || {};
  const questions = (content.pitanja || content.questions || []).map(migrateQuestion);
  const migrated = {
    meta: {
      areaId: meta.oblast_id ?? meta.areaId,
      areaName: meta.oblast_naziv ?? meta.areaName,
      subareaId: meta.podoblast_id ?? meta.subareaId,
      subareaName: meta.podoblast_naziv ?? meta.subareaName,
      questionCount: meta.broj_pitanja ?? meta.questionCount ?? questions.length,
      source: meta.izvor ?? meta.source,
      extracted: meta.izvuceno ?? meta.extracted,
    },
    questions,
  };
  fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2), 'utf8');
  console.log(`Migrated ${filePath}`);
}

const files = fs
  .readdirSync(DB_DIR)
  .filter((f) => f.endsWith('.json') && f.startsWith('podoblast'));
files.forEach((f) => migrateFile(path.join(DB_DIR, f)));
