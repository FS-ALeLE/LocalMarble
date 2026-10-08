import { getDb } from './_lib/db.js';
import { handler, json } from './_lib/http.js';

/** 리더보드: 진행 중이거나, 끝났지만 아직 지우지 않은 가장 최근 행사 */
export const GET = handler(async (req) => {
  const params = new URL(req.url).searchParams;
  const limit = Math.min(50, Math.max(1, Number(params.get('limit')) || 20));
  const db = await getDb();
  const [ev] = await db.query<{ id: number; name: string; ends_at: string; ended: boolean }>(
    `SELECT id, name, ends_at, ends_at <= now() AS ended FROM events
     WHERE starts_at <= now() AND delete_after > now() ORDER BY starts_at DESC LIMIT 1`,
  );
  if (!ev) return json({ event: null, players: [], affiliations: [], total: 0 });

  const [players, affiliations, [count]] = await Promise.all([
    db.query(
      `SELECT pl.id, p.nickname, p.affiliation_key AS affiliation, pl.score, pl.stamps, pl.outcome, pl.created_at
       FROM plays pl JOIN players p ON p.id = pl.player_id
       WHERE pl.event_id = $1 AND NOT p.hidden
       ORDER BY pl.score DESC, pl.stamps DESC, pl.duration_sec ASC, pl.id ASC LIMIT $2`,
      [ev.id, limit],
    ),
    db.query(
      `WITH ranked AS (
         SELECT p.affiliation_key AS aff, pl.score,
                row_number() OVER (PARTITION BY p.affiliation_key ORDER BY pl.score DESC) AS rn,
                count(*) OVER (PARTITION BY p.affiliation_key) AS n
         FROM plays pl JOIN players p ON p.id = pl.player_id
         WHERE pl.event_id = $1 AND NOT p.hidden AND p.affiliation_key <> '개인')
       SELECT aff AS affiliation, round(avg(score))::int AS score, max(n)::int AS players
       FROM ranked WHERE rn <= 5 GROUP BY aff HAVING max(n) >= 3
       ORDER BY score DESC, players DESC LIMIT $2`,
      [ev.id, limit],
    ),
    db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM plays pl JOIN players p ON p.id = pl.player_id WHERE pl.event_id = $1 AND NOT p.hidden`,
      [ev.id],
    ),
  ]);
  return json({ event: { id: ev.id, name: ev.name, ended: ev.ended }, players, affiliations, total: count.total });
});
