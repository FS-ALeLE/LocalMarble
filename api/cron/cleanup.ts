import { getDb } from '../_lib/db.js';
import { fail, handler, json } from '../_lib/http.js';

/** 매일 새벽 3시(KST) Vercel Cron이 호출: 삭제 시각이 지난 행사의 기록을 지운다. */
export const GET = handler(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return fail('권한 없음', 401);
  const db = await getDb();
  const deleted = await db.query<{ id: number; name: string }>(`DELETE FROM events WHERE delete_after <= now() RETURNING id, name`);
  return json({ deleted });
});
