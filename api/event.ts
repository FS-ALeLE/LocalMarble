import { getDb } from './_lib/db.js';
import { activeEvent } from './_lib/event.js';
import { handler, json } from './_lib/http.js';

/** 진행 중인 행사. 없으면 연습 모드. */
export const GET = handler(async () => {
  const ev = await activeEvent(await getDb());
  return ev ? json({ active: true, id: ev.id, name: ev.name, endsAt: ev.ends_at }) : json({ active: false });
});
