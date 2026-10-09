import { sfx } from '../audio/sfx';
import { CONFIG } from '../config';
import { pick, randInt } from '../core/random';
import type { Level } from '../core/types';
import { art, h } from '../ui/dom';
import { hudBar, intro, outro } from './common';

// 대하가 아닌 것: 누르면 잠깐 멈춘다.
const DECOYS = [
  { emoji: '🦀', name: '꽃게' },
  { emoji: '🐟', name: '물고기' },
  { emoji: '🪼', name: '해파리' },
  { emoji: '🥫', name: '쓰레기' },
];

/** 대하 잡기: 튀어 오르는 대하만 터치한다. 다른 것을 누르면 잠시 멈춤. */
export async function playPrawn(layer: HTMLElement, level: Level): Promise<boolean> {
  const cfg = CONFIG.minigames.prawn;
  const need = cfg.goal[level];
  const field = h('div', { class: 'mg-field prawn-field' }, art('art/mg-sea.webp', '', 'mg-bg'));
  const hud = hudBar();
  const root = h('div', { class: 'overlay dim' }, h('div', { class: 'mg-frame pop-in' }, hud.el, field));
  layer.append(root);

  await intro(field, '🦐', '대하 잡기!', `${cfg.seconds}초 안에 대하를 ${need}마리 잡아요! 꽃게·물고기·쓰레기는 누르면 잠깐 멈춰요.`);

  let caught = 0;
  let stunnedUntil = 0;
  const end = performance.now() + cfg.seconds * 1000;
  const W = 1200, H = 640;
  const [minDur, maxDur] = cfg.flightMs[level];

  await new Promise<void>((resolve) => {
    const spawn = window.setInterval(() => {
      const decoy = Math.random() < cfg.decoyRatio[level] ? pick(DECOYS) : null;
      const startX = randInt(80, W - 80);
      const endX = Math.min(W - 60, Math.max(60, startX + randInt(-300, 300)));
      const peak = randInt(170, 400);
      const dur = randInt(minDur, maxDur);
      const item = h('button', { class: `prawn ${decoy ? 'decoy' : ''}` },
        decoy ? art(undefined, decoy.emoji, 'prawn-art') : art('art/mg-prawn.webp', '🦐', 'prawn-art'));
      item.style.left = `${startX}px`;
      field.append(item);
      const frames: Keyframe[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const x = (endX - startX) * t;
        const y = H + 40 - 4 * (40 + peak) * t * (1 - t);
        frames.push({ transform: `translate(${x}px, ${y}px) rotate(${(t - 0.5) * (endX > startX ? 160 : -160)}deg)` });
      }
      const anim = item.animate(frames, { duration: dur, easing: 'linear' });
      anim.finished.then(() => item.remove()).catch(() => undefined);
      item.addEventListener('pointerdown', () => {
        if (item.classList.contains('caught') || performance.now() < stunnedUntil) return;
        if (decoy) {
          // 잘못 누름: 잠깐 멈춤
          item.classList.add('caught', 'hit');
          stunnedUntil = performance.now() + cfg.stunMs;
          sfx.wrong();
          field.classList.add('stunned');
          const msg = h('div', { class: 'stun-msg' }, `앗, ${decoy.name}예요! 잠깐 멈춰요`);
          field.append(msg);
          setTimeout(() => { field.classList.remove('stunned'); msg.remove(); }, cfg.stunMs);
          return;
        }
        item.classList.add('caught', 'pop');
        anim.pause();
        caught++;
        sfx.catch();
        setTimeout(() => item.remove(), 300);
      });
    }, cfg.spawnMs[level]);

    const loop = () => {
      const left = (end - performance.now()) / 1000;
      hud.set(`🦐 ${caught} / ${need}마리 · ${Math.ceil(Math.max(0, left))}초`, left / cfg.seconds);
      if (left <= 0 || caught >= need) {
        clearInterval(spawn);
        field.querySelectorAll('.prawn, .stun-msg').forEach((p) => p.remove());
        field.classList.remove('stunned');
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
