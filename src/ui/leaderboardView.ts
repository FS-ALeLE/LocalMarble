import type { Leaderboard } from '../services/api';
import { h } from './dom';

const MEDALS = ['🥇', '🥈', '🥉'];

/** 개인 순위 + 소속 대항전 표 (게임 안 순위 화면과 전광판에서 함께 사용) */
export function leaderboardView(data: Leaderboard, opts: { highlightId?: number; playerRows: number; affRows: number; fresh?: Set<number> }): HTMLElement {
  const players = data.players.slice(0, opts.playerRows);
  const affs = data.affiliations.slice(0, opts.affRows);
  const rankCell = (i: number) => h('span', { class: 'lb-rank' }, MEDALS[i] ?? String(i + 1));
  return h('div', { class: 'lb' },
    h('section', { class: 'lb-col lb-players' },
      h('h3', {}, '🏆 탐험왕 순위', h('small', {}, `${data.total}명 참여`)),
      players.length
        ? h('ol', {}, ...players.map((p, i) => h('li', { class: `${p.id === opts.highlightId ? 'me' : ''} ${opts.fresh?.has(p.id) ? 'fresh' : ''}` },
            rankCell(i),
            h('span', { class: 'lb-name' }, p.nickname, h('small', {}, p.affiliation)),
            h('span', { class: 'lb-stamps' }, p.outcome === 'finish' ? '🚩' : '', `도장 ${p.stamps}`),
            h('span', { class: 'lb-score' }, p.score.toLocaleString()))))
        : h('p', { class: 'lb-empty' }, '첫 번째 탐험가가 되어 보세요!')),
    h('section', { class: 'lb-col lb-affs' },
      h('h3', {}, '🏫 소속 대항전', h('small', {}, '상위 5명 평균')),
      affs.length
        ? h('ol', {}, ...affs.map((a, i) => h('li', {},
            rankCell(i),
            h('span', { class: 'lb-name' }, a.affiliation, h('small', {}, `${a.players}명`)),
            h('span', { class: 'lb-score' }, a.score.toLocaleString()))))
        : h('p', { class: 'lb-empty' }, '같은 소속에서 3명 이상 참여하면 순위에 올라요!')));
}
