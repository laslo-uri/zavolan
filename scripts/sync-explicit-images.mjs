#!/usr/bin/env node
/**
 * Kopira eksplicitno sačuvane slike (N.jpeg, N.jpg, N.png u root-u foldera podoblast-X-Y)
 * u public/database/slike/ i ažurira polje image u odgovarajućem podoblastX-Y.json.
 *
 * Upotreba: node scripts/sync-explicit-images.mjs
 * Opciono: node scripts/sync-explicit-images.mjs podoblast-5-3
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..');
const DATABASE_DIR = path.join(ROOT, 'public', 'database');
const SLIKE_DIR = path.join(DATABASE_DIR, 'slike');

const ROOT_IMAGE_RE = /^(\d+)\.(jpeg|jpg|png)$/i;

function syncPodoblastFolder(folderName) {
  const folderPath = path.join(ROOT, folderName);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    console.error(`Folder nije pronađen: ${folderPath}`);
    return 0;
  }

  const match = folderName.match(/podoblast-?(\d+)-(\d+)/i);
  if (!match) {
    console.error(`Naziv mora biti podoblast-X-Y: ${folderName}`);
    return 0;
  }

  const podoblastId = `${match[1]}-${match[2]}`;
  const jsonPath = path.join(DATABASE_DIR, `podoblast${podoblastId}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`[${folderName}] Nema baze podoblast${podoblastId}.json – preskačem.`);
    return 0;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const questions = data.questions || [];
  const byId = new Map(questions.map((q) => [q.id, q]));

  if (!fs.existsSync(SLIKE_DIR)) fs.mkdirSync(SLIKE_DIR, { recursive: true });

  let count = 0;
  let jsonDirty = false;
  const files = fs.readdirSync(folderPath);

  for (const f of files) {
    const m = f.match(ROOT_IMAGE_RE);
    if (!m) continue;

    const qNum = parseInt(m[1], 10);
    const ext = m[2].toLowerCase() === 'jpeg' ? 'jpeg' : m[2].toLowerCase();
    const src = path.join(folderPath, f);
    if (!fs.statSync(src).isFile()) continue;

    const destName = `podoblast${podoblastId}-${qNum}.${ext}`;
    const destPath = path.join(SLIKE_DIR, destName);
    fs.copyFileSync(src, destPath);

    const rel = `slike/${destName}`;
    const q = byId.get(qNum);
    if (!q) {
      console.warn(`[${folderName}] Pitanje ${qNum} nije u JSON-u – slika kopirana u ${destName}`);
    } else {
      q.image = rel;
      jsonDirty = true;
      count += 1;
      console.log(`[${folderName}] ${f} → database/slike/${destName} (pitanje ${qNum})`);
    }
  }

  if (jsonDirty) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[${folderName}] Ažuriran ${path.basename(jsonPath)}`);
  }

  return count;
}

const arg = process.argv[2];
if (arg) {
  syncPodoblastFolder(arg);
} else {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  let total = 0;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!/^podoblast-?\d+-\d+$/i.test(e.name)) continue;
    total += syncPodoblastFolder(e.name);
  }
  console.log(`Gotovo. Ažurirano slika u JSON-u: ${total}`);
}
