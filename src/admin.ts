// 진행자 화면: 행사 만들기, 부적절한 별명 숨기기, 순위 CSV 받기, 기록 바로 지우기
import './admin.css';
import { h } from './ui/dom';

interface EventRow { id: number; name: string; starts_at: string; ends_at: string; delete_after: string; plays: number }
interface PlayerRow { id: number; nickname: string; affiliation: string; grade: number | null; hidden: boolean; created_at: string; score: number | null }

const root = document.getElementById('admin')!;
const PW_KEY = 'localmarble-admin';
let password = sessionStorage.getItem(PW_KEY) ?? '';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'x-admin-password': password, ...(init.body ? { 'content-type': 'application/json' } : {}) },
  });
  if (res.status === 401) { sessionStorage.removeItem(PW_KEY); throw new Error('비밀번호가 틀렸어요.'); }
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `오류 ${res.status}`);
  return res.json() as Promise<T>;
}

const kst = (iso: string) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
/** datetime-local 입력값(한국 시간) ↔ ISO */
const toIso = (local: string) => new Date(`${local}:00+09:00`).toISOString();
const toLocal = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 16);

function login() {
  const input = h('input', { type: 'password', placeholder: '진행자 비밀번호' });
  const msg = h('p', { class: 'err' });
  const go = async () => {
    password = input.value;
    try {
      await api('/api/admin/events');
      sessionStorage.setItem(PW_KEY, password);
      void render();
    } catch (e) { msg.textContent = (e as Error).message; }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void go(); });
  root.replaceChildren(h('section', { class: 'card narrow' }, h('h1', {}, '진행자 화면'), input, h('button', { onclick: go }, '들어가기'), msg));
  input.focus();
}

async function render() {
  let events: EventRow[];
  try { events = await api<EventRow[]>('/api/admin/events'); } catch (e) { login(); return; }

  const now = Date.now();
  const status = (e: EventRow) => (new Date(e.starts_at).getTime() > now ? '예정' : new Date(e.ends_at).getTime() > now ? '진행 중' : '종료');

  root.replaceChildren(
    h('h1', {}, '진행자 화면'),
    h('p', { class: 'links' }, h('a', { href: '/', target: '_blank' }, '게임 열기'), ' · ', h('a', { href: '/board', target: '_blank' }, '전광판 열기')),
    eventForm(),
    h('section', { class: 'card' }, h('h2', {}, '행사 목록'),
      events.length ? h('table', {},
        h('thead', {}, h('tr', {}, ...['상태', '이름', '시작', '끝', '기록 삭제', '판 수', ''].map((t) => h('th', {}, t)))),
        h('tbody', {}, ...events.map((e) => h('tr', {},
          h('td', {}, h('span', { class: `badge ${status(e) === '진행 중' ? 'on' : ''}` }, status(e))),
          h('td', {}, e.name), h('td', {}, kst(e.starts_at)), h('td', {}, kst(e.ends_at)), h('td', {}, kst(e.delete_after)), h('td', {}, String(e.plays)),
          h('td', { class: 'actions' },
            h('button', { onclick: () => eventForm(e) }, '수정'),
            h('button', { onclick: () => players(e) }, '참가자'),
            h('button', { onclick: () => exportCsv(e) }, 'CSV'),
            h('button', { class: 'danger', onclick: () => purge(e) }, '기록 지우기'))))))
        : h('p', {}, '아직 행사가 없어요. 위에서 만들어 주세요.')),
    h('div', { id: 'players' }),
  );
}

function eventForm(edit?: EventRow): HTMLElement {
  const name = h('input', { placeholder: '예: 2026 홍성 행사', value: edit?.name ?? '' });
  const starts = h('input', { type: 'datetime-local', value: edit ? toLocal(edit.starts_at) : '2026-10-17T09:00' });
  const ends = h('input', { type: 'datetime-local', value: edit ? toLocal(edit.ends_at) : '2026-10-17T18:00' });
  const msg = h('p', { class: 'err' });
  const save = async () => {
    try {
      await api('/api/admin/events', { method: 'POST', body: JSON.stringify({ action: 'save', id: edit?.id, name: name.value, startsAt: toIso(starts.value), endsAt: toIso(ends.value) }) });
      void render();
    } catch (e) { msg.textContent = (e as Error).message; }
  };
  const card = h('section', { class: 'card', id: 'event-form' },
    h('h2', {}, edit ? `행사 수정: ${edit.name}` : '새 행사 만들기'),
    h('div', { class: 'form' },
      h('label', {}, '이름', name), h('label', {}, '시작 (한국 시간)', starts), h('label', {}, '끝 (한국 시간)', ends),
      h('button', { class: 'primary', onclick: save }, edit ? '저장' : '만들기')),
    h('p', { class: 'help' }, '시작~끝 사이에만 게임 기록이 순위표에 저장됩니다. 기록은 끝나는 날 다음 날 0시 이후 새벽에 자동으로 지워집니다.'),
    msg);
  if (edit) { document.getElementById('event-form')?.replaceWith(card); card.scrollIntoView({ behavior: 'smooth' }); }
  return card;
}

async function players(e: EventRow) {
  const box = document.getElementById('players')!;
  const list = await api<PlayerRow[]>(`/api/admin/players?event=${e.id}`);
  const toggle = async (p: PlayerRow) => {
    await api('/api/admin/players', { method: 'POST', body: JSON.stringify({ id: p.id, hidden: !p.hidden }) });
    void players(e);
  };
  box.replaceChildren(h('section', { class: 'card' },
    h('h2', {}, `참가자 (최근 ${list.length}명) · ${e.name}`),
    h('p', { class: 'help' }, '부적절한 별명은 "숨기기"를 누르면 순위표와 전광판에서 바로 빠집니다.'),
    h('table', {},
      h('thead', {}, h('tr', {}, ...['시각', '별명', '소속', '학년', '점수', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, ...list.map((p) => h('tr', { class: p.hidden ? 'hidden-row' : '' },
        h('td', {}, kst(p.created_at)), h('td', {}, p.nickname), h('td', {}, p.affiliation), h('td', {}, p.grade ? `${p.grade}학년` : ''),
        h('td', {}, p.score === null ? '플레이 중' : String(p.score)),
        h('td', {}, h('button', { class: p.hidden ? '' : 'danger', onclick: () => toggle(p) }, p.hidden ? '다시 보이기' : '숨기기'))))))));
  box.scrollIntoView({ behavior: 'smooth' });
}

async function exportCsv(e: EventRow) {
  const res = await fetch(`/api/admin/export?event=${e.id}`, { headers: { 'x-admin-password': password } });
  if (!res.ok) return alert('CSV를 받지 못했어요.');
  const url = URL.createObjectURL(await res.blob());
  const a = h('a', { href: url, download: `순위-${e.name}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

async function purge(e: EventRow) {
  if (!confirm(`「${e.name}」의 모든 참가자·점수 기록을 지금 지울까요? 되돌릴 수 없어요.`)) return;
  await api('/api/admin/events', { method: 'POST', body: JSON.stringify({ action: 'purge', id: e.id }) });
  void render();
}

if (password) void render(); else login();
