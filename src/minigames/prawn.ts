import { sfx } from '../audio/sfx';
import { CONFIG } from '../config';
import { randInt } from '../core/random';
import type { Level } from '../core/types';
import { art, h } from '../ui/dom';
import { hudBar, intro, outro } from './common';

/** 대하 잡기: 바다에서 튀어 오르는 대하를 터치한다. */
export async function playPrawn(layer: HTMLElement, level: Level): Promise<boolean> {
  const { seconds, goal } = CONFIG.minigames.prawn;
  const need = goal[level];
  const field = h('div', { class: 'mg-field prawn-field' }, art('art/mg-sea.png', '', 'mg-bg'));
  const hud = hudBar();
  const root = h('div', { class: 'overlay dim' }, h('div', { class: 'mg-frame pop-in' }, hud.el, field));
  layer.append(root);

  await intro(field, '🦐', '대하 잡기!', `${seconds}초 안에 튀어 오르는 대하를 ${need}마리 잡아요!`);

  let caught = 0;
  const end = performance.now() + seconds * 1000;
  const W = 1200, H = 640;

  await new Promise<void>((resolve) => {
    const spawn = window.setInterval(() => {
      const startX = randInt(80, W - 80);
      const endX = Math.min(W - 60, Math.max(60, startX + randInt(-260, 260)));
      const peak = randInt(170, 380);
      const dur = randInt(1500, 2100);
      const prawn = h('button', { class: 'prawn' }, art('art/mg-prawn.png', '🦐', 'prawn-art'));
      prawn.style.left = `${startX}px`;
      field.append(prawn);
      const frames: Keyframe[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const x = (endX - startX) * t;
        const y = H + 40 - 4 * (40 + peak) * t * (1 - t);
        frames.push({ transform: `translate(${x}px, ${y}px) rotate(${(t - 0.5) * (endX > startX ? 160 : -160)}deg)` });
      }
      const anim = prawn.animate(frames, { duration: dur, easing: 'linear' });
      anim.finished.then(() => prawn.remove()).catch(() => undefined);
      prawn.addEventListener('pointerdown', () => {
        if (prawn.classList.contains('caught')) return;
        prawn.classList.add('caught');
        anim.pause();
        caught++;
        sfx.catch();
        prawn.classList.add('pop'); setTimeout(() => prawn.remove(), 300);
      });
    }, level === 'low' ? 650 : 600);

    const loop = () => {
      const left = (end - performance.now()) / 1000;
      hud.set(`🦐 ${caught} / ${need}마리 · ${Math.ceil(Math.max(0, left))}초`, left / seconds);
      if (left <= 0 || caught >= need) {
        clearInterval(spawn);
        field.querySelectorAll('.prawn').forEach((p) => p.remove());
        resolve();
      } else requestAnimationFrame(loop);
    };
    loop();
  });

  const success = caught >= need;
  await outro(field, success, success ? `대하를 ${caught}마리 잡았어요!` : `${caught}마리 잡았어요. 다음엔 꼭!`);
  root.remove();
  return success;
}
