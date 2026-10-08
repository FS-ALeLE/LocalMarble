import { isAdmin } from '../_lib/admin.js';
import { getDb } from '../_lib/db.js';
import { body, fail, handler, json } from '../_lib/http.js';

/** 최근 등록한 아이들 (별명 숨기기용) */
export const GET = handler(async (req) => {
  if (!isAdmin(req)) return fail('비밀번호가 틀렸어요.', 401);
  const eventId = Number(new URL(req.url).searchParams.get('event'));
  const db = await getDb();
  const rows = await db.query(
    `SELECT p.id, p.nickname, p.affiliation_key AS affiliation, p.grade, p.hidden, p.created_at, pl.score
     FROM players p LEFT JOIN plays pl ON pl.player_id = p.id
     WHERE p.event_id = $1 ORDER BY p.created_at DESC LIMIT 200`,
    [eventId],
  );
  return json(rows);
});

/** 별명 숨기기 / 다시 보이기 */
export const POST = handler(async (req) => {
  if (!isAdmin(req)) return fail('비밀번호가 틀렸어요.', 401);
  const input = await body<{ id?: number; hidden?: boolean }>(req);
  if (!Number.isInteger(input?.id)) return fail('대상을 골라 주세요.');
  const db = await getDb();
  await db.query(`UPDATE players SET hidden = $2 WHERE id = $1`, [input!.id, input!.hidden === true]);
  return json({ ok: true });
});
