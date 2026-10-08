import { isAdmin } from '../_lib/admin.js';
import { getDb } from '../_lib/db.js';
import { nextKstMidnight } from '../_lib/event.js';
import { body, fail, handler, json } from '../_lib/http.js';

export const GET = handler(async (req) => {
  if (!isAdmin(req)) return fail('비밀번호가 틀렸어요.', 401);
  const db = await getDb();
  const rows = await db.query(
    `SELECT e.id, e.name, e.starts_at, e.ends_at, e.delete_after,
            (SELECT count(*)::int FROM plays WHERE event_id = e.id) AS plays
     FROM events e ORDER BY e.starts_at DESC`,
  );
  return json(rows);
});

interface Input {
  action?: 'save' | 'purge';
  id?: number;
  name?: string;
  startsAt?: string;
  endsAt?: string;
}

/** 행사 만들기·고치기(save), 기록 바로 지우기(purge) */
export const POST = handler(async (req) => {
  if (!isAdmin(req)) return fail('비밀번호가 틀렸어요.', 401);
  const input = await body<Input>(req);
  const db = await getDb();
  if (input?.action === 'purge') {
    if (!Number.isInteger(input.id)) return fail('행사를 골라 주세요.');
    await db.query(`DELETE FROM events WHERE id = $1`, [input.id]);
    return json({ ok: true });
  }
  const name = String(input?.name ?? '').trim();
  const starts = new Date(String(input?.startsAt ?? ''));
  const ends = new Date(String(input?.endsAt ?? ''));
  if (!name || isNaN(starts.getTime()) || isNaN(ends.getTime()) || ends <= starts) return fail('행사 이름과 시간을 확인해 주세요.');
  const deleteAfter = nextKstMidnight(ends);
  const params = [name, starts.toISOString(), ends.toISOString(), deleteAfter.toISOString()];
  const [row] = Number.isInteger(input?.id)
    ? await db.query(`UPDATE events SET name = $1, starts_at = $2, ends_at = $3, delete_after = $4 WHERE id = $5 RETURNING *`, [...params, input!.id])
    : await db.query(`INSERT INTO events (name, starts_at, ends_at, delete_after) VALUES ($1, $2, $3, $4) RETURNING *`, params);
  return row ? json(row) : fail('행사를 찾지 못했어요.', 404);
});
