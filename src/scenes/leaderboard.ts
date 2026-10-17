import { sfx } from '../audio/sfx';
import { fetchLeaderboard } from '../services/api';
import { h } from '../ui/dom';
import { leaderboardView } from '../ui/leaderboardView';

/** 게임 안 순위 화면: 전광판(/board)과 같은 모양 + 아래 버튼 */
export async function leaderboardScreen(stage: HTMLElement, myPlayId?: number, nextLabel = '다음 친구 차례! 👋'): Promise<void> {
  const title = h('div', { class: 'display-event' }, '');
  const clock = h('div', { class: 'display-clock' }, new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }));
  const body = h('div', { class: 'display-body' }, h('p', { class: 'lb-empty' }, '순위표를 불러오는 중…'));
  const next = h('button', { class: 'btn btn-primary big' }, nextLabel);
  stage.replaceChildren(h('div', { class: 'screen display-screen lb-screen' },
    h('header', { class: 'display-head' },
      h('h1', { class: 'logo display-logo' }, h('span', { class: 'logo-line1' }, '다 같이 돌자,'), h('span', { class: 'logo-line2' }, '홍성 ', h('span', { class: 'logo-go' }, '한 바퀴'))),
      title, clock),
    body,
    h('div', { class: 'lb-foot' }, next)));
  const data = await fetchLeaderboard(12);
  if (data?.event) title.textContent = data.event.ended ? `${data.event.name} · 최종 순위` : data.event.name;
  body.replaceChildren(data
    ? leaderboardView(data, { highlightId: myPlayId, playerRows: 12, affRows: 10 })
    : h('p', { class: 'lb-empty' }, '지금은 순위표를 불러올 수 없어요.'));
  return new Promise((resolve) => {
    const auto = window.setTimeout(() => next.click(), 60_000);
    next.addEventListener('click', () => { clearTimeout(auto); sfx.go(); resolve(); }, { once: true });
  });
}
