import type { Db } from './db.js';

export interface EventRow {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  delete_after: string;
}

/** 지금 진행 중인 행사 (여러 개면 가장 최근에 시작한 것) */
export async function activeEvent(db: Db): Promise<EventRow | null> {
  const rows = await db.query<EventRow>(
    `SELECT id, name, starts_at, ends_at, delete_after FROM events
     WHERE starts_at <= now() AND ends_at > now()
     ORDER BY starts_at DESC LIMIT 1`,
  );
  return rows[0] ?? null;
}

/** 한 판 점수의 이론상 최고점보다 넉넉한 상한 (서버 검사용) */
export const MAX_SCORE = 8000;
/** 이보다 짧은 판은 비정상으로 본다 */
export const MIN_DURATION_SEC = 20;

const KST = 9 * 3600 * 1000;

/** 행사가 끝나는 날의 다음 날 0시(KST) = 기록 삭제 시각 */
export function nextKstMidnight(endsAt: Date): Date {
  const kst = new Date(endsAt.getTime() + KST);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + 1) - KST);
}
