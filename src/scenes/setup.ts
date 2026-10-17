import { sfx } from '../audio/sfx';
import { LEVEL_LABEL, type Level, type Profile, type RegionData, type Setup } from '../core/types';
import { isEasyByDefault } from '../../api/_lib/grades';
import { art, h } from '../ui/dom';
import { homeButton } from '../ui/home';

/** 난이도·말 고르기. '처음으로'를 누르면 null */
export function setupScreen(stage: HTMLElement, data: RegionData, profile: Profile): Promise<Setup | null> {
  return new Promise((resolve) => {
    let level: Level = isEasyByDefault(profile.grade) ? 'low' : 'high';
    let piece = data.board.pieces[0];

    const levelBtns = (['low', 'high'] as Level[]).map((lv) =>
      h('button', { class: 'choice-card', onclick: () => { sfx.click(); level = lv; render(); } },
        h('div', { class: 'choice-icon' }, lv === 'low' ? '🌱' : '🌳'),
        h('div', { class: 'choice-title' }, LEVEL_LABEL[lv]),
        h('div', { class: 'choice-sub' }, lv === 'low' ? '처음 해 보는 친구 · 쉬운 문제' : '도전하고 싶은 친구 · 조금 어려운 문제')));
    const pieceBtns = data.board.pieces.map((p) =>
      h('button', { class: 'choice-card piece-card', onclick: () => { sfx.hop(); piece = p; render(); } },
        art(p.art, p.emoji, 'setup-piece-art'), h('div', { class: 'choice-title' }, p.name)));

    const render = () => {
      levelBtns.forEach((b, i) => b.classList.toggle('on', (i === 0 ? 'low' : 'high') === level));
      pieceBtns.forEach((b, i) => b.classList.toggle('on', data.board.pieces[i] === piece));
    };

    stage.replaceChildren(h('div', { class: 'screen setup-screen' }, homeButton(() => resolve(null)),
      h('div', { class: 'panel setup-panel' },
        h('h2', {}, `${profile.nickname}, 준비됐나요?`),
        h('h3', {}, '난이도'), h('div', { class: 'choice-row' }, ...levelBtns),
        h('h3', {}, '내 말 고르기'), h('div', { class: 'choice-row' }, ...pieceBtns),
        h('div', { class: 'reg-nav center' },
          h('button', { class: 'btn btn-primary big', onclick: () => { sfx.go(); resolve({ level, piece }); } }, '출발! 🚩')))));
    render();
  });
}
