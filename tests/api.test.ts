// API를 실제 PostgreSQL 엔진(PGlite)으로 시험한다: npm run test:api
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { setDb } from '../api/_lib/db.js';
import { nextKstMidnight } from '../api/_lib/event.js';
import * as event from '../api/event.js';
import * as affiliations from '../api/affiliations.js';
import * as players from '../api/players.js';
import * as plays from '../api/plays.js';
import * as leaderboard from '../api/leaderboard.js';
import * as cleanup from '../api/cron/cleanup.js';
import * as adminEvents from '../api/admin/events.js';
import * as adminPlayers from '../api/admin/players.js';
import * as adminExport from '../api/admin/export.js';

process.env.ADMIN_PASSWORD = 'pw-test';
process.env.CRON_SECRET = 'cron-test';

const pg = new PGlite();
setDb({ query: async (text, params = []) => (await pg.query(text, params)).rows as never[] });

const BASE = 'http://test.local';
const get = (h: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) => h(new Request(BASE + path, { headers }));
const post = (h: (r: Request) => Promise<Response>, path: string, data: unknown, headers: Record<string, string> = {}) =>
  h(new Request(BASE + path, { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json', ...headers } }));
const admin = { 'x-admin-password': 'pw-test' };
let passed = 0;
async function step(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log('✓', name);
}

await step('삭제 시각은 끝나는 날 다음 날 0시(KST)', async () => {
  assert.equal(nextKstMidnight(new Date('2026-10-17T17:00:00+09:00')).toISOString(), '2026-10-17T15:00:00.000Z');
  assert.equal(nextKstMidnight(new Date('2026-10-17T23:30:00+09:00')).toISOString(), '2026-10-17T15:00:00.000Z');
});

await step('행사가 없으면 연습 모드', async () => {
  assert.deepEqual(await (await get(event.GET, '/api/event')).json(), { active: false });
  const r = await post(players.POST, '/api/players', { affiliation: '홍성초', nickname: '날쌘대하' });
  assert.equal(r.status, 409);
});

await step('진행자 비밀번호 없으면 거부', async () => {
  assert.equal((await get(adminEvents.GET, '/api/admin/events')).status, 401);
  assert.equal((await get(adminEvents.GET, '/api/admin/events', { 'x-admin-password': 'wrong' })).status, 401);
});

let eventId = 0;
await step('행사 만들기', async () => {
  const now = Date.now();
  const r = await post(adminEvents.POST, '/api/admin/events', {
    action: 'save', name: '시험 행사', startsAt: new Date(now - 3600e3).toISOString(), endsAt: new Date(now + 3600e3).toISOString(),
  }, admin);
  assert.equal(r.status, 200);
  eventId = ((await r.json()) as { id: number }).id;
  const ev = (await (await get(event.GET, '/api/event')).json()) as { active: boolean; name: string };
  assert.equal(ev.active, true);
  assert.equal(ev.name, '시험 행사');
});

await step('등록: 금칙어·형식 검사', async () => {
  assert.equal((await post(players.POST, '/api/players', { affiliation: '홍성초', nickname: '바보 시발' })).status, 400);
  assert.equal((await post(players.POST, '/api/players', { affiliation: '홍성초', nickname: '가' })).status, 400);
  assert.equal((await post(players.POST, '/api/players', { affiliation: 'ㅂ', nickname: '날쌘대하' })).status, 400);
});

const tokens: string[] = [];
await step('등록: 소속 이름 정리, 같은 별명 번호 붙이기', async () => {
  const a = (await (await post(players.POST, '/api/players', { affiliation: '홍성 초등학교', nickname: '날쌘대하', grade: 4 })).json()) as { token: string; nickname: string; affiliation: string };
  const b = (await (await post(players.POST, '/api/players', { affiliation: '홍성초', nickname: '날쌘대하' })).json()) as { token: string; nickname: string };
  const c = (await (await post(players.POST, '/api/players', { affiliation: '홍성초등학교', nickname: '날쌘대하' })).json()) as { token: string; nickname: string };
  assert.equal(a.affiliation, '홍성초');
  assert.deepEqual([a.nickname, b.nickname, c.nickname], ['날쌘대하', '날쌘대하#2', '날쌘대하#3']);
  tokens.push(a.token, b.token, c.token);
  for (const [aff, nick] of [['홍주초', '반짝새우젓'], ['홍주초', '용감한억새'], ['개인', '씩씩한오리']]) {
    const r = (await (await post(players.POST, '/api/players', { affiliation: aff, nickname: nick })).json()) as { token: string };
    tokens.push(r.token);
  }
});

await step('소속 자동 완성', async () => {
  const list = await (await get(affiliations.GET, '/api/affiliations?q=' + encodeURIComponent('홍'))).json();
  assert.deepEqual(list, ['홍성초', '홍주초']);
  assert.deepEqual(await (await get(affiliations.GET, '/api/affiliations?q=%25')).json(), []);
});

const play = (token: string, score: number, extra: Record<string, unknown> = {}) =>
  post(plays.POST, '/api/plays', { token, score, stamps: 3, livesLeft: 1, turns: 12, durationSec: 300, level: 'low', outcome: 'timeout', answered: [{ id: 'L01', correct: true }, { id: 'L02', correct: false }], ...extra });

await step('점수 저장과 순위', async () => {
  const scores = [900, 1500, 700, 1200, 1100, 2000];
  const ranks: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const r = (await (await play(tokens[i], scores[i])).json()) as { rank: number; total: number };
    ranks.push(r.rank);
    assert.equal(r.total, i + 1);
  }
  assert.deepEqual(ranks, [1, 1, 3, 2, 3, 1]);
});

await step('같은 토큰으로 두 번 저장 불가, 이상한 점수 거부', async () => {
  assert.equal((await play(tokens[0], 9999)).status, 400);
  assert.equal((await play(tokens[0], 100)).status, 409);
  assert.equal((await play('없는-토큰', 100)).status, 409);
  assert.equal((await play(tokens[1], 100, { durationSec: 5 })).status, 400);
});

await step('리더보드: 개인 순위, 소속 대항전(3명 이상, 개인 제외)', async () => {
  const lb = (await (await get(leaderboard.GET, '/api/leaderboard')).json()) as {
    players: { nickname: string; score: number }[]; affiliations: { affiliation: string; score: number; players: number }[]; total: number;
  };
  assert.equal(lb.total, 6);
  assert.deepEqual(lb.players.map((p) => p.score), [2000, 1500, 1200, 1100, 900, 700]);
  assert.deepEqual(lb.affiliations, [{ affiliation: '홍성초', score: 1033, players: 3 }]);
});

await step('문항 통계 누적', async () => {
  const rows = (await pg.query<{ question_id: string; shown: number; correct: number }>('SELECT * FROM question_stats ORDER BY question_id')).rows;
  assert.deepEqual(rows.map((r) => [r.question_id, r.shown, r.correct]), [['L01', 6, 6], ['L02', 6, 0]]);
});

await step('진행자: 별명 숨기기 → 순위에서 빠짐, CSV', async () => {
  const list = (await (await get(adminPlayers.GET, `/api/admin/players?event=${eventId}`, admin)).json()) as { id: number; nickname: string }[];
  const target = list.find((p) => p.nickname === '씩씩한오리')!;
  await post(adminPlayers.POST, '/api/admin/players', { id: target.id, hidden: true }, admin);
  const lb = (await (await get(leaderboard.GET, '/api/leaderboard')).json()) as { players: { score: number }[] };
  assert.equal(lb.players[0].score, 1500);
  const csv = await (await get(adminExport.GET, `/api/admin/export?event=${eventId}`, admin)).text();
  assert.match(csv, /순위/);
  assert.match(csv, /날쌘대하#2/);
});

await step('Cron 삭제: 비밀값 확인, 삭제 시각 전에는 안 지움, 지난 뒤에는 지움', async () => {
  assert.equal((await get(cleanup.GET, '/api/cron/cleanup')).status, 401);
  let r = (await (await get(cleanup.GET, '/api/cron/cleanup', { authorization: 'Bearer cron-test' })).json()) as { deleted: unknown[] };
  assert.equal(r.deleted.length, 0);
  await pg.query(`UPDATE events SET ends_at = now() - interval '2 hours', delete_after = now() - interval '1 minute' WHERE id = $1`, [eventId]);
  r = (await (await get(cleanup.GET, '/api/cron/cleanup', { authorization: 'Bearer cron-test' })).json()) as { deleted: unknown[] };
  assert.equal(r.deleted.length, 1);
  const left = (await pg.query<{ n: number }>('SELECT (SELECT count(*) FROM players) + (SELECT count(*) FROM plays) AS n')).rows[0];
  assert.equal(Number(left.n), 0);
  const stats = (await pg.query('SELECT * FROM question_stats')).rows;
  assert.equal(stats.length, 2);
});

console.log(`\n${passed}개 통과`);
