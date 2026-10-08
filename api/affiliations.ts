import { getDb } from './_lib/db.js';
import { activeEvent } from './_lib/event.js';
import { affiliationKey } from './_lib/filter.js';
import { handler, json } from './_lib/http.js';

/** 이 행사에서 이미 입력된 소속 자동 완성 */
export const GET = handler(async (req) => {
  const q = affiliationKey(new URL(req.url).searchParams.get('q') ?? '').slice(0, 12);
  if (!q) return json([]);
  const db = await getDb();
  const ev = await activeEvent(db);
  if (!ev) return json([]);
  const like = q.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
  const rows = await db.query<{ affiliation_key: string }>(
    `SELECT affiliation_key FROM players
     WHERE event_id = $1 AND NOT hidden AND affiliation_key <> '개인' AND affiliation_key LIKE $2
     GROUP BY affiliation_key ORDER BY count(*) DESC, affiliation_key LIMIT 6`,
    [ev.id, like],
  );
  return json(rows.map((r) => r.affiliation_key));
});
