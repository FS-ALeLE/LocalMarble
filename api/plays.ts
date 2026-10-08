import { getDb } from './_lib/db.js';
import { MAX_SCORE, MIN_DURATION_SEC } from './_lib/event.js';
import { body, fail, handler, json } from './_lib/http.js';

interface Input {
  token?: string;
  score?: number;
  stamps?: number;
  livesLeft?: number;
  turns?: number;
  durationSec?: number;
  level?: string;
  outcome?: string;
  answered?: { id: string; correct: boolean }[];
}

const int = (v: unknown, min: number, max: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : null);

/** 점수 저장 (토큰 하나당 한 번) → 내 순위 */
export const POST = handler(async (req) => {
  const input = await body<Input>(req);
  const token = typeof input?.token === 'string' ? input.token : '';
  const score = int(input?.score, 0, MAX_SCORE);
  const stamps = int(input?.stamps, 0, 20);
  const livesLeft = int(input?.livesLeft, 0, 10);
  const turns = int(input?.turns, 1, 100);
  const durationSec = int(input?.durationSec, MIN_DURATION_SEC, 3 * 3600);
  const level = input?.level === 'high' ? 'high' : 'low';
  const outcome = ['finish', 'gameover', 'timeout'].includes(input?.outcome ?? '') ? input!.outcome! : null;
  if (!token || score === null || stamps === null || livesLeft === null || turns === null || durationSec === null || !outcome) {
    return fail('기록 형식이 올바르지 않아요.');
  }

  const db = await getDb();
  // 토큰을 '사용됨'으로 바꾸면서 기록을 넣는다(한 문장이라 중복 저장이 안 됨).
  const [saved] = await db.query<{ id: number; event_id: number }>(
    `WITH p AS (
       UPDATE players SET token_used = true
       WHERE token = $1 AND NOT token_used
         AND event_id IN (SELECT id FROM events WHERE delete_after > now())
       RETURNING id, event_id)
     INSERT INTO plays (player_id, event_id, score, stamps, lives_left, turns, duration_sec, level, outcome)
     SELECT id, event_id, $2, $3, $4, $5, $6, $7, $8 FROM p
     RETURNING id, event_id`,
    [token, score, stamps, livesLeft, turns, durationSec, level, outcome],
  );
  if (!saved) return fail('이미 저장되었거나 사용할 수 없는 기록이에요.', 409);

  const answered = Array.isArray(input?.answered) ? input!.answered!.slice(0, 50) : [];
  const ids = answered.filter((a) => typeof a?.id === 'string' && a.id.length <= 40).map((a) => a.id);
  const oks = answered.filter((a) => typeof a?.id === 'string' && a.id.length <= 40).map((a) => a.correct === true);
  if (ids.length) {
    await db.query(
      `INSERT INTO question_stats (question_id, shown, correct)
       SELECT id, count(*), count(*) FILTER (WHERE ok) FROM unnest($1::text[], $2::bool[]) AS t(id, ok) GROUP BY id
       ON CONFLICT (question_id) DO UPDATE
       SET shown = question_stats.shown + EXCLUDED.shown, correct = question_stats.correct + EXCLUDED.correct`,
      [ids, oks],
    );
  }

  const [rank] = await db.query<{ rank: number; total: number }>(
    `SELECT (count(*) FILTER (WHERE pl.score > $2
               OR (pl.score = $2 AND pl.stamps > $3)
               OR (pl.score = $2 AND pl.stamps = $3 AND pl.duration_sec < $4)) + 1)::int AS rank,
            count(*)::int AS total
     FROM plays pl JOIN players p ON p.id = pl.player_id
     WHERE pl.event_id = $1 AND NOT p.hidden`,
    [saved.event_id, score, stamps, durationSec],
  );
  return json({ playId: saved.id, rank: rank.rank, total: rank.total });
});
