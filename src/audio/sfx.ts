// 효과음은 파일 없이 Web Audio로 합성한다.
let ctx: AudioContext | null = null;
let muted = false;

export function unlockAudio(): void {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'square', vol = 0.12, slideTo?: number): void {
  if (!ctx || muted) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(at: number, dur: number, vol = 0.2): void {
  if (!ctx || muted) return;
  const t = ctx.currentTime + at;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.buffer = buffer;
  src.connect(gain).connect(ctx.destination);
  src.start(t);
}

const notes = (list: number[], step: number, type: OscillatorType = 'square', vol = 0.1) =>
  list.forEach((f, i) => tone(f, i * step, step * 1.6, type, vol));

export const sfx = {
  click: () => tone(660, 0, 0.06, 'square', 0.06),
  diceTick: () => tone(300 + Math.random() * 300, 0, 0.04, 'square', 0.05),
  diceLand: () => { noise(0, 0.12, 0.25); tone(140, 0, 0.18, 'sine', 0.3, 60); },
  hop: () => tone(420, 0, 0.12, 'sine', 0.12, 840),
  correct: () => notes([784, 988, 1319], 0.08),
  wrong: () => { tone(220, 0, 0.18, 'sawtooth', 0.08); tone(160, 0.16, 0.3, 'sawtooth', 0.08); },
  stamp: () => { noise(0, 0.15, 0.35); tone(110, 0, 0.25, 'sine', 0.4, 50); },
  chance: () => notes([523, 659, 784, 1047, 784, 1047], 0.06, 'triangle', 0.12),
  heal: () => notes([523, 784, 1047], 0.1, 'triangle', 0.12),
  catch: () => tone(880, 0, 0.08, 'square', 0.07, 1320),
  flip: () => tone(500, 0, 0.05, 'triangle', 0.08, 700),
  tick: () => tone(1000, 0, 0.03, 'square', 0.04),
  ready: () => notes([392, 392], 0.18, 'square', 0.08),
  go: () => notes([784], 0.3, 'square', 0.1),
  fanfare: () => notes([523, 659, 784, 1047, 0, 784, 1047], 0.12, 'square', 0.1),
  gameover: () => notes([392, 330, 262, 196], 0.18, 'triangle', 0.12),
};
