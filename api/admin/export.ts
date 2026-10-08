import { isAdmin } from '../_lib/admin.js';
import { getDb } from '../_lib/db.js';
import { fail, handler } from '../_lib/http.js';

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** 행사 순위 CSV (경품 확인용) */
export const GET = handler(async (req) => {
  if (!isAdmin(req)) return fail('비밀번호가 틀렸어요.', 401);
  const eventId = Number(new URL(req.url).searchParams.get('event'));
  const db = await getDb();
  const rows = await db.query<Record<string, unknown>>(
    `SELECT row_number() OVER (ORDER BY pl.score DESC, pl.stamps DESC, pl.duration_sec ASC, pl.id ASC) AS rank,
            p.nickname, p.affiliation_key, p.grade, pl.score, pl.stamps, pl.outcome,
            to_char(pl.created_at AT TIME ZONE 'Asia/Seoul', 'HH24:MI') AS time, p.hidden
     FROM plays pl JOIN players p ON p.id = pl.player_id
     WHERE pl.event_id = $1 ORDER BY rank`,
    [eventId],
  );
  const header = ['순위', '별명', '소속', '학년', '점수', '도장', '결과', '시각', '숨김'];
  const lines = rows.map((r) => [r.rank, r.nickname, r.affiliation_key, r.grade, r.score, r.stamps, r.outcome, r.time, r.hidden ? '숨김' : ''].map(cell).join(','));
  return new Response('﻿' + [header.map(cell).join(','), ...lines].join('\r\n'), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="ranking-${eventId}.csv"` },
  });
});
