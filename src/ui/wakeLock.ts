// 행사 동안 화면이 꺼지지 않게 한다 (Screen Wake Lock API).
// 지원: Chrome·Edge·삼성 인터넷, iPad Safari 16.4 이상. HTTPS에서만 동작하고, 탭을 다시 볼 때 다시 요청한다.
type WakeLockSentinelLike = { release(): Promise<void>; addEventListener(type: 'release', fn: () => void): void };

let lock: WakeLockSentinelLike | null = null;

async function request(): Promise<void> {
  const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }).wakeLock;
  if (!wl || lock || document.visibilityState !== 'visible') return;
  try {
    lock = await wl.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch {
    /* 배터리 절약 모드 등으로 거절되면 다음 터치 때 다시 시도 */
  }
}

export function keepScreenOn(): void {
  void request();
  document.addEventListener('visibilitychange', () => void request());
  // 일부 브라우저는 사용자 동작이 있어야 허락한다.
  window.addEventListener('pointerdown', () => void request(), { capture: true });
}
