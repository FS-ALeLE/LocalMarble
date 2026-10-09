import { shuffle } from './random';
import type { Category, Level, Question } from './types';

/**
 * 장소별 문항 더미.
 * - 장소가 지정된 문항(places)은 그 장소에서만, 지정이 없는 문항은 카테고리가 맞는 장소에서 나온다.
 * - 한 판 안에서는 같은 문항을 다시 내지 않는다(그 장소 문항을 다 쓰면 그때 다시 섞음).
 */
export class QuestionDeck {
  private questions: Question[];
  private piles = new Map<string, Question[]>();
  private used = new Set<string>();

  constructor(questions: Question[], level: Level) {
    this.questions = questions.filter((q) => q.level === level || q.level === 'both');
  }

  private poolFor(placeId: string, categories: Category[]): Question[] {
    return this.questions.filter((q) => (q.places ? q.places.includes(placeId) : categories.includes(q.category)));
  }

  draw(placeId: string, categories: Category[]): Question {
    let pile = this.piles.get(placeId) ?? [];
    pile = pile.filter((q) => !this.used.has(q.id));
    if (pile.length === 0) {
      const pool = this.poolFor(placeId, categories);
      const fresh = pool.filter((q) => !this.used.has(q.id));
      pile = shuffle(fresh.length ? fresh : pool.length ? pool : this.questions);
    }
    const q = pile.pop()!;
    this.piles.set(placeId, pile);
    this.used.add(q.id);
    return q;
  }
}
