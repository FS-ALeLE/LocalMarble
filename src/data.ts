import { CONFIG, REGION_BASE } from './config';
import type { Board, Question, RegionData } from './core/types';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(REGION_BASE + path);
  if (!res.ok) throw new Error(`${path} 불러오기 실패 (${res.status})`);
  return res.json() as Promise<T>;
}

function imageLoads(src: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = REGION_BASE + src;
  });
}

export async function loadRegion(): Promise<RegionData> {
  const [board, all, facts, nicknames] = await Promise.all([
    getJson<Board>('board.json'),
    getJson<Question[]>('questions.json'),
    getJson<string[]>('facts.json'),
    getJson<RegionData['nicknames']>('nicknames.json'),
  ]);
  const usable = all.filter((q) => q.verified || CONFIG.allowUnverified);
  // 사진이 아직 없는 사진 문항은 빼고 시작한다.
  const checks = await Promise.all(usable.map((q) => (q.image ? imageLoads(q.image) : Promise.resolve(true))));
  const questions = usable.filter((_, i) => checks[i]);
  return { board, questions, facts, nicknames };
}
