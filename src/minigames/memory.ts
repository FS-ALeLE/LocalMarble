import { sfx } from '../audio/sfx';
import { CONFIG } from '../config';
import { shuffle } from '../core/random';
import type { Level } from '../core/types';
import { art, h, wait } from '../ui/dom';
import { hudBar, intro, outro } from './common';

const FACES = [
  { art: 'art/mg-card-1.png', emoji: '🏺', name: '새우젓 항아리' },
  { art: 'art/mg-card-2.png', emoji: '🌾', name: '억새' },
  { art: 'art/mg-card-3.png', emoji: '🏯', name: '조양문' },
  { art: 'art/mg-card-4.png', emoji: '🍙', name: '광천 김' },
];

/** 같은 그림 찾기: 카드를 뒤집어 짝을 맞춘다. */
export async function playMemory(layer: HTMLElement, level: Level): Promise<boolean> {
  const seconds = CONFIG.minigames.memory.seconds[level];
  const pairs = CONFIG.minigames.memory.pairs;
  const deck = shuffle([...FACES.slice(0, pairs), ...FACES.slice(0, pairs)]);
  const grid = h('div', { class: 'memory-grid' });
  const field = h('div', { class: 'mg-field memory-field' }, grid);
  const hud = hudBar();
  const root = h('div', { class: 'overlay dim' }, h('div', { class: 'mg-frame pop-in' }, hud.el, field));
  layer.append(root);

  await intro(field, '🎨', '같은 그림 찾기!', `${seconds}초 안에 같은 그림 ${pairs}쌍을 모두 찾아요!`);

  let open: { card: HTMLElement; face: (typeof FACES)[number] }[] = [];
  let matched = 0;
  let busy = false;

  const cards = deck.map((face) => {
    const card = h('button', { class: 'mem-card' },
      h('div', { class: 'mem-inner' },
        h('div', { class: 'mem-back' }, art('art/mg-card-back.png', '❓', 'mem-art')),
        h('div', { class: 'mem-front' }, art(face.art, face.emoji, 'mem-art'), h('div', { class: 'mem-name' }, face.name))));
    card.addEventListener('click', async () => {
      if (busy || card.classList.contains('flipped')) return;
      sfx.flip();
      card.classList.add('flipped');
      open.push({ card, face });
      if (open.length < 2) return;
      const [a, b] = open;
      open = [];
      if (a.face === b.face) {
        matched++;
        sfx.catch();
        a.card.classList.add('matched');
        b.card.classList.add('matched');
      } else {
        busy = true;
        await wait(700);
        a.card.classList.remove('flipped');
        b.card.classList.remove('flipped');
        busy = false;
      }
    });
    return card;
  });
  grid.replaceChildren(...cards);

  const end = performance.now() + seconds * 1000;
  await new Promise<void>((resolve) => {
    const loop = () => {
      const left = (end - performance.now()) / 1000;
      hud.set(`🃏 ${matched} / ${pairs}쌍 · ${Math.ceil(Math.max(0, left))}초`, left / seconds);
      if (left <= 0 || matched >= pairs) resolve();
      else requestAnimationFrame(loop);
    };
    loop();
  });
  await wait(400);
  const success = matched >= pairs;
  await outro(field, success, success ? '모든 짝을 찾았어요! 이응노 화가도 칭찬해요.' : `${matched}쌍을 찾았어요. 아깝다!`);
  root.remove();
  return success;
}
