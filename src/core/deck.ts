import { shuffle } from './random';
import type { Category, Level, Question } from './types';

/** 카테고리별로 섞은 문항 더미. 한 판 안에서는 같은 문항을 다시 내지 않는다(다 쓰면 다시 섞음). */
export class QuestionDeck {
  private pools = new Map<Category, Question[]>();
  private piles = new Map<Category, Question[]>();

  constructor(questions: Question[], level: Level) {
    for (const q of questions) {
      if (q.level !== level && q.level !== 'both') continue;
      const pool = this.pools.get(q.category) ?? [];
      pool.push(q);
      this.pools.set(q.category, pool);
    }
  }

  draw(categories: Category[]): Question {
    const available = shuffle(categories.filter((c) => this.pools.has(c)));
    const category = available[0] ?? shuffle([...this.pools.keys()])[0];
    let pile = this.piles.get(category);
    if (!pile || pile.length === 0) {
      pile = shuffle(this.pools.get(category)!);
      this.piles.set(category, pile);
    }
    return pile.pop()!;
  }
}
