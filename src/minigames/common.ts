import { sfx } from '../audio/sfx';
import { h, wait } from '../ui/dom';

/** 미니게임 시작 안내 → 3·2·1 */
export async function intro(root: HTMLElement, icon: string, title: string, rule: string): Promise<void> {
  const box = h('div', { class: 'mg-intro pop-in' }, h('div', { class: 'mg-icon' }, icon), h('h2', {}, title), h('p', {}, rule));
  root.append(box);
  await wait(1800);
  for (const n of ['3', '2', '1']) {
    box.replaceChildren(h('div', { class: 'countdown' }, n));
    sfx.tick();
    await wait(600);
  }
  box.remove();
}

export async function outro(root: HTMLElement, success: boolean, detail: string): Promise<void> {
  if (success) sfx.fanfare(); else sfx.wrong();
  const box = h('div', { class: `mg-intro pop-in ${success ? 'ok' : 'no'}` },
    h('div', { class: 'mg-icon' }, success ? '🎉' : '😢'),
    h('h2', {}, success ? '성공!' : '아쉬워요!'),
    h('p', {}, detail));
  root.append(box);
  await wait(1800);
}

export function hudBar(): { el: HTMLElement; set(text: string, ratio: number): void } {
  const text = h('div', { class: 'mg-hud-text' });
  const fill = h('div', { class: 'mg-time-fill' });
  const el = h('div', { class: 'mg-hud' }, text, h('div', { class: 'mg-time' }, fill));
  return { el, set: (t, r) => { text.textContent = t; fill.style.transform = `scaleX(${Math.max(0, r)})`; } };
}
