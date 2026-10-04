import http from 'node:http';
import path from 'node:path';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { catalog, loadTopics, validate, atomicWrite, buildQuiz, revision } from './data.mjs';

export async function startServer(root, port = 8769) {
  root = await realpath(root);
  const token = randomBytes(32).toString('hex'); let busy = false; let origin;
  const json = (res, status, data) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(data)); };
  const server = http.createServer(async (req, res) => {
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) return json(res,403,{error:'Доступ дозволений лише з локального редактора.'});
      const url = new URL(req.url, origin);
      if (url.pathname === '/api/state' && req.method === 'GET') return json(res,200,{ token, topics:await loadTopics(root), notes:await catalog(root) });
      if (url.pathname === '/api/save' && req.method === 'POST') {
        if (req.headers['x-admin-token'] !== token || !req.headers['content-type']?.startsWith('application/json')) return json(res,403,{error:'Недійсний сеанс редактора.'});
        if (busy) return json(res,409,{error:'Інше збереження ще виконується.'}); busy = true;
        try {
          const chunks = []; let size = 0;
          for await (const chunk of req) { size += chunk.length; if (size>2_000_000) throw Error('Запит завеликий.'); chunks.push(chunk); }
          const body = Buffer.concat(chunks).toString('utf8');
          const input = JSON.parse(body), topics = await loadTopics(root), topic = topics.find(t => t.directory === input.directory);
          if (!topic) return json(res,400,{error:'Невідома тема.'});
          if (topic.revision !== input.revision) return json(res,409,{error:'Файл змінився після відкриття. Ваші правки залишено у формі. Оновіть сторінку перед повторним редагуванням.'});
          const allowed = ['id','topic','question','correct','wrong','explanation','reference','notePath'];
          if (!Array.isArray(input.questions)) throw Error('Неправильний формат питань.');
          const questions = input.questions.map(q => Object.fromEntries(allowed.filter(k => q[k] !== undefined).map(k => [k,q[k]])));
          const data = {...topic.data, questions}; validate(data,topic.directory,await catalog(root));
          const otherIds = new Set(topics.filter(t=>t!==topic).flatMap(t=>t.data.questions.map(q=>q.id)));
          if (questions.some(q=>otherIds.has(q.id))) throw Error('ID вже використовується в іншій темі.');
          const file = path.join(root,topic.directory,'questions.json'), previous = await readFile(file,'utf8');
          if (revision(previous) !== input.revision) return json(res,409,{error:'Файл змінено іншим процесом. Оновіть сторінку перед повторним редагуванням.'});
          try {
            await atomicWrite(file, JSON.stringify(data,null,2)+'\n'); await buildQuiz(root);
            execFileSync(process.execPath,['build-asset-versions.mjs'],{cwd:root,stdio:'pipe'});
          } catch (e) { await atomicWrite(file,previous); await buildQuiz(root); throw e; }
          return json(res,200,{topic:(await loadTopics(root)).find(t=>t.directory===topic.directory)});
        } finally { busy = false; }
      }
      if (url.pathname.startsWith('/api/')) return json(res,404,{error:'Невідома команда.'});
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res,405,{error:'Метод не дозволено.'});
      let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'admin/index.html';
      if (relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(root,relative), rel = path.relative(root,file);
      if (rel.startsWith('..') || path.isAbsolute(rel) || /(^|[\\/])\./.test(rel)) return json(res,403,{error:'Недоступний шлях.'});
      const ext = path.extname(file); const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};
      if (!types[ext]) return json(res,403,{error:'Недоступний файл.'});
      const resolved = await realpath(file); if (path.relative(root,resolved).startsWith('..')) return json(res,403,{error:'Недоступний шлях.'});
      let content = await readFile(file);
      if (['index.html','quiz.html'].includes(relative)) content = Buffer.from(content.toString().replace('</body>', '<a href="/admin/" style="position:fixed;bottom:16px;left:16px;z-index:20;background:#286b58;color:white;padding:10px 16px;border-radius:8px">Редактор питань</a></body>'));
      res.writeHead(200,{'Content-Type':types[ext]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"frame-ancestors 'self'"});res.end(req.method==='HEAD'?undefined:content);
    } catch(e) { json(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'Файл не знайдено.':e.message}); }
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);}); origin = `http://127.0.0.1:${server.address().port}`;
  return {server,origin};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {origin} = await startServer(fileURLToPath(new URL('..',import.meta.url)), Number(process.env.QUIZ_ADMIN_PORT || 8769));
  console.log(`Редактор вікторин: ${origin}/admin/\nЗупинити: Ctrl+C. Зміни зберігаються у файлах проєкту; коміт виконується окремо.`);
}
