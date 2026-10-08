import { randomUUID } from 'node:crypto';
import { getDb } from './_lib/db.js';
import { activeEvent } from './_lib/event.js';
import { affiliationKey, affiliationProblem, nicknameProblem } from './_lib/filter.js';
import { body, fail, handler, json } from './_lib/http.js';

interface Input {
  affiliation?: string;
  nickname?: string;
  grade?: number | null;
}

/** 소속·별명 등록 → 플레이 토큰 발급 */
export const POST = handler(async (req) => {
  const input = await body<Input>(req);
  const affiliation = String(input?.affiliation ?? '').trim();
  const nickname = String(input?.nickname ?? '').trim();
  const grade = Number.isInteger(input?.grade) && input!.grade! >= 1 && input!.grade! <= 6 ? input!.grade! : null;
  const problem = affiliationProblem(affiliation) ?? nicknameProblem(nickname);
  if (problem) return fail(problem);

  const db = await getDb();
  const ev = await activeEvent(db);
  if (!ev) return fail('진행 중인 행사가 없어요.', 409);

  const key = affiliationKey(affiliation);
  const taken = new Set(
    (await db.query<{ nickname: string }>(
      `SELECT nickname FROM players WHERE event_id = $1 AND affiliation_key = $2 AND (nickname = $3 OR nickname LIKE $4)`,
      [ev.id, key, nickname, `${nickname}#%`],
    )).map((r) => r.nickname),
  );
  let finalName = nickname;
  for (let i = 2; taken.has(finalName); i++) finalName = `${nickname}#${i}`;

  const token = randomUUID();
  const [row] = await db.query<{ id: number }>(
    `INSERT INTO players (event_id, affiliation_raw, affiliation_key, nickname, grade, token)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [ev.id, affiliation, key, finalName, grade, token],
  );
  return json({ playerId: row.id, token, nickname: finalName, affiliation: key, eventId: ev.id });
});
