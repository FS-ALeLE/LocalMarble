export const STAGE_W = 1600;
export const STAGE_H = 1000;

/** 1600×1000 무대를 화면 비율에 맞춰 확대·축소한다. */
export function fitStage(stage: HTMLElement): void {
  const resize = () => {
    const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth * 1.05);
  };
  window.addEventListener('resize', resize);
  resize();
  // 화면 밖 요소에 포커스가 가도 무대가 스크롤되어 밀리지 않게 한다.
  document.addEventListener('scroll', (e) => {
    const el = e.target as HTMLElement;
    if (el instanceof HTMLElement && (el.scrollLeft || el.scrollTop)) { el.scrollLeft = 0; el.scrollTop = 0; }
  }, true);
}

export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}
