import { CONFIG } from '../config';

/** 아이가 자리를 떠나면 안내 후 처음 화면으로 돌아간다. */
export function startIdleWatch(onWarn: (show: boolean) => void, onReset: () => void): { pause(): void; resume(): void } {
  let last = Date.now();
  let warned = false;
  let active = false;
  const touch = () => {
    last = Date.now();
    if (warned) { warned = false; onWarn(false); }
  };
  for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, touch, { capture: true });
  setInterval(() => {
    if (!active) return;
    const idle = Date.now() - last;
    if (idle > CONFIG.idle.resetMs) onReset();
    else if (idle > CONFIG.idle.warnMs && !warned) { warned = true; onWarn(true); }
  }, 1000);
  return {
    pause: () => { active = false; if (warned) { warned = false; onWarn(false); } },
    resume: () => { active = true; touch(); },
  };
}
