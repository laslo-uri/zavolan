#!/usr/bin/env node
/**
 * Generates database/counts.json from all podoblast*.json files.
 * Run: npm run generate-counts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..');
const DATABASE_DIR = path.join(ROOT, 'public', 'database');
const COUNTS_PATH = path.join(DATABASE_DIR, 'counts.json');

function generateCounts() {
  const counts = {};
  const files = fs
    .readdirSync(DATABASE_DIR)
    .filter((f) => f.startsWith('podoblast') && f.endsWith('.json') && f !== 'counts.json');

  for (const file of files) {
    const match = file.match(/^podoblast(.+)\.json$/);
    if (!match) continue;
    const subtopicId = match[1];
    const filePath = path.join(DATABASE_DIR, file);
    try {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const count = json.meta?.questionCount ?? (json.questions?.length ?? 0);
      counts[subtopicId] = count;
    } catch (err) {
      console.warn(`Warning: could not read ${file}`, err.message);
      counts[subtopicId] = 0;
    }
  }

  fs.writeFileSync(COUNTS_PATH, JSON.stringify(counts, null, 2), 'utf8');
  console.log(`Wrote ${COUNTS_PATH} with ${Object.keys(counts).length} subtopic counts`);
}

generateCounts();
