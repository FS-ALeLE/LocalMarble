// 리더보드 API. 서버(Vercel + Neon)가 아직 없거나 연결이 안 되면 연습 모드로 동작한다.
export interface EventInfo {
  active: boolean;
  id?: string;
  name?: string;
}

async function getJson<T>(url: string, timeoutMs = 3000): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchEvent(): Promise<EventInfo> {
  return (await getJson<EventInfo>('/api/event')) ?? { active: false };
}

export async function suggestAffiliations(q: string): Promise<string[]> {
  if (!q.trim()) return [];
  return (await getJson<string[]>(`/api/affiliations?q=${encodeURIComponent(q.trim())}`, 1500)) ?? [];
}
