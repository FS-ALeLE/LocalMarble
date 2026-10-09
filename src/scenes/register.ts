import { sfx } from '../audio/sfx';
import { pick } from '../core/random';
import type { Profile, RegionData } from '../core/types';
import { registerPlayer, suggestAffiliations, type EventInfo } from '../services/api';
import { affiliationKey, affiliationProblem, nicknameProblem } from '../../api/_lib/filter';
import { h } from '../ui/dom';

const SOLO = '개인';

function recommendNickname(data: RegionData): string {
  for (let i = 0; i < 20; i++) {
    const name = pick(data.nicknames.adjectives) + pick(data.nicknames.nouns);
    if (name.length <= 8) return name;
  }
  return pick(data.nicknames.nouns);
}

/** 소속 → 별명 → 학년 → 확인 */
export function registerScreen(stage: HTMLElement, data: RegionData, event: EventInfo): Promise<Profile> {
  return new Promise((resolve) => {
    const profile = { affiliation: '', nickname: '', grade: undefined as number | undefined };
    const body = h('div', { class: 'reg-body' });
    const dots = [1, 2, 3, 4].map((n) => h('span', { class: 'reg-dot' }, String(n)));
    const panel = h('div', { class: 'panel reg-panel' }, h('div', { class: 'reg-steps' }, ...dots), body);
    stage.replaceChildren(h('div', { class: 'screen reg-screen' }, panel));

    const setStep = (n: number) => dots.forEach((d, i) => d.classList.toggle('on', i <= n));

    const nav = (onNext: () => void, onBack?: () => void, nextLabel = '다음') => {
      const next = h('button', { class: 'btn btn-primary', onclick: () => { sfx.click(); onNext(); } }, nextLabel);
      const back = onBack ? h('button', { class: 'btn btn-ghost', onclick: () => { sfx.click(); onBack(); } }, '← 이전') : h('span');
      return { el: h('div', { class: 'reg-nav' }, back, next), next };
    };

    const stepAffiliation = () => {
      setStep(0);
      const input = h('input', { class: 'text-input', maxlength: 20, placeholder: '예: 홍성초등학교', value: profile.affiliation === SOLO ? '' : profile.affiliation, autocomplete: 'off' });
      const msg = h('div', { class: 'reg-msg' });
      const chips = h('div', { class: 'chips' });
      const { el, next } = nav(() => {
        const problem = affiliationProblem(input.value);
        if (problem) { msg.textContent = problem; msg.classList.add('err'); sfx.wrong(); return; }
        profile.affiliation = input.value.trim();
        stepNickname();
      });
      let timer = 0;
      const update = () => {
        const key = affiliationKey(input.value);
        const problem = input.value.trim() ? affiliationProblem(input.value) : null;
        msg.classList.toggle('err', !!problem);
        msg.textContent = problem ?? '';
        next.toggleAttribute('disabled', !key || !!problem);
        clearTimeout(timer);
        timer = window.setTimeout(async () => {
          const list = await suggestAffiliations(input.value);
          chips.replaceChildren(...list.slice(0, 6).map((name) =>
            h('button', { class: 'chip', onclick: () => { input.value = name; update(); } }, name)));
        }, 250);
      };
      input.addEventListener('input', update);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') next.click(); });
      body.replaceChildren(
        h('h2', {}, '어디에서 왔나요?'),
        h('p', { class: 'reg-help' }, '다니는 학교나 함께 온 기관 이름을 쓰세요.'),
        input, msg, chips,
        h('button', { class: 'btn btn-soft solo-btn', onclick: () => { sfx.click(); profile.affiliation = SOLO; stepNickname(); } }, '🙋 소속 없이 개인으로 할래요'),
        el,
      );
      update();
      input.focus();
    };

    const stepNickname = () => {
      setStep(1);
      const input = h('input', { class: 'text-input', maxlength: 8, placeholder: '2~8글자', value: profile.nickname, autocomplete: 'off' });
      const msg = h('div', { class: 'reg-msg' });
      const { el, next } = nav(() => {
        const problem = nicknameProblem(input.value.trim());
        if (problem) { msg.textContent = problem; msg.classList.add('err'); sfx.wrong(); return; }
        profile.nickname = input.value.trim();
        stepGrade();
      }, stepAffiliation);
      const update = () => {
        const v = input.value.trim();
        const problem = v ? nicknameProblem(v) : null;
        msg.classList.toggle('err', !!problem);
        msg.textContent = problem ?? '⚠️ 진짜 이름은 쓰지 마세요!';
        next.toggleAttribute('disabled', !v || !!problem);
      };
      const dice = h('button', { class: 'btn btn-gold dice-name', onclick: () => { sfx.diceTick(); input.value = recommendNickname(data); update(); } }, '🎲 추천 별명');
      input.addEventListener('input', update);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') next.click(); });
      body.replaceChildren(
        h('h2', {}, '별명을 정해요'),
        h('p', { class: 'reg-help' }, '순위표에 보일 별명이에요. 고르기 어려우면 추천 별명을 눌러 보세요.'),
        h('div', { class: 'row' }, input, dice), msg, el,
      );
      update();
      input.focus();
    };

    const stepGrade = () => {
      setStep(2);
      const pickGrade = (g?: number) => { sfx.click(); profile.grade = g; stepConfirm(); };
      body.replaceChildren(
        h('h2', {}, '몇 학년인가요?'),
        h('p', { class: 'reg-help' }, '학년에 맞는 문제가 나와요.'),
        h('div', { class: 'grade-grid' }, ...[1, 2, 3, 4, 5, 6].map((g) =>
          h('button', { class: `btn grade-btn ${profile.grade === g ? 'on' : ''}`, onclick: () => pickGrade(g) }, `${g}학년`))),
        h('div', { class: 'reg-nav' },
          h('button', { class: 'btn btn-ghost', onclick: () => { sfx.click(); stepNickname(); } }, '← 이전'),
          h('button', { class: 'btn btn-soft', onclick: () => pickGrade(undefined) }, '말하지 않을래요')),
      );
    };

    const stepConfirm = () => {
      setStep(3);
      const key = profile.affiliation === SOLO ? SOLO : affiliationKey(profile.affiliation);
      const msg = h('div', { class: 'reg-msg err' });
      const ok = h('button', { class: 'btn btn-primary' }, '맞아요!');
      ok.addEventListener('click', async () => {
        sfx.click();
        const result: Profile = { affiliation: profile.affiliation, affiliationKey: key, nickname: profile.nickname, grade: profile.grade };
        if (event.active) {
          ok.disabled = true;
          ok.textContent = '등록하는 중…';
          const reg = await registerPlayer(result);
          if (reg.ok) {
            result.token = reg.data.token;
            result.nickname = reg.data.nickname;
          } else if (reg.status >= 400 && reg.status < 500 && reg.status !== 409) {
            // 서버가 별명·소속을 받아 주지 않음 → 다시 쓰게 한다.
            msg.textContent = reg.error;
            ok.disabled = false;
            ok.textContent = '맞아요!';
            sfx.wrong();
            return;
          }
          // 연결이 안 되면 그냥 진행하고, 결과를 낼 때 다시 등록한다.
        }
        sfx.go();
        resolve(result);
      });
      body.replaceChildren(
        h('h2', {}, '이렇게 맞나요?'),
        h('div', { class: 'name-card' },
          h('div', { class: 'name-card-nick' }, profile.nickname),
          h('div', { class: 'name-card-aff' }, `${key}${profile.grade ? ` · ${profile.grade}학년` : ''}`)),
        h('p', { class: 'reg-help small' }, event.active
          ? '별명과 소속이 오늘의 순위표에 보여요. 기록은 내일 지워져요.'
          : '지금은 연습 모드라 순위표에 기록되지 않아요.'),
        msg,
        h('div', { class: 'reg-nav' },
          h('button', { class: 'btn btn-ghost', onclick: () => { sfx.click(); stepAffiliation(); } }, '다시 쓸래요'),
          ok),
      );
    };

    stepAffiliation();
  });
}
