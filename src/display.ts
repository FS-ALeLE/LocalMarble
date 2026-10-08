// 전광판: 부스의 큰 모니터에 띄워 두면 5초마다 순위를 새로 불러온다.
import './styles.css';
import { fetchLeaderboard } from './services/api';
import { h } from './ui/dom';
import { leaderboardView } from './ui/leaderboardView';
import { fitStage, toggleFullscreen } from './ui/stage';

const stage = document.getElementById('stage')!;
fitStage(stage);
document.body.classList.add('display-page');

const title = h('div', { class: 'display-event' }, '');
const body = h('div', { class: 'display-body' }, h('p', { class: 'lb-empty' }, '불러오는 중…'));
const clock = h('div', { class: 'display-clock' });
stage.replaceChildren(h('div', { class: 'screen display-screen', ondblclick: () => toggleFullscreen() },
  h('header', { class: 'display-head' },
    h('h1', { class: 'logo display-logo' }, '홍성 탐험 ', h('span', { class: 'logo-go' }, '고고!')),
    title, clock),
  body));

let seen: Set<number> | null = null;

async function refresh() {
  const data = await fetchLeaderboard(15);
  clock.textContent = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
  if (!data) return; // 연결이 잠깐 끊기면 마지막 화면을 그대로 둔다.
  if (!data.event) {
    title.textContent = '';
    body.replaceChildren(h('p', { class: 'display-wait' }, '곧 탐험이 시작돼요! 🎲'));
    return;
  }
  title.textContent = data.event.ended ? `${data.event.name} · 최종 순위` : data.event.name;
  const ids = new Set(data.players.map((p) => p.id));
  const fresh = new Set(seen ? [...ids].filter((id) => !seen!.has(id)) : []);
  seen = ids;
  body.replaceChildren(leaderboardView(data, { playerRows: 15, affRows: 12, fresh }));
}

void refresh();
setInterval(() => void refresh(), 5000);
