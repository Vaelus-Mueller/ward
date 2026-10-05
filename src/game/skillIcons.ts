import type { SkillKind } from "./types";
import { SECTORS, skillById } from "./skills";

/** Compact SVG glyph paths for skill-tree nodes (viewBox 0 0 64 64). */
const GLYPH: Record<string, string> = {
  "iron-oath": "M32 10 L48 18 V34 C48 46 40 54 32 58 C24 54 16 46 16 34 V18 Z",
  "braced-guard": "M20 18 H44 V30 C44 42 38 50 32 54 C26 50 20 42 20 30 Z M24 28 H40",
  "heavy-blow": "M18 42 L32 12 L46 42 Z M28 42 V52 H36 V42",
  "stone-skin": "M18 36 L26 16 H38 L46 36 L38 52 H26 Z",
  cleave: "M14 40 Q32 8 50 40 M20 34 H44",
  "bulwark-aura": "M32 12 A20 20 0 1 1 31.9 12 M32 22 A10 10 0 1 1 31.9 22",
  bastion: "M16 48 V22 L32 12 L48 22 V48 H16 M24 48 V34 H40 V48",
  ravager: "M12 48 L32 10 L52 48 M22 36 H42",
  "iron-blood": "M32 14 C40 14 46 22 46 30 C46 42 32 54 32 54 C32 54 18 42 18 30 C18 22 24 14 32 14 Z",
  "shield-bash": "M22 16 H42 V28 C42 40 36 48 32 52 C28 48 22 40 22 28 Z M28 30 L36 30 L32 40 Z",
  aegis: "M32 10 L50 18 V36 C50 48 40 56 32 60 C24 56 14 48 14 36 V18 Z M32 24 V44 M24 34 H40",
  "wrath-speed": "M28 12 L44 12 L34 30 H46 L20 52 L28 34 H18 Z",
  "ruin-strike": "M30 10 H34 V40 L44 50 L32 56 L20 50 L30 40 Z",
  breaker: "M32 10 L52 30 L42 30 L42 54 H22 V30 H12 Z",
  citadel: "M14 50 V24 L24 16 H40 L50 24 V50 H14 M22 50 V36 H42 V50 M32 16 V28",
  sundering: "M10 50 L32 12 L54 50 M18 40 H46 M24 30 H40",

  "keen-edge": "M18 46 L32 10 L36 22 L46 18 L34 48 Z",
  "fleet-step": "M16 40 L28 16 L36 28 L48 14 L40 48 H24 Z",
  lunge: "M14 32 H42 L34 22 M42 32 L34 42",
  "open-vein": "M20 18 C28 10 40 18 36 30 C32 40 40 50 28 54 C18 48 14 36 20 18 Z",
  "knife-fan": "M32 48 L18 16 M32 48 L32 12 M32 48 L46 16",
  slip: "M16 36 C24 20 40 20 48 36 M22 40 C28 30 36 30 42 40",
  cutpurse: "M22 20 H42 L38 48 H26 Z M28 20 V14 H36 V20",
  marksman: "M16 32 H48 M40 22 L50 32 L40 42 M12 26 V38",
  "deep-cut": "M18 18 L46 46 M46 18 L18 46 M28 32 H36",
  "tendon-cut": "M20 16 L44 16 L36 32 L44 48 H20 L28 32 Z",
  "veiled-strike": "M14 32 C22 16 42 16 50 32 C42 48 22 48 14 32 M32 24 V40",
  "keen-eye": "M12 32 C20 18 44 18 52 32 C44 46 20 46 12 32 M32 32 A6 6 0 1 1 31.9 32",
  "piercing-throw": "M14 32 H50 M44 22 L54 32 L44 42",
  "ash-rain": "M32 14 L36 28 H50 L38 36 L44 50 L32 40 L20 50 L26 36 L14 28 H28 Z",
  hemorrhage: "M24 14 H40 L36 34 L48 34 L32 54 L16 34 H28 Z",
  deadeye: "M32 12 L36 28 H50 L38 36 L42 52 L32 42 L22 52 L26 36 L14 28 H28 Z M32 30 A4 4 0 1 1 31.9 30",

  "first-rite": "M32 10 V54 M20 22 H44 M24 38 H40",
  reservoir: "M20 16 H44 V48 C44 54 20 54 20 48 Z M26 28 H38",
  spark: "M32 10 L36 28 H50 L38 36 L42 54 L32 42 L22 54 L26 36 L14 28 H28 Z",
  "ember-flow": "M18 40 C22 20 42 20 46 40 M24 44 C28 30 36 30 40 44",
  "frost-ring": "M32 14 A18 18 0 1 1 31.9 14 M32 24 A8 8 0 1 1 31.9 24 M32 8 V18 M32 46 V56",
  mend: "M28 18 H36 V28 H46 V36 H36 V46 H28 V36 H18 V28 H28 Z",
  pyre: "M24 48 C24 34 18 28 32 12 C46 28 40 34 40 48 Z M28 48 H36",
  cantor: "M20 46 V22 L32 14 L44 22 V46 M26 46 V30 H38 V46",
  kindling: "M22 48 L32 14 L42 48 M28 36 H36",
  "cinder-lance": "M18 40 L46 16 L42 44 Z M30 34 L38 22",
  conflagration: "M18 44 C22 28 18 20 32 10 C46 20 42 28 46 44 C38 52 26 52 18 44 Z",
  breath: "M16 36 C24 18 40 18 48 36 M22 42 C28 28 36 28 42 42",
  "ward-chant": "M32 12 A20 20 0 1 1 31.9 12 M24 32 H40 M32 24 V40",
  litany: "M20 48 V20 H28 L36 34 V20 H44 V48 H36 L28 34 V48 Z",
  inferno: "M16 50 C20 34 12 24 32 8 C52 24 44 34 48 50 C38 58 26 58 16 50 Z M26 50 H38",
  benediction: "M32 10 L36 26 H52 L40 36 L46 52 L32 42 L18 52 L24 36 L8 26 H24 Z",
};

const KIND_FALLBACK: Record<SkillKind, string> = {
  passive: "M32 16 A16 16 0 1 1 31.9 16",
  active: "M20 20 H44 V44 H20 Z",
  aura: "M32 14 A18 18 0 1 1 31.9 14",
  channel: "M18 40 C26 18 38 18 46 40",
  key: "M32 12 L44 32 L32 52 L20 32 Z",
  capstone: "M32 10 L50 22 V42 L32 54 L14 42 V22 Z",
};

/** Append a decorative skill glyph into an SVG parent at (cx, cy). */
export function appendSkillIcon(
  parent: SVGElement,
  skillId: string,
  cx: number,
  cy: number,
  size: number,
  lit: boolean,
): void {
  const skill = skillById(skillId);
  if (!skill) return;
  const color = lit ? "#1a120c" : SECTORS[skill.sector].color;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 64})`);
  g.style.pointerEvents = "none";

  const rim = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  rim.setAttribute("cx", "32");
  rim.setAttribute("cy", "32");
  rim.setAttribute("r", "28");
  rim.setAttribute("fill", lit ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.25)");
  rim.setAttribute("stroke", color);
  rim.setAttribute("stroke-width", "2");
  g.append(rim);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", GLYPH[skillId] ?? KIND_FALLBACK[skill.kind]);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "3.2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  g.append(path);

  parent.append(g);
}
