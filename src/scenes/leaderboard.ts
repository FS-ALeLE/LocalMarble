import { sfx } from '../audio/sfx';
import { fetchLeaderboard } from '../services/api';
import { h } from '../ui/dom';
import { leaderboardView } from '../ui/leaderboardView';

export async function leaderboardScreen(stage: HTMLElement, myPlayId?: number): Promise<void> {
  const box = h('div', { class: 'lb-box' }, h('p', { class: 'lb-empty' }, '순위표를 불러오는 중…'));
  const next = h('button', { class: 'btn btn-primary big' }, '다음 친구 차례! 👋');
  stage.replaceChildren(h('div', { class: 'screen result-screen' },
    h('div', { class: 'panel lb-panel pop-in' }, box, h('div', { class: 'reg-nav center' }, next))));
  const data = await fetchLeaderboard(10);
  box.replaceChildren(data
    ? leaderboardView(data, { highlightId: myPlayId, playerRows: 10, affRows: 8 })
    : h('p', { class: 'lb-empty' }, '지금은 순위표를 불러올 수 없어요.'));
  return new Promise((resolve) => {
    const auto = window.setTimeout(() => next.click(), 60_000);
    next.addEventListener('click', () => { clearTimeout(auto); sfx.go(); resolve(); }, { once: true });
  });
}
