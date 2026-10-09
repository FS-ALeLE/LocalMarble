import type { Level } from './core/types';

export const CONFIG = {
  lives: 3,
  turnLimit: 12,
  dice: { min: 1, max: 6 },
  stampsToFinish: 5,
  quizSeconds: { low: 20, high: 15 } as Record<Level, number>,
  score: {
    correct: 100,
    correctWithHint: 50,
    fastBonus: 30,
    minigame: 150,
    stamp: 50,
    finish: 300,
    lifeBonus: 100,
    chance: 50,
    fact: 20,
    restFull: 30,
  },
  /** quiz_or_minigame 칸에서 퀴즈가 나올 확률 */
  quizRatio: 0.7,
  grades: [
    { min: 1500, medal: '🥇', label: '홍성 박사' },
    { min: 800, medal: '🥈', label: '홍성 탐험가' },
    { min: 0, medal: '🥉', label: '홍성 새내기' },
  ],
  minigames: {
    prawn: {
      seconds: 20,
      goal: { low: 10, high: 13 } as Record<Level, number>,
      /** 한 마리가 튀어 올랐다 떨어지는 시간(ms) — 짧을수록 어려움 */
      flightMs: { low: [1200, 1700], high: [1000, 1450] } as Record<Level, [number, number]>,
      spawnMs: { low: 520, high: 460 } as Record<Level, number>,
      /** 대하가 아닌 것이 나올 확률 */
      decoyRatio: { low: 0.25, high: 0.33 } as Record<Level, number>,
      /** 잘못 눌렀을 때 멈추는 시간(ms) */
      stunMs: 1500,
    },
    memory: { seconds: { low: 50, high: 40 } as Record<Level, number>, pairs: 4 },
  },
  /** true면 검수 전(verified가 아닌) 문항도 출제한다. */
  allowUnverified: false,
  idle: { warnMs: 30_000, resetMs: 60_000 },
  region: 'hongseong',
};

export const REGION_BASE = `/regions/${CONFIG.region}/`;
