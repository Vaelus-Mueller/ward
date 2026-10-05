import type { RaceId } from "../game/types";

/** Dark paper-doll body art — one readable silhouette per race. */
const FILL = "#2c261f";
const STROKE = "#8c7355";

interface Silhouette {
  accent?: string;
  body: string;
}

const SILHOUETTES: Record<RaceId, Silhouette> = {
  human: {
    body: `
      <ellipse cx="50" cy="28" rx="16" ry="18"/>
      <path d="M42 44h16l-2 14H44z"/>
      <path d="M30 62c-8 18-8 46 2 66h36c10-20 10-48 2-66-8-4-14-6-20-6s-12 2-20 6z"/>
      <path d="M30 70 12 118l8 4 16-40z"/>
      <path d="M70 70 88 118l-8 4-16-40z"/>
      <path d="M38 128 32 202h12l6-62z"/>
      <path d="M62 128 68 202H56l-6-62z"/>
    `,
  },
  elf: {
    accent: "#6f8a58",
    body: `
      <ellipse cx="50" cy="24" rx="13" ry="16"/>
      <path d="M34 22 22 10l4 14z"/>
      <path d="M66 22 78 10l-4 14z"/>
      <path d="M44 38h12l-1.5 16H45.5z"/>
      <path d="M34 58c-6 22-5 52 1 72h30c6-20 7-50 1-72-6-3-11-5-16-5s-10 2-16 5z"/>
      <path d="M34 66 14 122l7 3 16-46z"/>
      <path d="M66 66 86 122l-7 3-16-46z"/>
      <path d="M40 132 36 208h10l4-70z"/>
      <path d="M60 132 64 208H54l-4-70z"/>
    `,
  },
  dwarf: {
    accent: "#a8884a",
    body: `
      <ellipse cx="50" cy="36" rx="18" ry="16"/>
      <path d="M36 48c2 14 8 22 14 24 6-2 12-10 14-24z"/>
      <path d="M42 50h16l-1 10H43z"/>
      <path d="M24 64c-4 14-2 36 6 48h40c8-12 10-34 6-48-8-6-16-8-26-8s-18 2-26 8z"/>
      <path d="M28 72 14 108l9 3 12-28z"/>
      <path d="M72 72 86 108l-9 3-12-28z"/>
      <path d="M36 116 32 168h14l4-46z"/>
      <path d="M64 116 68 168H54l-4-46z"/>
    `,
  },
  gnome: {
    accent: "#8a6aa8",
    body: `
      <path d="M50 6 66 34H34z"/>
      <ellipse cx="50" cy="42" rx="18" ry="16"/>
      <path d="M44 56h12l-1 8H45z"/>
      <path d="M32 66c-4 12-2 30 4 40h28c6-10 8-28 4-40-6-4-12-6-18-6s-12 2-18 6z"/>
      <path d="M34 72 20 104l7 3 11-26z"/>
      <path d="M66 72 80 104l-7 3-11-26z"/>
      <path d="M40 108 36 150h12l4-38z"/>
      <path d="M60 108 64 150H52l-4-38z"/>
    `,
  },
  hobbit: {
    accent: "#8a7a3a",
    body: `
      <ellipse cx="50" cy="40" rx="15" ry="15"/>
      <path d="M44 54h12l-1 10H45z"/>
      <path d="M30 68c-5 12-3 32 3 44h34c6-12 8-32 3-44-6-4-12-6-20-6s-14 2-20 6z"/>
      <path d="M32 76 18 110l7 3 12-28z"/>
      <path d="M68 76 82 110l-7 3-12-28z"/>
      <path d="M38 114 34 158h12l4-40z"/>
      <path d="M62 114 66 158H54l-4-40z"/>
      <ellipse cx="34" cy="164" rx="12" ry="6"/>
      <ellipse cx="66" cy="164" rx="12" ry="6"/>
    `,
  },
  insectoid: {
    accent: "#7a9a48",
    body: `
      <ellipse cx="50" cy="26" rx="14" ry="15"/>
      <path d="M42 12 38 2"/>
      <path d="M58 12 62 2"/>
      <circle cx="38" cy="2" r="2.2"/>
      <circle cx="62" cy="2" r="2.2"/>
      <path d="M44 40h12l-1.5 12H45.5z"/>
      <path d="M32 56c-5 16-3 40 3 56h30c6-16 8-40 3-56-6-3-12-5-18-5s-12 2-18 5z"/>
      <ellipse cx="50" cy="128" rx="14" ry="18"/>
      <path d="M32 64 10 108l7 3 18-36z"/>
      <path d="M68 64 90 108l-7 3-18-36z"/>
      <path d="M36 78 16 126l6 3 16-40z"/>
      <path d="M64 78 84 126l-6 3-16-40z"/>
      <path d="M40 140 36 202h11l4-58z"/>
      <path d="M60 140 64 202H53l-4-58z"/>
    `,
  },
  minotaur: {
    accent: "#b09868",
    body: `
      <path d="M28 20 18 6l8 10z"/>
      <path d="M72 20 82 6l-8 10z"/>
      <ellipse cx="50" cy="30" rx="20" ry="18"/>
      <ellipse cx="50" cy="40" rx="10" ry="7"/>
      <path d="M40 46h20l-2 12H42z"/>
      <path d="M22 62c-6 20-2 50 8 68h40c10-18 14-48 8-68-10-6-18-8-28-8s-18 2-28 8z"/>
      <path d="M26 72 8 122l9 4 16-40z"/>
      <path d="M74 72 92 122l-9 4-16-40z"/>
      <path d="M36 134 30 208h14l6-68z"/>
      <path d="M64 134 70 208H56l-6-68z"/>
    `,
  },
  golem: {
    accent: "#c4a86a",
    body: `
      <rect x="34" y="14" width="32" height="30" rx="4"/>
      <rect x="40" y="44" width="20" height="12" rx="2"/>
      <path d="M22 60h56v70H22z"/>
      <rect x="8" y="66" width="16" height="52" rx="3"/>
      <rect x="76" y="66" width="16" height="52" rx="3"/>
      <rect x="28" y="132" width="16" height="70" rx="3"/>
      <rect x="56" y="132" width="16" height="70" rx="3"/>
      <rect x="44" y="78" width="12" height="12" rx="2"/>
    `,
  },
  lizard: {
    accent: "#8a6a3a",
    body: `
      <ellipse cx="50" cy="28" rx="14" ry="14"/>
      <path d="M50 12 54 2 50 6 46 2z"/>
      <ellipse cx="50" cy="34" rx="8" ry="5"/>
      <path d="M44 40h12l-1.5 12H45.5z"/>
      <path d="M32 56c-5 18-3 44 3 62h30c6-18 8-44 3-62-6-3-12-5-18-5s-12 2-18 5z"/>
      <path d="M32 64 12 116l7 3 16-42z"/>
      <path d="M68 64 88 116l-7 3-16-42z"/>
      <path d="M40 122 36 200h11l4-72z"/>
      <path d="M60 122 64 200H53l-4-72z"/>
      <path d="M50 118c10 8 18 28 14 52-8-10-16-24-20-40 4-6 6-10 6-12z"/>
    `,
  },
  undead: {
    accent: "#6a7a5a",
    body: `
      <ellipse cx="50" cy="28" rx="14" ry="16"/>
      <circle cx="44" cy="26" r="3" fill="#1a1612" stroke="none"/>
      <circle cx="56" cy="26" r="3" fill="#1a1612" stroke="none"/>
      <path d="M44 42h12l-1.5 14H45.5z"/>
      <path d="M34 60c-5 18-4 46 0 64h32c4-18 5-46 0-64-5-3-10-5-16-5s-11 2-16 5z"/>
      <path d="M36 68 18 114l6 2 14-36z"/>
      <path d="M64 68 82 114l-6 2-14-36z"/>
      <path d="M40 128 37 204h9l3-72z"/>
      <path d="M60 128 63 204h-9l-3-72z"/>
      <path d="M40 78h20M42 92h16M44 106h12" fill="none"/>
    `,
  },
};

export function raceDollSvg(race: RaceId): string {
  const art = SILHOUETTES[race] ?? SILHOUETTES.human;
  const stroke = art.accent ?? STROKE;
  // Short races are drawn compact — nudge them down so boots still sit near the doll base.
  const shift = race === "gnome" ? 42 : race === "hobbit" ? 30 : race === "dwarf" ? 26 : 0;
  const transform = shift ? ` transform="translate(0 ${shift})"` : "";
  return `<svg class="silhouette" viewBox="0 0 100 220" aria-hidden="true">
    <g fill="${FILL}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"${transform}>${art.body}</g>
  </svg>`;
}
