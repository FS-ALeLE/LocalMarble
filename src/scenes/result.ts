import { sfx } from '../audio/sfx';
import { CONFIG } from '../config';
import type { PlayResult, Profile, RegionData } from '../core/types';
import type { EventInfo, Rank } from '../services/api';
import { h } from '../ui/dom';
import { emptyStampSvg, stampSvg } from '../ui/stamp';

export function gradeOf(score: number) {
  return CONFIG.grades.find((g) => score >= g.min) ?? CONFIG.grades[CONFIG.grades.length - 1];
}

/** 결과 화면. 'leaderboard'를 고르면 순위 화면으로 간다. */
export function resultScreen(stage: HTMLElement, data: RegionData, profile: Profile, result: PlayResult, event: EventInfo, rank: Promise<Rank | null>): Promise<'leaderboard' | 'next'> {
  return new Promise((resolve) => {
    const grade = gradeOf(result.score);
    const title = { finish: '🎉 완주 성공!', gameover: '하트를 다 썼어요', timeout: '탐험 시간이 끝났어요' }[result.outcome];
    const placeIds = [...new Set(data.board.tiles.filter((t) => t.place).map((t) => t.place!))];
    // 틀린 문제가 있으면 틀린 문제 해설을 먼저, 남는 자리는 최근에 맞힌 문제로 채운다.
    const wrong = result.learned.filter((l) => !l.correct);
    const right = result.learned.filter((l) => l.correct).reverse();
    const learned = [...wrong, ...right].slice(0, 3);

    const scoreEl = h('div', { class: 'result-score' }, '0');
    let auto = 0;
    const done = (to: 'leaderboard' | 'next') => { clearTimeout(auto); sfx.go(); resolve(to); };
    const next = h('button', { class: 'btn btn-primary big', onclick: () => done('next') }, '다음 친구 차례! 👋');
    const rankBtn = h('button', { class: 'btn btn-gold big', onclick: () => done('leaderboard') }, '🏆 순위 보기');
    const note = h('div', { class: 'result-note' }, event.active ? '기록을 저장하는 중…' : '연습 모드라 순위표에 기록되지 않았어요.');
    if (event.active) {
      void rank.then((r) => {
        note.replaceChildren(r
          ? h('span', {}, '🏆 ', h('b', { class: 'rank-big' }, `${r.total}명 중 ${r.rank}등!`))
          : h('span', {}, '📡 인터넷이 연결되면 기록이 자동으로 저장돼요.'));
        if (r && r.rank <= 3) sfx.fanfare();
      });
    }

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
            ? h('ul', { class: 'learned' }, ...learned.map((l) => h('li', { class: l.correct ? '' : 'wrong' },
                h('b', {}, l.correct ? '' : h('span', { class: 'learned-tag' }, '다시 알아봐요'), l.question),
                h('p', {}, l.correct ? l.explanation : `정답은 「${l.answer}」! ${l.explanation}`))))
            : h('p', { class: 'muted' }, '다음엔 퀴즈를 풀며 홍성 이야기를 모아 봐요!'),
          note,
          h('div', { class: 'reg-nav center gap' }, event.active ? rankBtn : null, next)))));

    if (result.outcome === 'finish' || grade === CONFIG.grades[0]) sfx.fanfare();
    const start = performance.now();
    const count = () => {
      const t = Math.min(1, (performance.now() - start) / 1200);
      scoreEl.textContent = Math.round(result.score * (1 - (1 - t) ** 3)).toLocaleString() + '점';
      if (t < 1) requestAnimationFrame(count);
    };
    count();
    auto = window.setTimeout(() => done('next'), 90_000);
  });
}
