import { neon } from '@neondatabase/serverless';

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

let db: Db | null = null;
let ready: Promise<void> | null = null;

/** 테스트에서 다른 DB(PGlite)로 바꿔 끼울 때 사용 */
export function setDb(next: Db): void {
  db = next;
  ready = null;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS events (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     starts_at TIMESTAMPTZ NOT NULL,
     ends_at TIMESTAMPTZ NOT NULL,
     delete_after TIMESTAMPTZ NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS players (
     id SERIAL PRIMARY KEY,
     event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     affiliation_raw TEXT NOT NULL,
     affiliation_key TEXT NOT NULL,
     nickname TEXT NOT NULL,
     grade INT,
     token TEXT NOT NULL UNIQUE,
     token_used BOOLEAN NOT NULL DEFAULT false,
     hidden BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS players_event_aff ON players(event_id, affiliation_key)`,
  `CREATE TABLE IF NOT EXISTS plays (
     id SERIAL PRIMARY KEY,
     player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
     event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
     score INT NOT NULL,
     stamps INT NOT NULL,
     lives_left INT NOT NULL,
     turns INT NOT NULL,
     duration_sec INT NOT NULL,
     level TEXT NOT NULL,
     outcome TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS plays_event_score ON plays(event_id, score DESC)`,
  `CREATE TABLE IF NOT EXISTS question_stats (
     question_id TEXT PRIMARY KEY,
     shown INT NOT NULL DEFAULT 0,
     correct INT NOT NULL DEFAULT 0)`,
];

/** DB 연결 + 테이블이 없으면 만든다(첫 요청 때 한 번). */
export async function getDb(): Promise<Db> {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL 환경변수가 없습니다.');
    const sql = neon(url);
    db = { query: async <T>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[] };
  }
  const current = db;
  ready ??= (async () => {
    for (const stmt of SCHEMA) await current.query(stmt);
  })().catch((err) => {
    ready = null;
    throw err;
  });
  await ready;
  return current;
}
