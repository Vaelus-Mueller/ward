import type { SkillKind } from "./types";
import { SECTORS, skillById, SPEC_LABEL } from "./skills";
import type { RaceId } from "./races";

/** Viktor CC0 skill PNGs under `public/icons/skills/`. */
const SKILL_PNG: Record<string, string> = {
  "iron-oath": "shield_colored.png",
  "braced-guard": "shield_pink.png",
  "stone-skin": "rock_blade_brown.png",
  "bulwark-aura": "ice_shield_white.png",
  bastion: "shield_colored.png",
  "iron-blood": "rend_orange.png",
  "shield-bash": "sword_bash_orange.png",
  aegis: "shield_pink.png",
  citadel: "pillar_purple.png",
  "blood-oath": "rend_purple.png",
  "heavy-blow": "sword_bash_purple.png",
  cleave: "whirlwind_orange.png",
  ravager: "dual_strike_orange.png",
  "wrath-speed": "lightning_dash_purple.png",
  "ruin-strike": "enhanced_sword_red.png",
  breaker: "enhanced_sword_cyan.png",
  sundering: "flare_blade_red.png",
  "keen-edge": "dagger_orange.png",
  "fleet-step": "wind_slicer_orange.png",
  lunge: "lightning_dash_cyan.png",
  "knife-fan": "arcane_knives_pink.png",
  slip: "wind_slicer_green.png",
  marksman: "shells_purple.png",
  "keen-eye": "beam_pink.png",
  "piercing-throw": "knife_cyan.png",
  "ash-rain": "grenade_red.png",
  deadeye: "shells_pink.png",
  "open-vein": "rend_orange.png",
  "toxin-coat": "grenade_green.png",
  cutpurse: "knife_white.png",
  "deep-cut": "dagger_pink.png",
  "tendon-cut": "knife_impact_orange.png",
  "veiled-strike": "psi_blade_black.png",
  hemorrhage: "rend_purple.png",
  "ember-flow": "fire_ball_red.png",
  kindling: "fire_ball_cyan.png",
  pyre: "fire_ball_purple.png",
  "cinder-lance": "flare_blade_purple.png",
  "ash-plume": "grenade_cyan.png",
  conflagration: "fire_ball_red.png",
  inferno: "fire_ball_purple.png",
  reservoir: "core_pink.png",
  spark: "volt_cyan.png",
  "frost-ring": "ice_strike_white.png",
  mend: "hand_cyan.png",
  tide: "wave_white.png",
  undertow: "arc_wave_cyan.png",
  "glacier-bolt": "ice_blade_cyan.png",
  maelstrom: "whirlwind_red.png",
  deluge: "arc_wave_pink.png",
  "first-rite": "arcane_buff_purple.png",
  cantor: "arcane_buff_pink.png",
  breath: "hand_pink.png",
  "ward-chant": "augmentation_pink.png",
  litany: "arcane_pink.png",
  benediction: "augmentation_orange.png",
};

/** Compact SVG glyph paths kept as fallback (viewBox 0 0 64 64). */
const GLYPH: Record<string, string> = {
  "iron-oath": "M32 10 L48 18 V34 C48 46 40 54 32 58 C24 54 16 46 16 34 V18 Z",
  bastion: "M16 48 V22 L32 12 L48 22 V48 H16 M24 48 V34 H40 V48",
  spark: "M32 10 L36 28 H50 L38 36 L42 54 L32 42 L22 54 L26 36 L14 28 H28 Z",
};

const KIND_FALLBACK: Record<SkillKind, string> = {
  passive: "M32 16 A16 16 0 1 1 31.9 16",
  active: "M20 20 H44 V44 H20 Z",
  aura: "M32 14 A18 18 0 1 1 31.9 14",
  channel: "M18 40 C26 18 38 18 46 40",
  key: "M32 12 L44 32 L32 52 L20 32 Z",
  capstone: "M32 10 L50 22 V42 L32 54 L14 42 V22 Z",
};

/** LPC CC0 marks for keystone / class titles under `public/icons/keystones/`. */
const KEYSTONE_PNG: Record<string, string> = {
  bastion: "Ac_Medal01.png",
  ravager: "S_Axe01.png",
  cutpurse: "S_Dagger02.png",
  marksman: "S_Bow01.png",
  pyre: "S_Fire01.png",
  cantor: "S_Holy01.png",
  tide: "S_Magic02.png",
  venom: "S_Poison01.png",
};

const CLASS_PNG: Record<string, string> = {
  ...KEYSTONE_PNG,
  Unbound: "I_Crystal01.png",
  Bulwark: "Ac_Medal01.png",
  Shade: "S_Dagger02.png",
  Rite: "S_Holy01.png",
  Bleed: "S_Axe01.png",
  Holy: "S_Holy01.png",
  Air: "S_Buff05.png",
  Fire: "S_Fire01.png",
  Water: "S_Magic02.png",
  Poison: "S_Poison01.png",
  Unholy: "S_Magic01.png",
};

const RACE_PNG: Record<RaceId, string> = {
  human: "Ac_Medal02.png",
  elf: "I_Feather01.png",
  dwarf: "Ac_Medal03.png",
  gnome: "I_Crystal02.png",
  hobbit: "Ac_Medal04.png",
  insectoid: "I_Mirror.png",
  minotaur: "S_Axe01.png",
  golem: "S_Earth01.png",
};

function skillUrl(file: string): string {
  return `./icons/skills/${file}`;
}

function keystoneUrl(file: string): string {
  return `./icons/keystones/${file}`;
}

export function skillIconUrl(skillId: string): string | null {
  const file = SKILL_PNG[skillId];
  return file ? skillUrl(file) : null;
}

export function keystoneIconUrl(specId: string): string | null {
  const file = KEYSTONE_PNG[specId];
  return file ? keystoneUrl(file) : null;
}

export function classIconUrl(title: string): string {
  const file = CLASS_PNG[title] ?? CLASS_PNG.Unbound!;
  return keystoneUrl(file);
}

export function raceIconUrl(race: RaceId): string {
  return `./icons/races/${RACE_PNG[race]}`;
}

export function specLabelIconUrl(specId: string): string | null {
  if (!(specId in SPEC_LABEL)) return keystoneIconUrl(specId);
  return keystoneIconUrl(specId);
}

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

  const png = skill.kind === "key" || skill.kind === "capstone"
    ? (skill.spec ? keystoneIconUrl(skill.spec) : null) ?? skillIconUrl(skillId)
    : skillIconUrl(skillId);

  if (png) {
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("href", png);
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", png);
    img.setAttribute("x", "10");
    img.setAttribute("y", "10");
    img.setAttribute("width", "44");
    img.setAttribute("height", "44");
    img.setAttribute("preserveAspectRatio", "xMidYMid meet");
    img.style.opacity = lit ? "1" : "0.88";
    g.append(img);
  } else {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", GLYPH[skillId] ?? KIND_FALLBACK[skill.kind]);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "3.2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    g.append(path);
  }

  parent.append(g);
}
