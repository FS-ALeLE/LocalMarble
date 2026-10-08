import { sfx, unlockAudio } from '../audio/sfx';
import type { EventInfo } from '../services/api';
import { h } from '../ui/dom';
import { toggleFullscreen } from '../ui/stage';

export function titleScreen(stage: HTMLElement, event: EventInfo): Promise<void> {
  return new Promise((resolve) => {
    const spots = [[8, 22], [20, 68], [30, 12], [70, 14], [82, 66], [90, 26], [12, 82], [86, 84]];
    const floaters = ['🦐', '🏯', '⛰️', '🏺', '🦆', '⛵', '🎨', '📚']
      .map((e, i) => h('span', { class: 'floater', style: `--i:${i}; left:${spots[i][0]}%; top:${spots[i][1]}%` }, e));
    const fullBtn = h('button', { class: 'corner-btn', title: '전체 화면', onclick: (e: Event) => { e.stopPropagation(); toggleFullscreen(); } }, '⛶');
    const screen = h('div', { class: 'screen title-screen' },
      h('div', { class: 'floaters' }, ...floaters),
      h('div', { class: 'title-logo' },
        h('div', { class: 'logo-sub' }, '주사위를 굴려 홍성을 탐험해요!'),
        h('h1', { class: 'logo' },
          h('span', { class: 'logo-line1' }, '다 같이 돌자,'),
          h('span', { class: 'logo-line2' }, h('span', {}, '홍성'), ' ', h('span', { class: 'logo-go' }, '한 바퀴'))),
      ),
      h('div', { class: 'title-event' }, event.active ? `🏆 ${event.name ?? '오늘의 행사'} · 순위에 도전!` : '연습 모드 · 기록은 저장되지 않아요'),
      h('div', { class: 'press-start' }, '화면을 눌러 시작!'),
      fullBtn,
    );
    screen.addEventListener('click', () => {
      unlockAudio();
      sfx.go();
      resolve();
    }, { once: true });
    stage.replaceChildren(screen);
  });
}
