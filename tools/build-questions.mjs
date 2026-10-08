// content/<region>/questions.csv → public/regions/<region>/questions.json
// 사용: node tools/build-questions.mjs [region]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const region = process.argv[2] ?? 'hongseong';
const src = `content/${region}/questions.csv`;
const dest = `public/regions/${region}/questions.json`;

const CATEGORIES = ['history', 'people', 'safety', 'specialty', 'nature', 'society', 'environment'];
const LEVELS = ['low', 'high', 'both'];
const TYPES = ['ox', 'choice', 'photo'];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}

const text = readFileSync(src, 'utf8').replace(/^﻿/, '');
const [header, ...records] = parseCsv(text);
const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
const errors = [];
const ids = new Set();

const questions = records.map((r, n) => {
  const get = (k) => (r[col[k]] ?? '').trim();
  const line = n + 2;
  const id = get('id');
  const type = get('type');
  const q = {
    id,
    category: get('category'),
    level: get('level'),
    type,
    question: get('question'),
    choices: [],
    answer: 0,
    explanation: get('explanation'),
    verified: ['true', 'o', 'y', 'yes', '1'].includes(get('verified').toLowerCase()),
  };
  if (!id) errors.push(`${line}행: id 없음`);
  if (ids.has(id)) errors.push(`${line}행: id 중복 ${id}`);
  ids.add(id);
  if (!CATEGORIES.includes(q.category)) errors.push(`${line}행(${id}): category "${q.category}"`);
  if (!LEVELS.includes(q.level)) errors.push(`${line}행(${id}): level "${q.level}"`);
  if (!TYPES.includes(type)) errors.push(`${line}행(${id}): type "${type}"`);
  if (!q.question) errors.push(`${line}행(${id}): 문제 없음`);
  if (!q.explanation) errors.push(`${line}행(${id}): 해설 없음`);

  const answer = get('answer').toUpperCase();
  if (type === 'ox') {
    q.choices = ['O', 'X'];
    if (answer !== 'O' && answer !== 'X') errors.push(`${line}행(${id}): O/X 정답은 O 또는 X`);
    q.answer = answer === 'X' ? 1 : 0;
  } else {
    q.choices = ['choice1', 'choice2', 'choice3', 'choice4'].map(get).filter(Boolean);
    const a = Number(answer);
    if (q.choices.length < 2) errors.push(`${line}행(${id}): 보기가 2개 이상 필요`);
    if (!Number.isInteger(a) || a < 1 || a > q.choices.length) errors.push(`${line}행(${id}): 정답 번호 "${answer}"`);
    q.answer = a - 1;
  }
  const image = get('image');
  if (image) q.image = image;
  if (type === 'photo' && !image) errors.push(`${line}행(${id}): 사진 문항에 image 없음`);
  const source = get('source');
  if (source) q.source = source;
  return q;
});

if (errors.length) {
  console.error(`문항 오류 ${errors.length}건:\n` + errors.join('\n'));
  process.exit(1);
}
mkdirSync(`public/regions/${region}`, { recursive: true });
writeFileSync(dest, JSON.stringify(questions, null, 1) + '\n');
const verified = questions.filter((q) => q.verified).length;
console.log(`${dest}: ${questions.length}문항 (검수 완료 ${verified})`);
