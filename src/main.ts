import './styles.css';
import { loadRegion } from './data';
import { playBoard } from './scenes/board';
import { registerScreen } from './scenes/register';
import { resultScreen } from './scenes/result';
import { setupScreen } from './scenes/setup';
import { titleScreen } from './scenes/title';
import { fetchEvent, flushQueue, submitPlay } from './services/api';
import { leaderboardScreen } from './scenes/leaderboard';
import { h } from './ui/dom';
import { startIdleWatch } from './ui/idle';
import { fitStage } from './ui/stage';
import { keepScreenOn } from './ui/wakeLock';

async function main() {
  const stage = document.getElementById('stage')!;
  fitStage(stage);
  keepScreenOn();
  stage.replaceChildren(h('div', { class: 'screen loading' }, h('div', { class: 'loading-dice' }, '🎲'), h('p', {}, '홍성 지도를 펼치는 중…')));

  const [data, event] = await Promise.all([loadRegion(), fetchEvent()]);

  // 인터넷이 끊겨 못 보낸 기록을 다시 보낸다.
  void flushQueue();
  setInterval(() => void flushQueue(), 30_000);

  const toast = h('div', { id: 'idle-toast' }, '아직 하고 있나요? 화면을 눌러 주세요! 👆');
  document.getElementById('viewport')!.append(toast);
  const idle = startIdleWatch((show) => toast.classList.toggle('show', show), () => location.reload());

  for (;;) {
    idle.pause();
    const choice = await titleScreen(stage, event);
    idle.resume();
    if (choice === 'board') {
      await leaderboardScreen(stage, undefined, '🏠 처음으로');
      continue;
    }
    const profile = await registerScreen(stage, data, event);
    if (!profile) continue;
    const setup = await setupScreen(stage, data, profile);
    if (!setup) continue;
    const result = await playBoard(stage, data, profile, setup);
    const rank = event.active ? submitPlay(profile, setup, result) : Promise.resolve(null);
    const next = await resultScreen(stage, data, profile, result, event, rank);
    if (next === 'leaderboard') await leaderboardScreen(stage, (await rank)?.playId);
  }
}

main().catch((err) => {
  console.error(err);
  document.getElementById('stage')!.replaceChildren(
    h('div', { class: 'screen loading' }, h('p', {}, '앗, 게임을 불러오지 못했어요.'), h('p', { class: 'muted' }, String(err)),
      h('button', { class: 'btn btn-primary', onclick: () => location.reload() }, '다시 시도')));
});

