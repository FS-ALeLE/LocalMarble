import type { Level } from './core/types';

export const CONFIG = {
  lives: 3,
  turnLimit: 12,
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
    prawn: { seconds: 20, goal: { low: 8, high: 11 } as Record<Level, number> },
    memory: { seconds: { low: 50, high: 40 } as Record<Level, number>, pairs: 4 },
  },
  /** true면 검수 전(verified가 아닌) 문항도 출제한다. */
  allowUnverified: false,
  idle: { warnMs: 30_000, resetMs: 60_000 },
  region: 'hongseong',
};

export const REGION_BASE = `/regions/${CONFIG.region}/`;
