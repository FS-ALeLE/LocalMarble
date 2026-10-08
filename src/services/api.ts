// 리더보드 API. 서버가 없거나 연결이 안 되면 연습 모드로 동작하고, 기록은 기기에 보관했다가 다시 보낸다.
import type { PlayResult, Profile, Setup } from '../core/types';

export interface EventInfo {
  active: boolean;
  id?: number;
  name?: string;
}

export interface LeaderRow { id: number; nickname: string; affiliation: string; score: number; stamps: number; outcome: string; created_at: string }
export interface AffRow { affiliation: string; score: number; players: number }
export interface Leaderboard {
  event: { id: number; name: string; ended: boolean } | null;
  players: LeaderRow[];
  affiliations: AffRow[];
  total: number;
}
export interface Rank { playId: number; rank: number; total: number }

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<Result<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers },
    });
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : null;
    if (!isJson) return { ok: false, status: 0, error: '서버 없음' };
    if (!res.ok) return { ok: false, status: res.status, error: (data as { error?: string })?.error ?? '오류' };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: '연결 안 됨' };
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(url: string, data: unknown) => call<T>(url, { method: 'POST', body: JSON.stringify(data) });

export async function fetchEvent(): Promise<EventInfo> {
  const r = await call<EventInfo>('/api/event', {}, 4000);
  return r.ok ? r.data : { active: false };
}

export async function suggestAffiliations(q: string): Promise<string[]> {
  if (!q.trim()) return [];
  const r = await call<string[]>(`/api/affiliations?q=${encodeURIComponent(q.trim())}`, {}, 1500);
  return r.ok ? r.data : [];
}

export async function fetchLeaderboard(limit = 20): Promise<Leaderboard | null> {
  const r = await call<Leaderboard>(`/api/leaderboard?limit=${limit}`);
  return r.ok ? r.data : null;
}

interface Registered { token: string; nickname: string; affiliation: string }

/** 등록. status 0이면 연결 문제(나중에 다시 보냄), 4xx면 입력 문제. */
export function registerPlayer(profile: Profile) {
  return post<Registered>('/api/players', { affiliation: profile.affiliation, nickname: profile.nickname, grade: profile.grade ?? null });
}

// ---------- 점수 저장 + 재전송 대기열 ----------
const QUEUE_KEY = 'localmarble-pending';

interface Pending {
  profile: Profile;
  play: ReturnType<typeof playPayload>;
}

function playPayload(result: PlayResult, setup: Setup) {
  return {
    score: result.score,
    stamps: result.stamps.length,
    livesLeft: result.livesLeft,
    turns: result.turns,
    durationSec: result.durationSec,
    level: setup.level,
    outcome: result.outcome,
    answered: result.answered,
  };
}

function readQueue(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as Pending[];
  } catch {
    return [];
  }
}

function writeQueue(items: Pending[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* 저장 공간이 없으면 포기 */
  }
}

export function pendingCount(): number {
  return readQueue().length;
}

/** 한 건 보내기: 토큰이 없으면(오프라인 등록) 먼저 등록한다. 'retry'면 나중에 다시. */
async function send(item: Pending): Promise<Rank | 'retry' | 'drop'> {
  if (!item.profile.token) {
    const reg = await registerPlayer(item.profile);
    if (!reg.ok) return reg.status === 0 || reg.status >= 500 ? 'retry' : 'drop';
    item.profile = { ...item.profile, token: reg.data.token, nickname: reg.data.nickname };
  }
  const r = await post<Rank>('/api/plays', { token: item.profile.token, ...item.play });
  if (r.ok) return r.data;
  return r.status === 0 || r.status >= 500 ? 'retry' : 'drop';
}

/** 결과 저장. 실패하면 대기열에 넣고 null. */
export async function submitPlay(profile: Profile, setup: Setup, result: PlayResult): Promise<Rank | null> {
  const item: Pending = { profile, play: playPayload(result, setup) };
  const r = await send(item);
  if (r === 'retry') {
    writeQueue([...readQueue(), item]);
    return null;
  }
  return r === 'drop' ? null : r;
}

let flushing = false;
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const left: Pending[] = [];
    for (const item of readQueue()) {
      const r = await send(item);
      if (r === 'retry') left.push(item);
    }
    writeQueue(left);
  } finally {
    flushing = false;
  }
}
