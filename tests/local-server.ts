// 로컬 시험용 서버: dist/ 정적 파일 + /api/* 를 PGlite DB로 실행한다 (Vercel 없이 전체 흐름 확인).
// 사용: npm run build && npx tsx tests/local-server.ts [포트]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { setDb } from '../api/_lib/db.js';

process.env.ADMIN_PASSWORD ??= 'admin';
process.env.CRON_SECRET ??= 'cron';
const pg = new PGlite();
setDb({ query: async (text, params = []) => (await pg.query(text, params)).rows as never[] });

const routes: Record<string, Record<string, (r: Request) => Promise<Response>>> = {
  '/api/event': await import('../api/event.js'),
  '/api/affiliations': await import('../api/affiliations.js'),
  '/api/players': await import('../api/players.js'),
  '/api/plays': await import('../api/plays.js'),
  '/api/leaderboard': await import('../api/leaderboard.js'),
  '/api/cron/cleanup': await import('../api/cron/cleanup.js'),
  '/api/admin/events': await import('../api/admin/events.js'),
  '/api/admin/players': await import('../api/admin/players.js'),
  '/api/admin/export': await import('../api/admin/export.js'),
};
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const port = Number(process.argv[2] ?? 4300);
createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const route = routes[url.pathname];
  if (route) {
    const fn = route[req.method ?? 'GET'];
    if (!fn) { res.writeHead(405).end(); return; }
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const request = new Request(url, { method: req.method, headers: req.headers as Record<string, string>, body: chunks.length ? Buffer.concat(chunks) : undefined });
    const response = await fn(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  let path = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  if (path === '/') path = '/index.html';
  if (!extname(path)) path += '.html'; // cleanUrls
  try {
    const data = await readFile(join('dist', path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
