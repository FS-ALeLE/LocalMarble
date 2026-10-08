import { REGION_BASE } from '../config';

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = String(value);
    else if (key === 'html') el.innerHTML = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** AI 생성 그림이 있으면 그림을, 아직 없으면 이모지를 보여 준다. */
export function art(src: string | undefined, emoji: string, className = ''): HTMLElement {
  const box = h('span', { class: `art ${className}` }, h('span', { class: 'art-emoji' }, emoji));
  if (src) {
    const img = new Image();
    img.alt = '';
    img.draggable = false;
    img.onload = () => box.replaceChildren(img);
    img.src = REGION_BASE + src;
  }
  return box;
}

/** 버튼 하나를 누를 때까지 기다린다. */
export function waitClick(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => el.addEventListener('click', () => resolve(), { once: true }));
}

export function animate(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  return el.animate(keyframes, options).finished.then(() => undefined);
}
