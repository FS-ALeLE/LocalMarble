export type Level = 'low' | 'high';
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
}

export interface Place {
  name: string;
  short: string;
  emoji: string;
  art?: string;
  categories: Category[];
  mode: 'quiz' | 'minigame' | 'quiz_or_minigame';
  minigame?: MinigameId;
}

export type MinigameId = 'prawn' | 'memory';

export interface Tile {
  id: number;
  type: 'start' | 'place' | 'chance' | 'rest';
  x: number;
  y: number;
  next: number[];
  place?: string;
}

export interface Piece {
  id: string;
  name: string;
  emoji: string;
  art?: string;
}

export interface Board {
  width: number;
  height: number;
  start: number;
  places: Record<string, Place>;
  tiles: Tile[];
  forks: Record<string, string[]>;
  pieces: Piece[];
  guide: { name: string; emoji: string; art: Record<'normal' | 'happy' | 'sad' | 'think', string> };
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
  livesLeft: number;
  turns: number;
  durationSec: number;
  learned: { question: string; explanation: string }[];
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
