import type { Board } from '../core/types';

type Pt = [number, number];

// 임시 지도 (AI 지도 그림이 오기 전까지 사용). 홍성을 단순화한 섬 모양 디오라마.
const LAND: Pt[] = [
  [130, 470], [170, 330], [270, 215], [430, 135], [640, 110], [850, 105], [1030, 150], [1180, 240],
  [1265, 380], [1275, 560], [1225, 720], [1110, 820], [900, 890], [680, 935], [470, 940], [300, 880],
  [190, 770], [135, 620],
];
const MUDFLAT: Pt[] = [[95, 380], [150, 300], [200, 330], [175, 470], [160, 640], [190, 760], [120, 720], [80, 560]];

function smooth(points: Pt[]): string {
  const n = points.length;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d + ' Z';
}

function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function segDist([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt): number {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export function roadSegments(board: Board): [Pt, Pt][] {
  const segs: [Pt, Pt][] = [];
  for (const t of board.tiles) for (const n of t.next) {
    const to = board.tiles[n];
    segs.push([[t.x, t.y], [to.x, to.y]]);
  }
  return segs;
}

export function mapSvg(board: Board): string {
  const rand = seeded(7);
  const segs = roadSegments(board);
  const roadD = segs.map(([a, b]) => `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`).join(' ');
  const clear = (p: Pt, r: number) =>
    board.tiles.every((t) => Math.hypot(p[0] - t.x, p[1] - t.y) > r + 55) && segs.every(([a, b]) => segDist(p, a, b) > r + 22);

  // 논 (홍동·홍성읍 들판)
  const paddies: string[] = [];
  for (const [cx, cy] of [[960, 470], [1010, 560], [880, 820], [560, 560], [430, 620], [520, 420]] as Pt[]) {
    for (let i = 0; i < 4; i++) {
      const x = cx + (i % 2) * 58, y = cy + Math.floor(i / 2) * 40;
      if (!clear([x + 26, y + 18], 28)) continue;
      paddies.push(`<rect x="${x}" y="${y}" width="54" height="36" rx="6" fill="${i % 3 ? '#a9d27e' : '#b8db8a'}" stroke="#8cbf62" stroke-width="2"/>`);
    }
  }

  // 나무
  const trees: string[] = [];
  for (let k = 0; k < 400 && trees.length < 90; k++) {
    const p: Pt = [150 + rand() * 1120, 120 + rand() * 820];
    if (!inside(p, LAND) || !clear(p, 14)) continue;
    const s = 0.8 + rand() * 0.6;
    const g = ['#5E9E6E', '#6aab73', '#4f8f5f', '#77b47a'][Math.floor(rand() * 4)];
    trees.push(`<g transform="translate(${p[0].toFixed(0)} ${p[1].toFixed(0)}) scale(${s.toFixed(2)})">
      <ellipse cx="0" cy="14" rx="12" ry="5" fill="rgba(40,60,30,0.25)"/>
      <rect x="-3" y="2" width="6" height="12" rx="2" fill="#8a6440"/>
      <circle cx="0" cy="-6" r="14" fill="${g}"/><circle cx="-5" cy="-11" r="6" fill="rgba(255,255,255,0.18)"/></g>`);
  }

  // 용봉산(북쪽 바위산), 오서산(남쪽 억새 언덕)
  const rocks = [[560, 150, 1], [610, 125, 1.3], [700, 135, 1.1], [745, 160, 0.9], [520, 175, 0.8]]
    .map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M -40 30 Q -30 -20 -6 -38 Q 6 -46 16 -30 Q 38 -2 42 30 Z" fill="#9aa5a0"/>
      <path d="M -6 -38 Q 6 -46 16 -30 Q 22 -14 8 -4 Q -4 -18 -6 -38 Z" fill="#c3cbc6"/>
      <path d="M -40 30 Q -20 18 0 26 Q 22 16 42 30 Z" fill="#5E9E6E"/></g>`).join('');
  const grass = [[560, 905], [640, 915], [740, 905], [830, 885], [480, 895]]
    .map(([x, y]) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="52" ry="24" fill="#E8C46A"/>
      <path d="M -30 -4 q 4 -18 8 0 M -10 -8 q 4 -20 8 0 M 10 -6 q 4 -18 8 0 M 28 -2 q 3 -14 6 0" stroke="#c99f3e" stroke-width="3" fill="none" stroke-linecap="round"/></g>`).join('');

  // 바다 물결, 배
  const waves: string[] = [];
  for (let k = 0; k < 40; k++) {
    const p: Pt = [rand() * 1600, rand() * 1000];
    if (inside(p, LAND) || inside(p, MUDFLAT)) continue;
    waves.push(`<path class="wave" d="M ${p[0]} ${p[1]} q 10 -8 20 0 t 20 0" stroke="rgba(255,255,255,0.55)" stroke-width="3" fill="none" stroke-linecap="round" style="animation-delay:${(-rand() * 4).toFixed(2)}s"/>`);
  }

  return `<svg class="map-svg" viewBox="0 0 ${board.width} ${board.height}" width="${board.width}" height="${board.height}">
  <defs>
    <radialGradient id="sea" cx="45%" cy="50%" r="75%"><stop offset="0" stop-color="#8fd0ea"/><stop offset="1" stop-color="#4a8fc0"/></radialGradient>
    <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe08e"/><stop offset="1" stop-color="#a3cf76"/></linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#sea)"/>
  ${waves.join('')}
  <path d="${smooth(MUDFLAT)}" fill="#b8936b" transform="translate(0 10)" opacity="0.55"/>
  <path d="${smooth(MUDFLAT)}" fill="#c7a37a"/>
  <path d="${smooth(LAND)}" fill="#7a5a3c" transform="translate(0 26)"/>
  <path d="${smooth(LAND)}" fill="#8f6a46" transform="translate(0 14)"/>
  <path d="${smooth(LAND)}" fill="url(#land)" stroke="#f5efc8" stroke-width="5"/>
  ${paddies.join('')}
  ${grass}
  ${rocks}
  <path d="${roadD}" stroke="#c9ab7c" stroke-width="44" stroke-linecap="round" fill="none"/>
  <path d="${roadD}" stroke="#f6e7c4" stroke-width="34" stroke-linecap="round" fill="none"/>
  <path d="${roadD}" stroke="#fffaf0" stroke-width="3" stroke-dasharray="10 14" stroke-linecap="round" fill="none"/>
  ${trees.join('')}
  <g transform="translate(110 580)"><path d="M -26 0 L 26 0 L 18 14 L -18 14 Z" fill="#E8553D"/><rect x="-2" y="-34" width="4" height="34" fill="#7a5a3c"/><path d="M 2 -32 L 24 -6 L 2 -6 Z" fill="#fff"/></g>
  <g transform="translate(70 300)"><path d="M -22 0 L 22 0 L 15 12 L -15 12 Z" fill="#2E5E8C"/><rect x="-2" y="-28" width="4" height="28" fill="#7a5a3c"/><path d="M 2 -26 L 20 -6 L 2 -6 Z" fill="#fff"/></g>
</svg>`;
}
