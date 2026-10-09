import { sfx } from '../audio/sfx';
import { REGION_BASE } from '../config';
import { shuffle } from '../core/random';
import { CATEGORY_LABEL, type Board, type Place, type Question } from '../core/types';
import { art, h } from '../ui/dom';

export interface QuizOutcome {
  correct: boolean;
  usedHint: boolean;
  fast: boolean;
}

interface QuizOptions {
  place: Place;
  guide: Board['guide'];
  seconds: number;
  hintAvailable: boolean;
  draft: boolean;
}

/** 퀴즈 카드를 띄우고, 답을 고르고 해설까지 본 뒤 결과를 돌려준다. */
export function runQuiz(layer: HTMLElement, q: Question, opt: QuizOptions): Promise<QuizOutcome> {
  return new Promise((resolve) => {
    const isOx = q.type === 'ox';
    // 보기 순서는 매번 섞는다(OX는 O가 항상 왼쪽).
    const order = isOx ? [0, 1] : shuffle(q.choices.map((_, i) => i));
    let usedHint = false;
    let done = false;
    const started = performance.now();

    const guideBox = h('div', { class: 'quiz-guide' }, art(opt.guide.art.think, opt.guide.emoji, 'guide-art'));
    const setGuide = (mood: 'normal' | 'happy' | 'sad' | 'think') => guideBox.replaceChildren(art(opt.guide.art[mood], opt.guide.emoji, `guide-art mood-${mood}`));

    const timerFill = h('div', { class: 'timer-fill' });
    const timerText = h('div', { class: 'timer-text' }, String(opt.seconds));
    const choiceBtns = order.map((idx, n) => {
      const label = q.choices[idx];
      const btn = h('button', { class: `answer-btn ${isOx ? (idx === 0 ? 'ox-o' : 'ox-x') : ''}`, 'data-idx': idx, onclick: () => answer(idx) },
        isOx ? h('span', { class: 'ox-mark' }, label === 'O' ? '⭕' : '❌') : h('span', { class: 'answer-num' }, String(n + 1)),
        isOx ? null : h('span', { class: 'answer-label' }, label));
      return btn;
    });
    const hintBtn = h('button', { class: 'btn btn-gold hint-btn', onclick: () => useHint() }, '💡 힌트 (1번)');
    if (isOx || !opt.hintAvailable) hintBtn.style.visibility = 'hidden';

    const card = h('div', { class: 'quiz-card pop-in' },
      h('div', { class: 'quiz-head' },
        h('span', { class: 'quiz-place' }, `${opt.place.emoji} ${opt.place.name}`),
        h('span', { class: 'quiz-cat' }, CATEGORY_LABEL[q.category]),
        opt.draft && !q.verified ? h('span', { class: 'quiz-draft' }, '검수 전') : null,
        h('div', { class: 'timer' }, timerFill, timerText)),
      h('div', { class: 'quiz-main' },
        guideBox,
        h('div', { class: 'quiz-qbox' },
          h('div', { class: 'bubble' }, q.question),
          q.image ? photoFrame(REGION_BASE + q.image) : null)),
      h('div', { class: `answers ${isOx ? 'answers-ox' : ''} ${q.image ? 'answers-compact' : ''}` }, ...choiceBtns),
      h('div', { class: 'quiz-foot' }, hintBtn, h('span', { class: 'key-help' }, isOx ? '키보드 O / X' : '키보드 1 ~ 4')),
    );
    const overlay = h('div', { class: 'overlay dim' }, card);
    layer.append(overlay);

    timerFill.style.transition = `transform ${opt.seconds}s linear`;
    requestAnimationFrame(() => requestAnimationFrame(() => { timerFill.style.transform = 'scaleX(0)'; }));
    let remain = opt.seconds;
    const tick = window.setInterval(() => {
      remain--;
      timerText.textContent = String(Math.max(0, remain));
      if (remain <= 5 && remain > 0) { sfx.tick(); timerText.classList.add('hurry'); }
      if (remain <= 0) answer(-1);
    }, 1000);

    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      const k = e.key.toLowerCase();
      if (isOx && (k === 'o' || k === 'x')) answer(k === 'o' ? 0 : 1);
      const n = Number(k);
      if (!isOx && n >= 1 && n <= order.length) {
        const btn = choiceBtns[n - 1];
        if (!btn.disabled) answer(order[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);

    function useHint() {
      if (usedHint) return;
      usedHint = true;
      sfx.click();
      const wrong = choiceBtns.filter((b) => Number(b.dataset.idx) !== q.answer);
      const btn = shuffle(wrong)[0];
      btn.disabled = true;
      btn.classList.add('removed');
      hintBtn.disabled = true;
    }

    function answer(idx: number) {
      if (done) return;
      done = true;
      clearInterval(tick);
      window.removeEventListener('keydown', onKey);
      timerFill.style.transform = getComputedStyle(timerFill).transform;
      timerFill.style.transition = 'none';
      const elapsed = (performance.now() - started) / 1000;
      const correct = idx === q.answer;
      const fast = correct && elapsed <= opt.seconds / 2;
      choiceBtns.forEach((b) => {
        const i = Number(b.dataset.idx);
        b.disabled = true;
        if (i === q.answer) b.classList.add('is-answer');
        else if (i === idx) b.classList.add('is-wrong');
      });
      if (correct) { sfx.correct(); setGuide('happy'); card.classList.add('glow'); }
      else { sfx.wrong(); setGuide('sad'); card.classList.add('shake'); }

      const verdict = correct ? '⭕ 정답이에요!' : idx === -1 ? '⏰ 시간이 다 됐어요' : '❌ 아쉬워요!';
      const cont = h('button', { class: 'btn btn-primary' }, '계속하기 ▶');
      const explain = h('div', { class: `explain ${correct ? 'ok' : 'no'}` },
        h('div', { class: 'explain-verdict' }, verdict),
        h('div', { class: 'explain-text' }, correct ? q.explanation : `정답은 「${q.choices[q.answer]}」! ${q.explanation}`),
        q.source && q.source !== '검수 필요' ? h('div', { class: 'explain-src' }, `출처: ${q.source}`) : null,
        cont);
      hintBtn.replaceWith(explain);
      const finish = () => {
        clearTimeout(auto);
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 250);
        resolve({ correct, usedHint, fast });
      };
      const auto = window.setTimeout(finish, 15000);
      cont.addEventListener('click', () => { sfx.click(); finish(); }, { once: true });
    }
  });
}

/** 비율이 제각각인 사진도 잘리지 않게: 같은 사진을 흐리게 깔고 그 위에 사진 전체를 보여 준다. 누르면 크게 보기. */
function photoFrame(src: string): HTMLElement {
  const frame = h('button', { class: 'quiz-photo', 'aria-label': '사진 크게 보기' },
    h('img', { class: 'quiz-photo-bg', src, alt: '' }),
    h('img', { class: 'quiz-photo-img', src, alt: '' }),
    h('span', { class: 'quiz-photo-zoom' }, '🔍'));
  frame.addEventListener('click', () => {
    const big = h('div', { class: 'photo-zoom' }, h('img', { src, alt: '' }), h('p', {}, '화면을 누르면 닫혀요'));
    big.addEventListener('click', () => big.remove());
    frame.closest('.overlay')?.append(big);
  });
  return frame;
}
