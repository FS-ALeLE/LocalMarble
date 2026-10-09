import { sfx } from '../audio/sfx';
import { CONFIG, REGION_BASE } from '../config';
import { QuestionDeck } from '../core/deck';
import { pick, randInt } from '../core/random';
import { CATEGORY_LABEL, type Place, type PlayResult, type Profile, type RegionData, type Setup, type Tile } from '../core/types';
import { playMemory } from '../minigames/memory';
import { playPrawn } from '../minigames/prawn';
import { animate, art, h, wait } from '../ui/dom';
import { mapSvg } from '../ui/mapArt';
import { emptyStampSvg, stampSvg } from '../ui/stamp';
import { STAGE_H, STAGE_W } from '../ui/stage';
import { runQuiz } from './quiz';

const PIECE_LIFT = 34; // 말이 칸 위에 서 있는 높이

export async function playBoard(stage: HTMLElement, data: RegionData, profile: Profile, setup: Setup): Promise<PlayResult> {
  const { board } = data;
  const deck = new QuestionDeck(data.questions, setup.level);
  const placeIds = [...new Set(board.tiles.filter((t) => t.place).map((t) => t.place!))];
  const S = CONFIG.score;

  const state = {
    pos: board.start,
    lives: CONFIG.lives,
    score: 0,
    stamps: new Set<string>(),
    turn: 1,
    hintUsed: false,
    extraRoll: false,
    learned: [] as PlayResult['learned'],
    answered: [] as PlayResult['answered'],
    started: performance.now(),
  };

  // ---------- 화면 구성 ----------
  const map = h('div', { class: 'map', html: mapSvg(board) });
  map.style.width = `${board.width}px`;
  map.style.height = `${board.height}px`;
  if (board.mapArt) {
    const img = new Image();
    img.className = 'map-art';
    img.onload = () => map.prepend(img);
    img.src = REGION_BASE + board.mapArt;
  }

  const tileEls = new Map<number, HTMLElement>();
  for (const tile of board.tiles) {
    const el = h('div', { class: `tile tile-${tile.type}` }, h('div', { class: 'tile-base' }));
    el.style.left = `${tile.x}px`;
    el.style.top = `${tile.y}px`;
    if (tile.type === 'place' && tile.place) {
      const p = board.places[tile.place];
      el.append(art(p.art, p.emoji, 'bld'), h('div', { class: 'tile-name' }, p.name));
    } else if (tile.type === 'start') {
      el.append(art(board.startArt, '🏯', 'bld bld-start'), h('div', { class: 'tile-name start-name' }, '조양문 · 출발/골인'));
    } else if (tile.type === 'chance') {
      el.append(art(board.chanceArt, '🎁', 'bld bld-small'), h('div', { class: 'tile-name small' }, '찬스'));
    } else {
      el.append(art(board.restArt, '🌳', 'bld bld-small'), h('div', { class: 'tile-name small' }, '쉼터'));
    }
    tileEls.set(tile.id, el);
    map.append(el);
  }
  const piece = h('div', { class: 'piece' }, h('div', { class: 'piece-shadow' }), art(setup.piece.art, setup.piece.emoji, 'piece-art'));
  map.append(piece);
  placePiece(board.tiles[state.pos]);

  const camera = h('div', { class: 'camera' }, map);
  const hearts = h('div', { class: 'hearts' });
  const scoreEl = h('div', { class: 'score' }, '0');
  const turnEl = h('div', { class: 'turn' });
  const stampSlots = placeIds.map((id) => h('div', { class: 'stamp-slot', title: board.places[id].name, html: emptyStampSvg(54) }));
  const stampCount = h('div', { class: 'stamp-count' });
  const hud = h('div', { class: 'hud' },
    h('div', { class: 'hud-card hud-player' },
      art(setup.piece.art, setup.piece.emoji, 'hud-piece'),
      h('div', {}, h('div', { class: 'hud-nick' }, profile.nickname), h('div', { class: 'hud-aff' }, `${profile.affiliationKey} · ${setup.level === 'low' ? '저학년' : '고학년'}`))),
    h('div', { class: 'hud-card hud-stamps' }, stampCount, h('div', { class: 'stamp-row' }, ...stampSlots)),
    h('div', { class: 'hud-card hud-status' }, hearts, h('div', { class: 'hud-score' }, h('span', {}, '점수'), scoreEl), turnEl));

  const die = h('div', { class: 'die' });
  const diceBtn = h('button', { class: 'dice-btn' }, die, h('div', { class: 'dice-label' }, '주사위 굴리기'));
  const fx = h('div', { class: 'fx-layer' });
  const layer = h('div', { class: 'overlay-layer' });
  stage.replaceChildren(h('div', { class: 'screen board-screen' }, camera, hud, diceBtn, fx, layer));
  setDie(1);
  updateHud();

  // ---------- 진행 ----------
  await banner('READY?', 700, sfx.ready);
  await banner('GO!', 600, sfx.go);

  let outcome: PlayResult['outcome'] = 'timeout';
  game: for (;;) {
    updateHud();
    const roll = await rollDice();
    let steps = roll;
    while (steps > 0) {
      const here = board.tiles[state.pos];
      const nextId = here.next.length > 1 ? await chooseFork(here, steps) : here.next[0];
      await hopTo(board.tiles[nextId]);
      state.pos = nextId;
      steps--;
      if (board.tiles[state.pos].type === 'start' && state.stamps.size >= CONFIG.stampsToFinish) {
        outcome = 'finish';
        break game;
      }
    }
    await resolveTile(board.tiles[state.pos]);
    updateHud();
    if (state.lives <= 0) { outcome = 'gameover'; break; }
    if (state.extraRoll) { state.extraRoll = false; continue; }
    if (state.turn >= CONFIG.turnLimit) { outcome = 'timeout'; break; }
    state.turn++;
  }

  if (outcome === 'finish') {
    sfx.fanfare();
    const bonus = S.finish + state.lives * S.lifeBonus;
    await focus(board.tiles[board.start], 1.5);
    addScore(bonus, board.tiles[board.start]);
    confetti();
    await banner('완주!', 1600);
  } else if (outcome === 'gameover') {
    sfx.gameover();
    await banner('GAME OVER', 1600);
  } else {
    sfx.gameover();
    await banner('시간 끝!', 1400);
  }
  updateHud();

  return {
    outcome,
    score: state.score,
    stamps: [...state.stamps],
    livesLeft: state.lives,
    turns: state.turn,
    durationSec: Math.round((performance.now() - state.started) / 1000),
    learned: state.learned,
    answered: state.answered,
  };

  // ---------- 칸 이벤트 ----------
  async function resolveTile(tile: Tile) {
    if (tile.type === 'start') {
      const left = CONFIG.stampsToFinish - state.stamps.size;
      await notice('🏯', '조양문', `도장을 ${left}개 더 모아서 돌아오세요!`);
    } else if (tile.type === 'rest') {
      if (state.lives < CONFIG.lives) {
        state.lives++;
        sfx.heal();
        await notice('🌳', '쉼터에서 쉬어 가요', '하트가 하나 채워졌어요! ❤️');
      } else {
        addScore(S.restFull, tile);
        sfx.heal();
        await notice('🌳', '쉼터에서 쉬어 가요', `하트가 가득해서 점수 +${S.restFull}!`);
      }
    } else if (tile.type === 'chance') {
      await chance(tile);
    } else if (tile.place) {
      await visitPlace(tile);
    }
  }

  async function visitPlace(tile: Tile) {
    const placeId = tile.place!;
    const place = board.places[placeId];
    await focus(tile, 1.6);
    tileEls.get(tile.id)?.classList.add('bump');
    const games = place.minigames ?? [];
    const mode = place.mode === 'quiz_or_minigame' ? (Math.random() < CONFIG.quizRatio ? 'quiz' : 'minigame') : place.mode;
    let success: boolean;
    if (mode === 'minigame' && games.length) {
      const game = pick(games);
      await placeIntro(place, '🎮 미니게임');
      success = game === 'prawn' ? await playPrawn(layer, setup.level) : await playMemory(layer, setup.level);
      if (success) addScore(S.minigame, tile);
      else { loseLife(); await notice('📜', '홍성 상식 한 줄', pick(data.facts)); }
    } else {
      const q = deck.draw(placeId, place.categories);
      await placeIntro(place, CATEGORY_LABEL[q.category]);
      const seconds = CONFIG.quizSeconds[setup.level];
      const r = await runQuiz(layer, q, { place, guide: board.guide, seconds, hintAvailable: !state.hintUsed, draft: CONFIG.allowUnverified });
      if (r.usedHint) state.hintUsed = true;
      state.answered.push({ id: q.id, correct: r.correct });
      state.learned.push({ question: q.question, explanation: q.explanation, correct: r.correct, answer: q.choices[q.answer] });
      success = r.correct;
      if (r.correct) addScore((r.usedHint ? S.correctWithHint : S.correct) + (r.fast ? S.fastBonus : 0), tile);
      else loseLife();
    }
    if (success && !state.stamps.has(placeId)) await giveStamp(placeId, tile);
    tileEls.get(tile.id)?.classList.remove('bump');
    await unfocus();
  }

  /** 장소에 도착하면 장소 그림과 이름, 문제 분야를 크게 보여 준다. */
  function placeIntro(place: Place, label: string): Promise<void> {
    return new Promise((resolve) => {
      sfx.chance();
      const card = h('div', { class: 'place-intro' },
        art(place.art, place.emoji, 'place-intro-art'),
        h('div', { class: 'place-intro-name' }, place.name),
        h('div', { class: 'place-intro-label' }, label));
      const overlay = h('div', { class: 'overlay dim place-intro-overlay' }, card);
      layer.append(overlay);
      const close = () => {
        clearTimeout(timer);
        overlay.classList.add('fade-out');
        setTimeout(() => { overlay.remove(); resolve(); }, 250);
      };
      const timer = window.setTimeout(close, 1800);
      overlay.addEventListener('click', close, { once: true });
    });
  }

  async function chance(tile: Tile) {
    sfx.chance();
    const cards = [
      { icon: '💰', title: '보물 발견!', text: `점수 +${S.chance}`, apply: () => addScore(S.chance, tile) },
      { icon: '🎲', title: '한 번 더!', text: '주사위를 한 번 더 굴려요', apply: () => { state.extraRoll = true; } },
      {
        icon: '💖', title: '힘이 솟아요!',
        text: state.lives < CONFIG.lives ? '하트 +1' : `하트가 가득해서 점수 +${S.chance}`,
        apply: () => { if (state.lives < CONFIG.lives) state.lives++; else addScore(S.chance, tile); },
      },
      { icon: '📜', title: '홍성 상식 쪽지', text: `${pick(data.facts)} (점수 +${S.fact})`, apply: () => addScore(S.fact, tile) },
    ];
    const card = pick(cards);
    await notice(card.icon, card.title, card.text, true);
    card.apply();
    updateHud();
  }

  // ---------- 점수·도장·하트 ----------
  function addScore(points: number, tile?: Tile) {
    state.score += points;
    updateHud();
    scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump');
    if (tile) floatText(`+${points}`, tile);
  }

  function loseLife() {
    state.lives = Math.max(0, state.lives - 1);
    updateHud();
    const broken = hearts.children[state.lives] as HTMLElement | undefined;
    broken?.classList.add('break');
  }

  async function giveStamp(placeId: string, tile: Tile) {
    state.stamps.add(placeId);
    const place = board.places[placeId];
    const backdrop = h('div', { class: 'stamp-backdrop' }, h('div', { class: 'stamp-caption' }, `${place.name} 도장 획득!`));
    const big = h('div', { class: 'stamp-big', html: stampSvg(place.short, 260) });
    fx.append(backdrop, big);
    sfx.stamp();
    await wait(1100);
    backdrop.remove();
    const slot = stampSlots[placeIds.indexOf(placeId)];
    const from = big.getBoundingClientRect(), to = slot.getBoundingClientRect();
    await animate(big, [
      { transform: 'translate(-50%, -50%) scale(1)' },
      { transform: `translate(calc(-50% + ${(to.left + to.width / 2 - (from.left + from.width / 2)) / scaleOf()}px), calc(-50% + ${(to.top + to.height / 2 - (from.top + from.height / 2)) / scaleOf()}px)) scale(0.2)` },
    ], { duration: 500, easing: 'ease-in' });
    big.remove();
    slot.innerHTML = stampSvg(place.short, 54);
    slot.classList.add('got');
    addScore(S.stamp, tile);
  }

  function scaleOf() {
    return stage.getBoundingClientRect().width / STAGE_W;
  }

  function updateHud() {
    hearts.replaceChildren(...Array.from({ length: CONFIG.lives }, (_, i) => h('span', { class: `heart ${i < state.lives ? 'full' : 'empty'}` }, i < state.lives ? '❤️' : '🤍')));
    scoreEl.textContent = state.score.toLocaleString();
    turnEl.textContent = `턴 ${Math.min(state.turn, CONFIG.turnLimit)} / ${CONFIG.turnLimit}`;
    stampCount.textContent = `도장 ${state.stamps.size} / ${CONFIG.stampsToFinish}`;
    stampCount.classList.toggle('ready', state.stamps.size >= CONFIG.stampsToFinish);
  }

  // ---------- 주사위·이동 ----------
  function setDie(n: number) {
    die.replaceChildren(...Array.from({ length: n }, () => h('span', { class: 'pip' })));
    die.dataset.n = String(n);
  }

  function rollDice(): Promise<number> {
    return new Promise((resolve) => {
      diceBtn.disabled = false;
      diceBtn.classList.add('ready');
      const go = async () => {
        window.removeEventListener('keydown', onKey);
        diceBtn.removeEventListener('click', go);
        diceBtn.disabled = true;
        diceBtn.classList.remove('ready');
        diceBtn.classList.add('rolling');
        const result = randInt(CONFIG.dice.min, CONFIG.dice.max);
        for (let i = 0; i < 10; i++) {
          setDie(randInt(CONFIG.dice.min, CONFIG.dice.max));
          sfx.diceTick();
          await wait(55 + i * 8);
        }
        setDie(result);
        diceBtn.classList.remove('rolling');
        sfx.diceLand();
        stage.querySelector('.board-screen')?.classList.add('thud');
        setTimeout(() => stage.querySelector('.board-screen')?.classList.remove('thud'), 300);
        await wait(450);
        resolve(result);
      };
      const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); void go(); } };
      diceBtn.addEventListener('click', go);
      window.addEventListener('keydown', onKey);
    });
  }

  function chooseFork(tile: Tile, steps: number): Promise<number> {
    return new Promise((resolve) => {
      const labels = board.forks[String(tile.id)] ?? tile.next.map((_, i) => `길 ${i + 1}`);
      const box = h('div', { class: 'fork-box pop-in' },
        h('div', { class: 'fork-title' }, h('b', {}, '갈림길!'), h('span', {}, `어느 쪽으로 갈까요? (남은 칸 ${steps})`)),
        ...tile.next.map((id, i) => h('button', { class: 'btn fork-btn', onclick: () => { sfx.click(); box.remove(); markers.forEach((m) => m.remove()); resolve(id); } },
          `${i === 0 ? '➡️' : '⬇️'} ${labels[i]}`)));
      const markers = tile.next.map((id, i) => {
        const t = board.tiles[id];
        const m = h('div', { class: 'fork-marker' }, String(i + 1));
        m.style.left = `${t.x}px`;
        m.style.top = `${t.y}px`;
        map.append(m);
        return m;
      });
      layer.append(box);
    });
  }

  function placePiece(tile: Tile) {
    piece.style.left = `${tile.x}px`;
    piece.style.top = `${tile.y - PIECE_LIFT}px`;
  }

  async function hopTo(tile: Tile) {
    const fromX = parseFloat(piece.style.left), fromY = parseFloat(piece.style.top);
    const toX = tile.x, toY = tile.y - PIECE_LIFT;
    sfx.hop();
    const frames: Keyframe[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const lift = Math.sin(Math.PI * t) * 46;
      frames.push({ left: `${fromX + (toX - fromX) * t}px`, top: `${fromY + (toY - fromY) * t - lift}px` });
    }
    await animate(piece, frames, { duration: 330, easing: 'ease-in-out' });
    placePiece(tile);
    piece.classList.remove('land'); void piece.offsetWidth; piece.classList.add('land');
  }

  // ---------- 카메라 ----------
  function focus(tile: Tile, zoom: number): Promise<void> {
    // 지도 밖이 보이지 않도록 카메라 위치를 지도 안으로 제한한다.
    const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
    const tx = clamp(STAGE_W / 2 - tile.x * zoom, STAGE_W - board.width * zoom);
    const ty = clamp(STAGE_H / 2 + 60 - tile.y * zoom, STAGE_H - board.height * zoom);
    camera.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
    return wait(650);
  }

  function unfocus(): Promise<void> {
    camera.style.transform = '';
    return wait(400);
  }

  // ---------- 연출 ----------
  function banner(text: string, ms: number, sound?: () => void): Promise<void> {
    sound?.();
    const el = h('div', { class: 'banner' }, text);
    fx.append(el);
    return wait(ms).then(() => { el.remove(); });
  }

  function notice(icon: string, title: string, text: string, flip = false): Promise<void> {
    return new Promise((resolve) => {
      const ok = h('button', { class: 'btn btn-primary' }, '좋아요!');
      const card = h('div', { class: `notice-card ${flip ? 'flip-in' : 'pop-in'}` }, h('div', { class: 'notice-icon' }, icon), h('h2', {}, title), h('p', {}, text), ok);
      const overlay = h('div', { class: 'overlay dim-light' }, card);
      layer.append(overlay);
      const close = () => { clearTimeout(timer); overlay.remove(); resolve(); };
      const timer = window.setTimeout(close, 6000);
      ok.addEventListener('click', () => { sfx.click(); close(); }, { once: true });
    });
  }

  function floatText(text: string, tile: Tile) {
    const el = h('div', { class: 'float-text' }, text);
    el.style.left = `${tile.x}px`;
    el.style.top = `${tile.y - 120}px`;
    map.append(el);
    setTimeout(() => el.remove(), 1200);
  }

  function confetti() {
    const colors = ['#E8553D', '#E8C46A', '#5E9E6E', '#2E5E8C', '#fff'];
    for (let i = 0; i < 80; i++) {
      const c = h('i', { class: 'confetti' });
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = pick(colors);
      c.style.animationDelay = `${Math.random() * 0.6}s`;
      c.style.animationDuration = `${1.6 + Math.random()}s`;
      fx.append(c);
      setTimeout(() => c.remove(), 3200);
    }
  }
}
