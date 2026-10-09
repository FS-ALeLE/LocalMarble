import { sfx } from '../audio/sfx';
import { CONFIG, REGION_BASE } from '../config';
import { QuestionDeck } from '../core/deck';
import { pick, randInt, shuffle } from '../core/random';
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
  /** 오늘의 도장: 판마다 장소 몇 곳을 골라, 그곳 도장을 모두 모아 조양문으로 돌아오면 완주 */
  const targets = shuffle(placeIds).slice(0, CONFIG.todayStamps);
  const S = CONFIG.score;

  const state = {
    pos: board.start,
    lives: CONFIG.lives,
    score: 0,
    stamps: new Set<string>(),
    turn: 1,
    hintUsed: false,
    extraRoll: false,
    busRides: CONFIG.busRides,
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
      if (targets.includes(tile.place)) {
        el.classList.add('target');
        el.append(h('div', { class: 'target-badge' }, '⭐ 오늘의 도장'));
      }
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
  const stampSlots = targets.map((id) => h('div', { class: 'stamp-slot', title: board.places[id].name, html: emptyStampSvg(54) }));
  const stampCount = h('div', { class: 'stamp-count' });
  const busCount = h('div', { class: 'bus-count' });
  const hud = h('div', { class: 'hud' },
    h('div', { class: 'hud-card hud-player' },
      art(setup.piece.art, setup.piece.emoji, 'hud-piece'),
      h('div', {}, h('div', { class: 'hud-nick' }, profile.nickname), h('div', { class: 'hud-aff' }, `${profile.affiliationKey} · ${setup.level === 'low' ? '저학년' : '고학년'}`))),
    h('div', { class: 'hud-card hud-stamps' },
      h('div', { class: 'hud-stamps-head' }, stampCount, busCount),
      h('div', { class: 'stamp-row' }, ...targets.map((id, i) => h('div', { class: 'target-slot' },
        stampSlots[i], h('div', { class: 'target-slot-name' }, `${board.places[id].emoji} ${board.places[id].short}`))))),
    h('div', { class: 'hud-card hud-status' }, hearts, h('div', { class: 'hud-score' }, h('span', {}, '점수'), scoreEl), turnEl));

  const die = h('div', { class: 'die' });
  const diceBtn = h('button', { class: 'dice-btn' }, die, h('div', { class: 'dice-label' }, '주사위 굴리기'));
  const fx = h('div', { class: 'fx-layer' });
  const layer = h('div', { class: 'overlay-layer' });
  stage.replaceChildren(h('div', { class: 'screen board-screen' }, camera, hud, diceBtn, fx, layer));
  setDie(1);
  updateHud();

  // ---------- 진행 ----------
  await todayIntro();
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
      if (board.tiles[state.pos].type === 'start' && allStamped()) {
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
    targets,
    livesLeft: state.lives,
    turns: state.turn,
    durationSec: Math.round((performance.now() - state.started) / 1000),
    learned: state.learned,
    answered: state.answered,
  };

  // ---------- 칸 이벤트 ----------
  async function resolveTile(tile: Tile) {
    if (tile.type === 'start') {
      const left = targets.filter((id) => !state.stamps.has(id)).map((id) => board.places[id].name);
      await notice('🏯', '조양문', `오늘의 도장 ${left.length}개를 더 모아서 돌아오세요! (${left.join(', ')})`);
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

  async function visitPlace(tile: Tile, byBus = false) {
    const placeId = tile.place!;
    const place = board.places[placeId];
    const needed = targets.includes(placeId) && !state.stamps.has(placeId);
    // 오늘의 도장이 아닌 곳(또는 이미 받은 곳)에 서면 홍성 버스를 탈지 고를 수 있다.
    const remaining = targets.filter((id) => !state.stamps.has(id));
    if (!byBus && !needed && state.busRides > 0 && remaining.length) {
      const dest = await offerBus(tile, remaining);
      if (dest) {
        await rideBus(tile, dest);
        return visitPlace(dest, true);
      }
    }
    await focus(tile, 1.6);
    tileEls.get(tile.id)?.classList.add('bump');
    const games = place.minigames ?? [];
    const mode = place.mode === 'quiz_or_minigame' ? (Math.random() < CONFIG.quizRatio ? 'quiz' : 'minigame') : place.mode;
    let success: boolean;
    if (mode === 'minigame' && games.length) {
      const game = pick(games);
      await placeIntro(place, '🎮 미니게임', needed);
      success = game === 'prawn' ? await playPrawn(layer, setup.level) : await playMemory(layer, setup.level);
      if (success) addScore(S.minigame, tile);
      else { loseLife(); await notice('📜', '홍성 상식 한 줄', pick(data.facts)); }
    } else {
      const q = deck.draw(placeId, place.categories);
      await placeIntro(place, CATEGORY_LABEL[q.category], needed);
      const seconds = CONFIG.quizSeconds[setup.level];
      const r = await runQuiz(layer, q, { place, guide: board.guide, seconds, hintAvailable: !state.hintUsed, draft: CONFIG.allowUnverified });
      if (r.usedHint) state.hintUsed = true;
      state.answered.push({ id: q.id, correct: r.correct });
      state.learned.push({ question: q.question, explanation: q.explanation, correct: r.correct, answer: q.choices[q.answer] });
      success = r.correct;
      if (r.correct) addScore((r.usedHint ? S.correctWithHint : S.correct) + (r.fast ? S.fastBonus : 0), tile);
      else loseLife();
    }
    if (success && needed) await giveStamp(placeId, tile);
    tileEls.get(tile.id)?.classList.remove('bump');
    await unfocus();
  }

  /** 장소에 도착하면 장소 그림과 이름, 문제 분야를 크게 보여 준다. */
  function placeIntro(place: Place, label: string, stampHere: boolean): Promise<void> {
    return new Promise((resolve) => {
      sfx.chance();
      const card = h('div', { class: 'place-intro' },
        art(place.art, place.emoji, 'place-intro-art'),
        h('div', { class: 'place-intro-name' }, place.name),
        h('div', { class: 'place-intro-label' }, label),
        h('div', { class: `place-intro-note ${stampHere ? 'on' : ''}` }, stampHere ? '⭐ 맞히면 오늘의 도장!' : '오늘의 도장은 없지만 점수를 받을 수 있어요'));
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

  // ---------- 오늘의 도장 · 홍성 버스 ----------
  function allStamped() {
    return targets.every((id) => state.stamps.has(id));
  }

  function todayIntro(): Promise<void> {
    return new Promise((resolve) => {
      sfx.chance();
      const go = h('button', { class: 'btn btn-primary big' }, '좋아요, 출발!');
      const card = h('div', { class: 'today-card pop-in' },
        h('h2', {}, '⭐ 오늘의 도장'),
        h('p', {}, `이 ${targets.length}곳에서 문제를 맞혀 도장을 모으고, 조양문으로 돌아오세요!`),
        h('div', { class: 'today-list' }, ...targets.map((id) => {
          const p = board.places[id];
          return h('div', { class: 'today-item' }, art(p.art, p.emoji, 'today-art'), h('div', { class: 'today-name' }, p.name));
        })),
        h('p', { class: 'today-bus' }, `🚌 홍성 버스 ${CONFIG.busRides}번: 도장이 없는 곳에 서면 버스를 타고 오늘의 도장 장소로 갈 수 있어요.`),
        go);
      const overlay = h('div', { class: 'overlay dim' }, card);
      layer.append(overlay);
      const close = () => { clearTimeout(timer); overlay.remove(); resolve(); };
      const timer = window.setTimeout(close, 15000);
      go.addEventListener('click', () => { sfx.click(); close(); }, { once: true });
    });
  }

  /** 버스를 탈지 묻는다. 고른 장소의 칸(가장 가까운 칸)을 돌려주고, 안 타면 null. */
  function offerBus(here: Tile, remaining: string[]): Promise<Tile | null> {
    return new Promise((resolve) => {
      sfx.chance();
      const nearest = (placeId: string) => board.tiles
        .filter((t) => t.place === placeId)
        .sort((a, b) => Math.hypot(a.x - here.x, a.y - here.y) - Math.hypot(b.x - here.x, b.y - here.y))[0];
      const done = (t: Tile | null) => { overlay.remove(); resolve(t); };
      const card = h('div', { class: 'bus-card pop-in' },
        h('div', { class: 'bus-icon' }, '🚌'),
        h('h2', {}, '홍성 버스를 탈까요?'),
        h('p', {}, `여기는 오늘의 도장이 없어요. 버스를 타면 도장 장소로 바로 갈 수 있어요. (남은 버스 ${state.busRides}번)`),
        h('div', { class: 'bus-options' }, ...remaining.map((id) => {
          const p = board.places[id];
          return h('button', { class: 'btn btn-gold bus-dest', onclick: () => { sfx.click(); done(nearest(id)); } }, `${p.emoji} ${p.name}`);
        })),
        h('button', { class: 'btn btn-soft', onclick: () => { sfx.click(); done(null); } }, '안 탈래요, 여기서 문제 풀기'));
      const overlay = h('div', { class: 'overlay dim-light' }, card);
      layer.append(overlay);
    });
  }

  async function rideBus(from: Tile, to: Tile) {
    state.busRides--;
    updateHud();
    await unfocus();
    const bus = h('div', { class: 'bus' }, '🚌');
    bus.style.left = `${from.x}px`;
    bus.style.top = `${from.y - PIECE_LIFT}px`;
    map.append(bus);
    piece.style.visibility = 'hidden';
    sfx.go();
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    await animate(bus, [
      { left: `${from.x}px`, top: `${from.y - PIECE_LIFT}px` },
      { left: `${to.x}px`, top: `${to.y - PIECE_LIFT}px` },
    ], { duration: Math.max(700, dist * 1.6), easing: 'ease-in-out' });
    bus.remove();
    state.pos = to.id;
    placePiece(to);
    piece.style.visibility = '';
    piece.classList.remove('land'); void piece.offsetWidth; piece.classList.add('land');
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
    const slot = stampSlots[targets.indexOf(placeId)];
    tileEls.forEach((el, id) => { if (board.tiles[id].place === placeId) el.classList.add('done'); });
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
    stampCount.textContent = allStamped() ? '도장 완성! 조양문으로!' : `오늘의 도장 ${state.stamps.size} / ${targets.length}`;
    stampCount.classList.toggle('ready', allStamped());
    busCount.textContent = `🚌 ×${state.busRides}`;
    busCount.classList.toggle('empty', state.busRides === 0);
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
