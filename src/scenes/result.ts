import { sfx } from '../audio/sfx';
import { CONFIG } from '../config';
import type { PlayResult, Profile, RegionData } from '../core/types';
import type { EventInfo } from '../services/api';
import { h } from '../ui/dom';
import { emptyStampSvg, stampSvg } from '../ui/stamp';

export function gradeOf(score: number) {
  return CONFIG.grades.find((g) => score >= g.min) ?? CONFIG.grades[CONFIG.grades.length - 1];
}

export function resultScreen(stage: HTMLElement, data: RegionData, profile: Profile, result: PlayResult, event: EventInfo): Promise<void> {
  return new Promise((resolve) => {
    const grade = gradeOf(result.score);
    const title = { finish: '🎉 완주 성공!', gameover: '하트를 다 썼어요', timeout: '탐험 시간이 끝났어요' }[result.outcome];
    const placeIds = [...new Set(data.board.tiles.filter((t) => t.place).map((t) => t.place!))];
    const learned = result.learned.slice(-3);

    const scoreEl = h('div', { class: 'result-score' }, '0');
    const next = h('button', { class: 'btn btn-primary big', onclick: () => { sfx.go(); resolve(); } }, '다음 친구 차례! 👋');

    stage.replaceChildren(h('div', { class: 'screen result-screen' },
      h('div', { class: 'panel result-panel pop-in' },
        h('div', { class: 'result-left' },
          h('div', { class: 'result-title' }, title),
          h('div', { class: 'medal' }, grade.medal),
          h('div', { class: 'grade' }, grade.label),
          scoreEl,
          h('div', { class: 'result-who' }, `${profile.nickname} · ${profile.affiliationKey}`),
          h('div', { class: 'result-stats' },
            h('span', {}, `도장 ${result.stamps.length}개`), h('span', {}, `하트 ${result.livesLeft}개`), h('span', {}, `${result.turns}턴`)),
          h('div', { class: 'result-stamps' }, ...placeIds.map((id) =>
            h('div', { class: 'stamp-slot', html: result.stamps.includes(id) ? stampSvg(data.board.places[id].short, 58) : emptyStampSvg(58) })))),
        h('div', { class: 'result-right' },
          h('h3', {}, '📖 오늘 배운 홍성 이야기'),
          learned.length
            ? h('ul', { class: 'learned' }, ...learned.map((l) => h('li', {}, h('b', {}, l.question), h('p', {}, l.explanation))))
            : h('p', { class: 'muted' }, '다음엔 퀴즈를 풀며 홍성 이야기를 모아 봐요!'),
          h('div', { class: 'result-note' }, event.active ? '🏆 순위표에 기록되었어요!' : '연습 모드라 순위표에 기록되지 않았어요.'),
          h('div', { class: 'reg-nav center' }, next)))));

    if (result.outcome === 'finish' || grade === CONFIG.grades[0]) sfx.fanfare();
    const start = performance.now();
    const count = () => {
      const t = Math.min(1, (performance.now() - start) / 1200);
      scoreEl.textContent = Math.round(result.score * (1 - (1 - t) ** 3)).toLocaleString() + '점';
      if (t < 1) requestAnimationFrame(count);
    };
    count();
    const auto = window.setTimeout(() => next.click(), 90_000);
    next.addEventListener('click', () => clearTimeout(auto));
  });
}
