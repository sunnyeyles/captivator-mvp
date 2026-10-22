// Inline SVG data URIs ship with the package, so templates never depend on a remote host or an object URL
function svgDataUri(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function placeholderLogoSrc(color: string) {
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">` +
      `<circle cx="48" cy="48" r="44" fill="none" stroke="${color}" stroke-width="4"/>` +
      `<path d="M26 45a31 31 0 0 1 44 0M34 54a19 19 0 0 1 28 0" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="48" cy="66" r="6" fill="${color}"/>` +
      `</svg>`,
  );
}

const confetti = [
  [120, 140, 9, "#fde68a"],
  [260, 620, 6, "#f9a8d4"],
  [420, 300, 7, "#a5f3fc"],
  [610, 120, 5, "#fde68a"],
  [760, 820, 8, "#f9a8d4"],
  [940, 220, 6, "#a5f3fc"],
  [1080, 560, 9, "#fde68a"],
  [1240, 140, 7, "#f9a8d4"],
  [1380, 700, 6, "#a5f3fc"],
  [1500, 380, 8, "#fde68a"],
  [180, 880, 7, "#a5f3fc"],
  [1460, 920, 5, "#f9a8d4"],
] as const;

export const eventBackgroundSrc = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset=".55" stop-color="#6d28d9"/><stop offset="1" stop-color="#db2777"/></linearGradient>` +
    `<radialGradient id="glow-a" cx=".18" cy=".1" r=".55"><stop offset="0" stop-color="#f472b6" stop-opacity=".75"/><stop offset="1" stop-color="#f472b6" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="glow-b" cx=".86" cy=".85" r=".6"><stop offset="0" stop-color="#facc15" stop-opacity=".5"/><stop offset="1" stop-color="#facc15" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect width="1600" height="1000" fill="url(#sky)"/>` +
    `<rect width="1600" height="1000" fill="url(#glow-a)"/>` +
    `<rect width="1600" height="1000" fill="url(#glow-b)"/>` +
    `<g fill="#ffffff" fill-opacity=".12">` +
    `<path d="M320 0 90 1000h420z"/><path d="M800 0 620 1000h360z"/><path d="M1280 0 1090 1000h420z"/>` +
    `</g>` +
    confetti
      .map(
        ([x, y, r, fill]) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`,
      )
      .join("") +
    `</svg>`,
);
