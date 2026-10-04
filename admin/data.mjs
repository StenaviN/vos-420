import { readFile, readdir, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const revision = text => createHash('sha256').update(text).digest('hex');
const plain = text => text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
export async function catalog(root) {
  const notes = [];
  for (const name of (await readdir(root)).filter(n => /^\d{2}-/.test(n)).sort()) {
    const html = await readFile(path.join(root, name, 'index.html'), 'utf8');
    let section = ''; const headings = [];
    for (const match of html.matchAll(/<section\b[^>]*\bid="([^"]+)"[^>]*>|<h([23])\b([^>]*)>([\s\S]*?)<\/h\2>/g)) {
      if (match[1]) { section = match[1]; continue; }
      const id = match[3].match(/\bid="([^"]+)"/)?.[1] || (match[2] === '2' ? section : '');
      if (id) headings.push({ id, level: Number(match[2]), title: plain(match[4]) });
    }
    for (const match of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi)) {
      if (!headings.some(h => h.id === match[2])) headings.push({id:match[2],level:3,title:plain(match[3]).slice(0,110) || match[2]});
    }
    // Include nested anchors as well as section headings.
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) if (!headings.some(h=>h.id===match[1])) {
      const following = html.slice(match.index, match.index + 1800);
      const label = following.match(/<(?:h[2-6]|strong|dt)\b[^>]*>([\s\S]*?)<\/(?:h[2-6]|strong|dt)>/)?.[1];
      headings.push({id:match[1],level:3,title:label ? plain(label) : match[1]});
    }
    notes.push({ path: `${name}/index.html`, title: plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || name), headings });
  }
  return notes;
}
export async function loadTopics(root) {
  const topics = [];
  for (const directory of (await readdir(root)).filter(n => /^\d{2}-/.test(n)).sort()) {
    let text; try { text = await readFile(path.join(root, directory, 'questions.json'), 'utf8'); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    topics.push({ directory, revision: revision(text), data: JSON.parse(text) });
  }
  return topics;
}
export function validate(data, directory, notes) {
  if (!data || !Array.isArray(data.questions) || !data.questions.length) throw Error('Тема повинна містити хоча б одне питання.');
  const ids = new Set();
  for (const q of data.questions) {
    if (!q || !/^[a-z0-9-]+$/.test(q.id) || ids.has(q.id)) throw Error('ID питань мають бути унікальні й містити латиницю, цифри та дефіс.');
    ids.add(q.id);
    for (const field of ['topic', 'question', 'correct', 'explanation', 'reference']) if (typeof q[field] !== 'string' || !q[field].trim()) throw Error(`${q.id}: заповніть усі текстові поля.`);
    if (!Array.isArray(q.wrong) || q.wrong.length < 3 || q.wrong.some(a => typeof a !== 'string' || !a.trim())) throw Error(`${q.id}: потрібно щонайменше три непорожні неправильні відповіді.`);
    const normalized = [q.correct, ...q.wrong].map(a => a.normalize('NFC').replace(/\s+/g, ' ').trim());
    if (new Set(normalized).size !== normalized.length) throw Error(`${q.id}: відповіді не повинні повторюватись.`);
    const note = notes.find(n => n.path === (q.notePath || `${directory}/index.html`));
    if (!/^#[a-zA-Z0-9_-]+$/.test(q.reference) || !note?.headings.some(h => '#'+h.id === q.reference)) throw Error(`${q.id}: оберіть наявний розділ конспекту.`);
    if (JSON.stringify(q).length > 50000) throw Error('Питання завелике.');
  }
}
export async function atomicWrite(file, text) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp, text, 'utf8'); await rename(temp, file); } finally { await rm(temp, { force: true }); }
}
export async function buildQuiz(root) {
  const topics = await loadTopics(root); const notes = await catalog(root); let total = 0;
  const outputs = [];
  for (const topic of topics) {
    validate(topic.data, topic.directory, notes); total += topic.data.questions.length;
    outputs.push([path.join(root, topic.directory, 'quiz-data.js'), `"use strict";\n// Generated from questions.json by npm run build:quiz.\nwindow.QUIZ_CONFIG = ${JSON.stringify(topic.data, null, 2)};\n`]);
  }
  const indexFile = path.join(root, 'index.html'); let index = await readFile(indexFile, 'utf8');
  for (const t of topics) index = index.replace(new RegExp(`(value="${Number(t.directory.slice(0,2))}" data-questions=")\\d+(")`), (_, prefix, suffix) => `${prefix}${t.data.questions.length}${suffix}`);
  outputs.push([indexFile, index]);
  const loader = path.join(root, 'quiz-loader.js'); outputs.push([loader, (await readFile(loader, 'utf8')).replace(/totalQuestions: \d+/, `totalQuestions: ${total}`)]);
  for (const [file, text] of outputs) await atomicWrite(file, text);
  return total;
}

