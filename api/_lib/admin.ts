import { timingSafeEqual } from 'node:crypto';

/** 진행자 비밀번호 확인 (ADMIN_PASSWORD 환경변수) */
export function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  const given = req.headers.get('x-admin-password') ?? '';
  if (!expected || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
