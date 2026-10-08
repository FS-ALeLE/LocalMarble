/** 장소 도장 SVG. 잉크 번짐은 index.html의 #ink 필터. */
export function stampSvg(label: string, size = 64, color = '#E8553D'): string {
  const fontSize = label.length >= 3 ? 19 : 23;
  return `<svg class="stamp-svg" width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="${label} 도장">
    <g filter="url(#ink)" fill="none" stroke="${color}">
      <circle cx="50" cy="50" r="44" stroke-width="6"/>
      <circle cx="50" cy="50" r="35" stroke-width="2.5"/>
    </g>
    <text x="50" y="44" text-anchor="middle" font-family="Jua, sans-serif" font-size="${fontSize}" fill="${color}" filter="url(#ink)">${label}</text>
    <text x="50" y="68" text-anchor="middle" font-family="Jua, sans-serif" font-size="13" fill="${color}" filter="url(#ink)">홍성 탐험</text>
  </svg>`;
}

export function emptyStampSvg(size = 64): string {
  return `<svg class="stamp-svg empty" width="${size}" height="${size}" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="42" fill="rgba(255,255,255,0.35)" stroke="#b9a68a" stroke-width="4" stroke-dasharray="9 8"/>
  </svg>`;
}
