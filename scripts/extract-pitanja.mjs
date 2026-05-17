#!/usr/bin/env node
/**
 * Ekstrakcija pitanja iz skinutih HTML stranica euprava.gov.rs (autoskole/QuestionsPractice)
 *
 * Upotreba:
 *   node scripts/extract-pitanja.mjs podoblast1-1
 *   node scripts/extract-pitanja.mjs podoblast-1-3 [limit]
 *
 * Očekivana struktura: folder podoblastX-Y ili podoblast-X-Y sadrži 1.html, 2.html, ... N.html
 * Svaki N.html prikazuje pitanje N (vidljivo) – ostala su prazna (display:none)
 * Opciono: limit = broj pitanja (npr. 20)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..');
const DATABASE_DIR = path.join(ROOT, 'public', 'database');
const SLIKE_DIR = path.join(DATABASE_DIR, 'slike');

function normalizeText(s) {
  if (!s) return '';
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuestionFromHtml(html, questionIndex, opts = {}) {
  const { folderPath, podoblastId } = opts;
  // Nađi questionContainer koji NEMA display:none (vidljiv je)
  const containerRegex = new RegExp(
    `<div id="questionContainer_${questionIndex}"[^>]*style="[^"]*"(?:[^>]*)>(.*?)</div>\\s*<div id="questionContainer_`,
    's'
  );
  let containerMatch = html.match(containerRegex);

  if (!containerMatch) {
    // Probaj alternativni regex – poslednji container može imati drugi završetak
    const altRegex = new RegExp(
      `<div id="questionContainer_${questionIndex}"[^>]*style="(?!display:\\s*none)[^"]*"[^>]*>(.*?)</div>\\s*<div id="(?:questionContainer_|questionsListContainer)`,
      's'
    );
    containerMatch = html.match(altRegex);
  }

  if (!containerMatch) {
    const simpleRegex = new RegExp(
      `<div id="questionContainer_${questionIndex}" class="questionContainer" style=""><label id="qText_${questionIndex}">(.*?)</label>`,
      's'
    );
    const simpleMatch = html.match(simpleRegex);
    if (simpleMatch) {
      const tekst = normalizeText(simpleMatch[1]);
      if (!tekst) return null;
      // Pokušaj izvući choices iz celog HTML-a
      const choices = [];
      let m;
      const choicesBlock = html.substring(html.indexOf(`questionContainer_${questionIndex}`));
      const choiceRegex = new RegExp(
        `class="qOptCont (rightAnswer|wrongAnswer)".*?<label[^>]*>([^<]+)</label>`,
        'gs'
      );
      while ((m = choiceRegex.exec(choicesBlock)) !== null) {
        choices.push({
          tekst: normalizeText(m[2]),
          tacan: m[1] === 'rightAnswer',
        });
      }
      if (choices.length === 0) {
        const fallbackRegex = new RegExp(`class="qOptCont_Label">([^<]+)</label>`, 'gs');
        while ((m = fallbackRegex.exec(choicesBlock)) !== null) {
          choices.push({ tekst: normalizeText(m[1]), tacan: false });
        }
      }
      const tacnoResenje = choices.filter((c) => c.tacan).map((c) => c.tekst);
      const brojMatchSimple = choicesBlock.match(/Broj potrebnih odgovora:\s*(\d+)/);
      const brojTacnih = brojMatchSimple
        ? parseInt(brojMatchSimple[1], 10)
        : tacnoResenje.length || 1;

      return {
        tekst,
        broj_tacnih_odgovora: brojTacnih || 1,
        odgovori: choices,
        tacno_resenje: tacnoResenje,
        objasnjenje: null,
        slika: null,
      };
    }
    return null;
  }

  const block = containerMatch[1];

  const textMatch = block.match(
    new RegExp(`<label id="qText_${questionIndex}"[^>]*>([^<]*)</label>`, 's')
  );
  const tekst = normalizeText(textMatch ? textMatch[1] : '');

  if (!tekst) return null;

  const odgovori = [];
  const choiceRegex = new RegExp(
    `qOptCont_qChoice_${questionIndex}_\\d+"[^>]*class="qOptCont (rightAnswer|wrongAnswer)"[^>]*>.*?<label[^>]*>([^<]*)</label>`,
    'gs'
  );
  let cm;
  while ((cm = choiceRegex.exec(block)) !== null) {
    odgovori.push({
      tekst: normalizeText(cm[2]),
      tacan: cm[1] === 'rightAnswer',
    });
  }

  // Ako nema odgovora, probaj širi regex
  if (odgovori.length === 0) {
    const wideRegex = new RegExp(
      `class="qOptCont (rightAnswer|wrongAnswer)"[^>]*>.*?<label[^>]*>([^<]+)</label>`,
      'gs'
    );
    while ((cm = wideRegex.exec(block)) !== null) {
      odgovori.push({
        tekst: normalizeText(cm[2]),
        tacan: cm[1] === 'rightAnswer',
      });
    }
  }
  // Fallback: opcije bez rightAnswer/wrongAnswer (npr. pre „Prikaži odgovor“)
  if (odgovori.length === 0) {
    const labelRegex = /class="qOptCont_Label"[^>]*>([^<]+)<\/label>/g;
    while ((cm = labelRegex.exec(block)) !== null) {
      odgovori.push({ tekst: normalizeText(cm[1]), tacan: false });
    }
  }

  const tacnoResenje = odgovori.filter((o) => o.tacan).map((o) => o.tekst);
  const brojTacnihMatch = block.match(/Broj potrebnih odgovora:\s*(\d+)/);
  const brojTacnihFinal = brojTacnihMatch
    ? parseInt(brojTacnihMatch[1], 10)
    : tacnoResenje.length || 1;

  // Slika – prioritet: eksplicitno sačuvane slike u root (N.jpeg/jpg/png), zatim N_files/QuestionsPracticeImage
  let slika = null;
  if (folderPath && podoblastId && block.includes(`qImgCont_${questionIndex}`)) {
    const exts = ['jpeg', 'jpg', 'png'];
    let imgSrc = null;
    let destExt = 'jpg';
    for (const ext of exts) {
      const candidate = path.join(folderPath, `${questionIndex}.${ext}`);
      if (fs.existsSync(candidate)) {
        imgSrc = candidate;
        destExt = ext;
        break;
      }
    }
    if (!imgSrc) {
      const qImg = path.join(folderPath, `${questionIndex}_files`, 'QuestionsPracticeImage');
      if (fs.existsSync(qImg)) {
        imgSrc = qImg;
        destExt = 'jpg';
      }
    }
    if (imgSrc) {
      if (!fs.existsSync(SLIKE_DIR)) fs.mkdirSync(SLIKE_DIR, { recursive: true });
      const destName = `podoblast${podoblastId}-${questionIndex}.${destExt}`;
      const destPath = path.join(SLIKE_DIR, destName);
      fs.copyFileSync(imgSrc, destPath);
      slika = `slike/${destName}`;
    }
  }

  const explMatch = block.match(/explBody_[^>]*>([^<]*)</);
  let objasnjenje = explMatch ? normalizeText(explMatch[1]) : null;
  if (
    objasnjenje === 'Nedostaje tekst objašnјenјa' ||
    objasnjenje === 'Nedostaje tekst objašnjenja'
  ) {
    objasnjenje = null;
  }

  return {
    tekst,
    broj_tacnih_odgovora: brojTacnihFinal,
    odgovori,
    tacno_resenje: tacnoResenje,
    objasnjenje: objasnjenje || null,
    slika,
  };
}

function getMetaFromDataJson(subareaId) {
  const dataPath = path.join(ROOT, 'public', 'data.json');
  if (!fs.existsSync(dataPath)) return null;
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const [oId] = subareaId.split('-');
  for (const topic of data.topics || []) {
    if (topic.id === oId && topic.subtopics) {
      const subtopic = topic.subtopics.find((x) => x.id === subareaId);
      if (subtopic) {
        return {
          topicId: topic.id,
          topicName: topic.name,
          subtopicId: subtopic.id,
          subtopicName: subtopic.name,
        };
      }
    }
  }
  return null;
}

function toCompactText(text, maxLen = 50) {
  if (!text || text.length <= maxLen) return text || '';
  const cut = text.slice(0, maxLen + 1);
  const lastSpace = cut.lastIndexOf(' ');
  const end = lastSpace > maxLen * 0.6 ? lastSpace : maxLen;
  return text.slice(0, end).trim() + '…';
}

function toEnglishKeys(q) {
  const answers = (q.odgovori || []).map((o) => ({ text: o.tekst, correct: o.tacan }));
  return {
    text: q.tekst,
    textShort: toCompactText(q.tekst),
    correctAnswerCount: q.broj_tacnih_odgovora ?? 1,
    answers,
    correctAnswers: (q.odgovori || []).filter((o) => o.tacan).map((o) => o.tekst),
    explanation: q.objasnjenje ?? null,
    image: q.slika ?? null,
  };
}

function extractFromFolder(folderName, maxQuestions) {
  const folderPath = path.join(ROOT, folderName);
  if (!fs.existsSync(folderPath)) {
    console.error(`Folder nije pronađen: ${folderPath}`);
    process.exit(1);
  }

  const match = folderName.match(/podoblast-?(\d+)-(\d+)/i);
  if (!match) {
    console.error(
      'Naziv foldera mora biti podoblastX-Y ili podoblast-X-Y (npr. podoblast1-1, podoblast-1-3)'
    );
    process.exit(1);
  }
  const podoblastId = `${match[1]}-${match[2]}`;

  const meta = getMetaFromDataJson(podoblastId) || {
    topicId: match[1],
    topicName: `Topic ${match[1]}`,
    subtopicId: podoblastId,
    subtopicName: `Subtopic ${podoblastId}`,
  };

  const pitanja = [];
  let i = 1;
  const limit = maxQuestions ? parseInt(maxQuestions, 10) : null;
  while (true) {
    if (limit && i > limit) break;
    const htmlPath = path.join(folderPath, `${i}.html`);
    if (!fs.existsSync(htmlPath)) break;
    const html = fs.readFileSync(htmlPath, 'utf8');
    const q = extractQuestionFromHtml(html, i, { folderPath, podoblastId });
    if (q) {
      const qEn = toEnglishKeys(q);
      if ((qEn.correctAnswers?.length ?? 0) === 0) {
        console.warn(
          `[podoblast${podoblastId}] Pitanje ${i}: nema tačnog odgovora u HTML-u (rightAnswer/wrongAnswer). Možda stranica nije sačuvana nakon "Prikaži odgovor".`
        );
      }
      pitanja.push({ id: i, ...qEn });
    }
    i++;
  }

  if (pitanja.length === 0) {
    console.error('Nijedno pitanje nije izvučeno. Proveri strukturu HTML fajlova.');
    process.exit(1);
  }

  const questions = pitanja;

  const output = {
    meta: {
      ...meta,
      questionCount: questions.length,
      source: 'servisi.euprava.gov.rs/autoskole',
      extracted: new Date().toISOString().slice(0, 10),
    },
    questions,
  };

  if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true });
  const outPath = path.join(DATABASE_DIR, `podoblast${podoblastId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Izvuceno ${questions.length} pitanja → ${outPath}`);
  return outPath;
}

const folderName = process.argv[2] || 'podoblast1-1';
const maxQuestions = process.argv[3] || null;
extractFromFolder(folderName, maxQuestions);
