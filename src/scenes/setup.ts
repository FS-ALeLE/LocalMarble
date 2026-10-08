import { sfx } from '../audio/sfx';
import type { Level, Profile, RegionData, Setup } from '../core/types';
import { art, h } from '../ui/dom';

export function setupScreen(stage: HTMLElement, data: RegionData, profile: Profile): Promise<Setup> {
  return new Promise((resolve) => {
    let level: Level = profile.grade && profile.grade >= 4 ? 'high' : 'low';
    let piece = data.board.pieces[0];

    const levelBtns = (['low', 'high'] as Level[]).map((lv) =>
      h('button', { class: 'choice-card', onclick: () => { sfx.click(); level = lv; render(); } },
        h('div', { class: 'choice-icon' }, lv === 'low' ? '🌱' : '🌳'),
        h('div', { class: 'choice-title' }, lv === 'low' ? '저학년' : '고학년'),
        h('div', { class: 'choice-sub' }, lv === 'low' ? '1~3학년 · 쉬운 문제' : '4~6학년 · 도전 문제')));
    const pieceBtns = data.board.pieces.map((p) =>
      h('button', { class: 'choice-card piece-card', onclick: () => { sfx.hop(); piece = p; render(); } },
        art(p.art, p.emoji, 'piece-art'), h('div', { class: 'choice-title' }, p.name)));

    const render = () => {
      levelBtns.forEach((b, i) => b.classList.toggle('on', (i === 0 ? 'low' : 'high') === level));
      pieceBtns.forEach((b, i) => b.classList.toggle('on', data.board.pieces[i] === piece));
    };

    stage.replaceChildren(h('div', { class: 'screen setup-screen' },
      h('div', { class: 'panel setup-panel' },
        h('h2', {}, `${profile.nickname}, 준비됐나요?`),
        h('h3', {}, '난이도'), h('div', { class: 'choice-row' }, ...levelBtns),
        h('h3', {}, '내 말 고르기'), h('div', { class: 'choice-row' }, ...pieceBtns),
        h('div', { class: 'reg-nav center' },
          h('button', { class: 'btn btn-primary big', onclick: () => { sfx.go(); resolve({ level, piece }); } }, '출발! 🚩')))));
    render();
  });
}
