export type Level = 'low' | 'high';

export const LEVEL_LABEL: Record<Level, string> = { low: '쉬움', high: '보통' };
export type Category = 'history' | 'people' | 'safety' | 'specialty' | 'nature' | 'society' | 'environment';

export interface Question {
  id: string;
  category: Category;
  level: Level | 'both';
  type: 'ox' | 'choice' | 'photo';
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  image?: string;
  source?: string;
  verified: boolean;
  /** 이 장소들에서만 출제 (없으면 카테고리가 맞는 곳 어디서나) */
  places?: string[];
}

export interface Place {
  name: string;
  short: string;
  emoji: string;
  art?: string;
  categories: Category[];
  mode: 'quiz' | 'minigame' | 'quiz_or_minigame';
  minigames?: MinigameId[];
}

export type MinigameId = 'prawn' | 'memory';

export interface Tile {
  id: number;
  type: 'start' | 'place' | 'chance' | 'rest';
  x: number;
  y: number;
  next: number[];
  place?: string;
  /** 이름표 위치 (기본: 아래) */
  label?: 'left' | 'right';
}

export interface Piece {
  id: string;
  name: string;
  emoji: string;
  art?: string;
}

export type Mood = 'normal' | 'think' | 'happy' | 'sad' | 'surprised';

export interface Guide {
  name: string;
  emoji: string;
  art: Record<Mood, string>;
}

export interface Board {
  width: number;
  height: number;
  start: number;
  places: Record<string, Place>;
  tiles: Tile[];
  forks: Record<string, string[]>;
  pieces: Piece[];
  /** 안내 캐릭터들 (판마다 한 명이 안내) */
  guides: Guide[];
  startArt?: string;
  restArt?: string;
  chanceArt?: string;
  mapArt?: string;
}

export interface RegionData {
  board: Board;
  questions: Question[];
  facts: string[];
  nicknames: { adjectives: string[]; nouns: string[] };
}

export interface Profile {
  affiliation: string;
  affiliationKey: string;
  nickname: string;
  grade?: number;
  /** 서버 등록 후 받은 플레이 토큰 (연습 모드나 오프라인이면 없음) */
  token?: string;
}

export interface Setup {
  level: Level;
  piece: Piece;
}

export interface PlayResult {
  outcome: 'finish' | 'gameover' | 'timeout';
  score: number;
  stamps: string[];
  /** 이 판의 오늘의 도장 장소 */
  targets: string[];
  livesLeft: number;
  turns: number;
  durationSec: number;
  learned: { question: string; explanation: string; correct: boolean; answer: string }[];
  answered: { id: string; correct: boolean }[];
}

export const CATEGORY_LABEL: Record<Category, string> = {
  history: '역사',
  people: '인물',
  safety: '안전',
  specialty: '특산물',
  nature: '자연',
  society: '우리 고장',
  environment: '환경',
};
