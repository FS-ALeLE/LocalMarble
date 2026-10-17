import { sfx } from '../audio/sfx';
import { h } from './dom';

/** 왼쪽 위 '처음으로' 버튼 */
export function homeButton(onHome: () => void): HTMLElement {
  return h('button', { class: 'home-btn', onclick: () => { sfx.click(); onHome(); } }, '🏠 처음으로');
}
