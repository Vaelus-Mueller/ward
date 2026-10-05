import type { Mods, SectorId, SkillKind } from "./types";

export interface SkillNode {
  id: string;
  name: string;
  kind: SkillKind;
  sector: SectorId;
  spec: string | null;
  ring: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  angle: number;
  radius: number;
  maxRank: number;
  levelGate: number;
  requires: string[];
  requiresAny: string[];
  sectorPoints: number;
  specPoints: number;
  hub: boolean;
  blurb: string;
}

export interface ActiveSpec {
  kind: "melee" | "arc" | "nova" | "projectile" | "dash" | "buff" | "aura" | "channel";
  energyCost: number;
  cooldown: number;
  scaling: "melee" | "spell";
  mult: number;
  range: number;
  arc: number;
  shots: number;
  radial: boolean;
  stun: number;
  slow: number;
  slowDur: number;
  bleed: number;
  burn: number;
  healFrac: number;
  shieldFrac: number;
  invuln: number;
  dash: number;
  moveBuff: number;
  buffTime: number;
  channelTime: number;
  energyPerSec: number;
  aura: Partial<Mods>;
  color: string;
}

export const SECTORS: Record<
  SectorId,
  { label: string; blurb: string; color: string; angle: number; pair: SectorId }
> = {
  bleed: {
    label: "Bleed",
    blurb: "Steel and opened veins.",
    color: "#c4532a",
    angle: -Math.PI / 2,
    pair: "bleed",
  },
  holy: {
    label: "Holy",
    blurb: "Sacred light and true wards.",
    color: "#e7c39a",
    angle: -Math.PI / 2 + (2 * Math.PI) / 7,
    pair: "holy",
  },
  air: {
    label: "Air",
    blurb: "Gales, speed, and lightning steel.",
    color: "#7ec8e8",
    angle: -Math.PI / 2 + (4 * Math.PI) / 7,
    pair: "air",
  },
  fire: {
    label: "Fire",
    blurb: "Flame and molten stone.",
    color: "#ff6a2a",
    angle: -Math.PI / 2 + (6 * Math.PI) / 7,
    pair: "fire",
  },
  water: {
    label: "Water",
    blurb: "Tides and frost.",
    color: "#6aa8ff",
    angle: -Math.PI / 2 + (8 * Math.PI) / 7,
    pair: "water",
  },
  poison: {
    label: "Poison",
    blurb: "Toxins and venom.",
    color: "#6ecf7a",
    angle: -Math.PI / 2 + (10 * Math.PI) / 7,
    pair: "poison",
  },
  unholy: {
    label: "Unholy",
    blurb: "Blight and shadow chants.",
    color: "#a894e6",
    angle: -Math.PI / 2 + (12 * Math.PI) / 7,
    pair: "unholy",
  },
};

export const SPEC_LABEL: Record<string, string> = {
  bastion: "Bastion",
  ravager: "Ravager",
  cutpurse: "Cutpurse",
  marksman: "Marksman",
  pyre: "Pyre",
  cantor: "Cantor",
  tide: "Tide",
  venom: "Venom",
};

const DEG = Math.PI / 180;

function place(sector: SectorId, offsetDeg: number, radius: number) {
  return { sector, angle: SECTORS[sector].angle + offsetDeg * DEG, radius };
}

function node(
  partial: Pick<SkillNode, "id" | "name" | "kind" | "blurb"> & {
    sector: SectorId;
    offset: number;
    radius: number;
    ring: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    spec?: string | null;
    maxRank?: number;
    levelGate?: number;
    requires?: string[];
    requiresAny?: string[];
    sectorPoints?: number;
    specPoints?: number;
    hub?: boolean;
  },
): SkillNode {
  const spot = place(partial.sector, partial.offset, partial.radius);
  return {
    id: partial.id,
    name: partial.name,
    kind: partial.kind,
    sector: partial.sector,
    spec: partial.spec ?? null,
    ring: partial.ring,
    angle: spot.angle,
    radius: spot.radius,
    maxRank: partial.maxRank ?? (partial.kind === "capstone" ? 1 : 20),
    levelGate: partial.levelGate ?? (partial.hub ? 1 : 2),
    requires: partial.requires ?? [],
    requiresAny: partial.requiresAny ?? [],
    sectorPoints: 0,
    specPoints: 0,
    hub: partial.hub ?? false,
    blurb: partial.blurb,
  };
}

export const SKILLS: SkillNode[] = [
  // —— Holy ——
  node({ id: "iron-oath", name: "Iron Oath", kind: "passive", sector: "holy", offset: 0, radius: 0.26, ring: 1, hub: true, levelGate: 1, blurb: "Swear to the gate. Armor and melee blows thicken." }),
  node({ id: "braced-guard", name: "Braced Guard", kind: "passive", sector: "holy", offset: -18, radius: 0.42, ring: 2, requires: ["iron-oath"], blurb: "Set your stance. Flat armor each rank." }),
  node({ id: "stone-skin", name: "Stone Skin", kind: "passive", sector: "holy", offset: 18, radius: 0.42, ring: 2, requires: ["iron-oath"], blurb: "Hide hardens. More armor and life." }),
  node({ id: "bulwark-aura", name: "Bulwark", kind: "aura", sector: "holy", offset: 0, radius: 0.58, ring: 3, requires: ["stone-skin"], blurb: "Hold a warding stance. Drains energy." }),
  node({ id: "bastion", name: "Bastion", kind: "key", sector: "holy", spec: "bastion", offset: -16, radius: 0.72, ring: 4, levelGate: 6, requires: ["braced-guard"], blurb: "The key of walls. Armor and slow mending." }),
  node({ id: "iron-blood", name: "Iron Blood", kind: "passive", sector: "holy", spec: "bastion", offset: -22, radius: 0.86, ring: 5, requires: ["bastion"], blurb: "Life pooled behind the wall." }),
  node({ id: "shield-bash", name: "Shield Bash", kind: "active", sector: "holy", spec: "bastion", offset: -8, radius: 0.86, ring: 5, requires: ["bastion"], blurb: "A short arc that stuns." }),
  node({ id: "aegis", name: "Aegis", kind: "active", sector: "holy", spec: "bastion", offset: -14, radius: 1.0, ring: 6, levelGate: 10, requiresAny: ["iron-blood", "shield-bash"], blurb: "A shell of life that soaks the next blows." }),
  node({ id: "citadel", name: "Citadel", kind: "capstone", sector: "holy", spec: "bastion", offset: -14, radius: 1.14, ring: 7, levelGate: 16, maxRank: 1, requires: ["aegis"], blurb: "The outer wall. Armor and blows turned aside." }),

  // —— Bleed ——
  node({ id: "blood-oath", name: "Blood Oath", kind: "passive", sector: "bleed", offset: 0, radius: 0.26, ring: 1, hub: true, levelGate: 1, blurb: "Swear in steel. Melee blows bite deeper." }),
  node({ id: "heavy-blow", name: "Heavy Blow", kind: "active", sector: "bleed", offset: 0, radius: 0.42, ring: 2, requires: ["blood-oath"], blurb: "A committed strike that staggers." }),
  node({ id: "cleave", name: "Cleave", kind: "active", sector: "bleed", offset: -16, radius: 0.58, ring: 3, requires: ["heavy-blow"], blurb: "A wide cut in front of you." }),
  node({ id: "ravager", name: "Ravager", kind: "key", sector: "bleed", spec: "ravager", offset: 16, radius: 0.72, ring: 4, levelGate: 6, requires: ["cleave"], blurb: "The key of breaking. Melee hits harder." }),
  node({ id: "wrath-speed", name: "Wrath Pace", kind: "passive", sector: "bleed", spec: "ravager", offset: 8, radius: 0.86, ring: 5, requires: ["ravager"], blurb: "Faster swings." }),
  node({ id: "ruin-strike", name: "Ruin Strike", kind: "active", sector: "bleed", spec: "ravager", offset: 22, radius: 0.86, ring: 5, requires: ["ravager"], blurb: "One heavy blow. Long recovery." }),
  node({ id: "breaker", name: "Breaker", kind: "active", sector: "bleed", spec: "ravager", offset: 14, radius: 1.0, ring: 6, levelGate: 10, requiresAny: ["wrath-speed", "ruin-strike"], blurb: "A shockwave around you." }),
  node({ id: "sundering", name: "Sundering", kind: "capstone", sector: "bleed", spec: "ravager", offset: 14, radius: 1.14, ring: 7, levelGate: 16, maxRank: 1, requires: ["breaker"], blurb: "A wider shock that staggers everything close." }),

  // —— Air ——
  node({ id: "keen-edge", name: "Keen Edge", kind: "passive", sector: "air", offset: 0, radius: 0.26, ring: 1, hub: true, levelGate: 1, blurb: "The first cut is the true one. Crit and a lighter step." }),
  node({ id: "fleet-step", name: "Fleet Step", kind: "passive", sector: "air", offset: -18, radius: 0.42, ring: 2, requires: ["keen-edge"], blurb: "Move faster each rank." }),
  node({ id: "lunge", name: "Lunge", kind: "active", sector: "air", offset: 0, radius: 0.42, ring: 2, requires: ["keen-edge"], blurb: "Dash and strike along your facing." }),
  node({ id: "knife-fan", name: "Knife Fan", kind: "active", sector: "air", offset: -12, radius: 0.58, ring: 3, requires: ["lunge"], blurb: "Three knives in a spread." }),
  node({ id: "slip", name: "Slip", kind: "active", sector: "air", offset: 14, radius: 0.58, ring: 3, requires: ["fleet-step"], blurb: "A brief step out of harm and a burst of speed." }),
  node({ id: "marksman", name: "Marksman", kind: "key", sector: "air", spec: "marksman", offset: 0, radius: 0.72, ring: 4, levelGate: 6, requiresAny: ["knife-fan", "lunge"], blurb: "The key of thrown and shot weapons." }),
  node({ id: "keen-eye", name: "Keen Eye", kind: "passive", sector: "air", spec: "marksman", offset: -10, radius: 0.86, ring: 5, requires: ["marksman"], blurb: "Attack rating, so fewer swings miss." }),
  node({ id: "piercing-throw", name: "Piercing Throw", kind: "active", sector: "air", spec: "marksman", offset: 12, radius: 0.86, ring: 5, requires: ["marksman"], blurb: "A hard thrown blade." }),
  node({ id: "ash-rain", name: "Ash Rain", kind: "active", sector: "air", spec: "marksman", offset: 0, radius: 1.0, ring: 6, levelGate: 10, requiresAny: ["keen-eye", "piercing-throw"], blurb: "Blades outward in a ring." }),
  node({ id: "deadeye", name: "Deadeye", kind: "capstone", sector: "air", spec: "marksman", offset: 0, radius: 1.14, ring: 7, levelGate: 16, maxRank: 1, requires: ["ash-rain"], blurb: "Thrown weapons bite deeper, and crit more often." }),

  // —— Poison ——
  node({ id: "open-vein", name: "Open Vein", kind: "passive", sector: "poison", offset: 0, radius: 0.26, ring: 1, hub: true, levelGate: 1, blurb: "Hits can bleed and poison the wound." }),
  node({ id: "toxin-coat", name: "Toxin Coat", kind: "passive", sector: "poison", offset: -14, radius: 0.42, ring: 2, requires: ["open-vein"], blurb: "Bleeds land more readily." }),
  node({ id: "cutpurse", name: "Cutpurse", kind: "key", sector: "poison", spec: "cutpurse", offset: 0, radius: 0.72, ring: 4, levelGate: 6, requires: ["toxin-coat"], blurb: "The key of bleeding targets and found coin." }),
  node({ id: "deep-cut", name: "Deep Cut", kind: "passive", sector: "poison", spec: "cutpurse", offset: -12, radius: 0.86, ring: 5, requires: ["cutpurse"], blurb: "Bleeds land more often." }),
  node({ id: "tendon-cut", name: "Tendon Cut", kind: "active", sector: "poison", spec: "cutpurse", offset: 12, radius: 0.86, ring: 5, requires: ["cutpurse"], blurb: "A cut that slows." }),
  node({ id: "veiled-strike", name: "Veiled Strike", kind: "active", sector: "poison", spec: "cutpurse", offset: 0, radius: 1.0, ring: 6, levelGate: 10, requiresAny: ["deep-cut", "tendon-cut"], blurb: "Dash through them. Far more likely to critical." }),
  node({ id: "hemorrhage", name: "Hemorrhage", kind: "capstone", sector: "poison", spec: "cutpurse", offset: 0, radius: 1.14, ring: 7, levelGate: 16, maxRank: 1, requires: ["veiled-strike"], blurb: "Opened wounds bleed harder and more often." }),

  // —— Fire ——
  node({ id: "ember-flow", name: "Ember Flow", kind: "passive", sector: "fire", offset: 0, radius: 0.26, ring: 1, hub: true, levelGate: 1, blurb: "A coal under the ash. Energy returns faster." }),
  node({ id: "kindling", name: "Kindling", kind: "passive", sector: "fire", offset: -12, radius: 0.42, ring: 2, requires: ["ember-flow"], blurb: "Spells burn hotter." }),
  node({ id: "pyre", name: "Pyre", kind: "key", sector: "fire", spec: "pyre", offset: 0, radius: 0.72, ring: 4, levelGate: 6, requires: ["kindling"], blurb: "The key of fire." }),
  node({ id: "cinder-lance", name: "Cinder Lance", kind: "active", sector: "fire", spec: "pyre", offset: -10, radius: 0.86, ring: 5, requires: ["pyre"], blurb: "A burning lance." }),
  node({ id: "ash-plume", name: "Ash Plume", kind: "passive", sector: "fire", spec: "pyre", offset: 12, radius: 0.86, ring: 5, requires: ["pyre"], blurb: "Spell power from the rising ash." }),
  node({ id: "conflagration", name: "Conflagration", kind: "active", sector: "fire", spec: "pyre", offset: 0, radius: 1.0, ring: 6, levelGate: 10, requiresAny: ["cinder-lance", "ash-plume"], blurb: "Fire in every direction." }),
  node({ id: "inferno", name: "Inferno", kind: "capstone", sector: "fire", spec: "pyre", offset: 0, radius: 1.14, ring: 7, levelGate: 16, maxRank: 1, requires: ["conflagration"], blurb: "A larger fire that keeps burning." }),

  // —— Water ——
  node({ id: "reservoir", name: "Reservoir", kind: "passive", sector: "water", offset: 0, radius: 0.26, ring: 1, hub: true, levelGate: 1, blurb: "A deep well of energy." }),
  node({ id: "spark", name: "Spark", kind: "active", sector: "water", offset: 0, radius: 0.42, ring: 2, requires: ["reservoir"], blurb: "A fast bolt of cold light." }),
  node({ id: "frost-ring", name: "Rime Ring", kind: "active", sector: "water", offset: -12, radius: 0.58, ring: 3, requires: ["spark"], blurb: "A cold ring that slows." }),
  node({ id: "mend", name: "Mend", kind: "channel", sector: "water", offset: 14, radius: 0.58, ring: 3, requires: ["reservoir"], blurb: "Channel to knit wounds. Stun or knockback breaks it." }),
  node({ id: "tide", name: "Tide", kind: "key", sector: "water", spec: "tide", offset: 0, radius: 0.72, ring: 4, levelGate: 6, requiresAny: ["frost-ring", "mend"], blurb: "The key of tides and frost breath." }),
  node({ id: "undertow", name: "Undertow", kind: "passive", sector: "water", spec: "tide", offset: -10, radius: 0.86, ring: 5, requires: ["tide"], blurb: "Slows linger; energy wells deeper." }),
  node({ id: "glacier-bolt", name: "Glacier Bolt", kind: "active", sector: "water", spec: "tide", offset: 12, radius: 0.86, ring: 5, requires: ["tide"], blurb: "A heavy frost bolt." }),
  node({ id: "maelstrom", name: "Maelstrom", kind: "active", sector: "water", spec: "tide", offset: 0, radius: 1.0, ring: 6, levelGate: 10, requiresAny: ["undertow", "glacier-bolt"], blurb: "A spinning ring of ice and tide." }),
  node({ id: "deluge", name: "Deluge", kind: "capstone", sector: "water", spec: "tide", offset: 0, radius: 1.14, ring: 7, levelGate: 16, maxRank: 1, requires: ["maelstrom"], blurb: "A crushing wave that freezes the field." }),

  // —— Unholy ——
  node({ id: "first-rite", name: "First Rite", kind: "passive", sector: "unholy", offset: 0, radius: 0.26, ring: 1, hub: true, levelGate: 1, blurb: "The opening verse. Spell power and energy." }),
  node({ id: "cantor", name: "Cantor", kind: "key", sector: "unholy", spec: "cantor", offset: 0, radius: 0.72, ring: 4, levelGate: 6, requires: ["first-rite"], blurb: "The key of chants, wards, and breath." }),
  node({ id: "breath", name: "Breath", kind: "passive", sector: "unholy", spec: "cantor", offset: -12, radius: 0.86, ring: 5, requires: ["cantor"], blurb: "A steadier return of energy." }),
  node({ id: "ward-chant", name: "Ward Chant", kind: "aura", sector: "unholy", spec: "cantor", offset: 12, radius: 0.86, ring: 5, requires: ["cantor"], blurb: "A sung ward. Drains energy while it holds." }),
  node({ id: "litany", name: "Litany", kind: "channel", sector: "unholy", spec: "cantor", offset: 0, radius: 1.0, ring: 6, levelGate: 10, requiresAny: ["breath", "ward-chant"], blurb: "Channel life and energy. Stun or knockback breaks it." }),
  node({ id: "benediction", name: "Benediction", kind: "capstone", sector: "unholy", spec: "cantor", offset: 0, radius: 1.14, ring: 7, levelGate: 16, maxRank: 1, requires: ["litany"], blurb: "The outer chant. Life and energy return faster." }),
];

const byId = new Map(SKILLS.map((skill) => [skill.id, skill]));

export function skillById(id: string): SkillNode | undefined {
  return byId.get(id);
}

export const PASSIVE_PER_RANK: Record<string, Partial<Mods>> = {
  "iron-oath": { armor: 1.2, meleeMult: 0.005 },
  "braced-guard": { armor: 6 },
  "stone-skin": { armorPct: 0.04, life: 5 },
  bastion: { armor: 1.6, lifeRegen: 0.055 },
  "iron-blood": { life: 12 },
  citadel: { armor: 40, damageReduction: 0.08 },
  "blood-oath": { meleeMult: 0.01, crit: 0.002 },
  ravager: { meleeMult: 0.01 },
  "wrath-speed": { attackSpeed: 0.045 },
  "keen-edge": { crit: 0.004, moveSpeed: 0.004 },
  "fleet-step": { moveSpeed: 0.05 },
  marksman: { projectileMult: 0.01 },
  "keen-eye": { attackRating: 10 },
  deadeye: { projectileMult: 0.12, crit: 0.04 },
  "open-vein": { bleedChance: 0.07 },
  "toxin-coat": { bleedChance: 0.04 },
  cutpurse: { crit: 0.003, goldFind: 0.012 },
  "deep-cut": { bleedChance: 0.06 },
  hemorrhage: { bleedChance: 0.12 },
  "ember-flow": { energyRegen: 0.4 },
  kindling: { spellMult: 0.035 },
  pyre: { spellMult: 0.01 },
  "ash-plume": { spellMult: 0.02, energyRegen: 0.15 },
  reservoir: { energy: 8 },
  tide: { energy: 2, cdr: 0.004 },
  undertow: { energy: 4, energyRegen: 0.2 },
  "first-rite": { spellMult: 0.01, energy: 1 },
  cantor: { energy: 1.2, cdr: 0.004 },
  breath: { energyRegen: 0.45 },
  benediction: { lifeRegen: 1.2, energyRegen: 0.8 },
};

/** Target (mult × shots / cooldown) for damaging actives at rank 1, before CDR. */
export const SKILL_DPS_TARGET = 0.5;

function act(partial: Partial<ActiveSpec> & Pick<ActiveSpec, "kind" | "color">): ActiveSpec {
  return {
    energyCost: 0,
    cooldown: 4,
    scaling: "melee",
    mult: 1,
    range: 80,
    arc: Math.PI * 0.7,
    shots: 1,
    radial: false,
    stun: 0,
    slow: 0,
    slowDur: 0,
    bleed: 0,
    burn: 0,
    healFrac: 0,
    shieldFrac: 0,
    invuln: 0,
    dash: 0,
    moveBuff: 0,
    buffTime: 0,
    channelTime: 0,
    energyPerSec: 0,
    aura: {},
    ...partial,
  };
}

/** Rank-1 damage multiplier so (mult × shots / cooldown) ≈ SKILL_DPS_TARGET. */
function dpsMult(cooldown: number, shots = 1): number {
  return Math.round((SKILL_DPS_TARGET * cooldown) / Math.max(1, shots) * 100) / 100;
}

export const ACTIVES: Record<string, ActiveSpec> = {
  "heavy-blow": act({ kind: "melee", color: "#e08a4f", energyCost: 4, cooldown: 3.1, mult: dpsMult(3.1), range: 82, stun: 0.4 }),
  cleave: act({ kind: "arc", color: "#e08a4f", energyCost: 8, cooldown: 4.2, mult: dpsMult(4.2), range: 96 }),
  "bulwark-aura": act({
    kind: "aura",
    color: "#e08a4f",
    energyPerSec: 2,
    aura: { armor: 18, damageReduction: 0.08 },
  }),
  "shield-bash": act({ kind: "arc", color: "#e7c39a", energyCost: 8, cooldown: 5, mult: dpsMult(5), range: 88, stun: 0.75 }),
  aegis: act({ kind: "buff", color: "#f0e2cf", energyCost: 16, cooldown: 14, shieldFrac: 0.3, buffTime: 6 }),
  "ruin-strike": act({ kind: "melee", color: "#c4532a", energyCost: 10, cooldown: 6, mult: dpsMult(6), range: 84 }),
  breaker: act({ kind: "nova", color: "#e08a4f", energyCost: 18, cooldown: 12, mult: dpsMult(12), range: 150, stun: 0.3 }),
  lunge: act({ kind: "dash", color: "#3ecfb0", energyCost: 6, cooldown: 3.6, mult: dpsMult(3.6), dash: 128, range: 70 }),
  "knife-fan": act({
    kind: "projectile",
    color: "#d7fff4",
    energyCost: 8,
    cooldown: 4,
    scaling: "melee",
    mult: dpsMult(4, 3),
    shots: 3,
    range: 340,
  }),
  slip: act({ kind: "buff", color: "#9ff3e0", energyCost: 8, cooldown: 7, invuln: 0.45, moveBuff: 0.35, buffTime: 1.15 }),
  "tendon-cut": act({
    kind: "melee",
    color: "#3ecfb0",
    energyCost: 6,
    cooldown: 4,
    mult: dpsMult(4),
    range: 78,
    slow: 0.45,
    slowDur: 2.2,
  }),
  "veiled-strike": act({
    kind: "dash",
    color: "#effffb",
    energyCost: 12,
    cooldown: 8,
    mult: dpsMult(8),
    dash: 150,
    range: 74,
    bleed: 1,
  }),
  "piercing-throw": act({
    kind: "projectile",
    color: "#b8fff0",
    energyCost: 7,
    cooldown: 3.2,
    scaling: "melee",
    mult: dpsMult(3.2),
    shots: 1,
    range: 420,
  }),
  "ash-rain": act({
    kind: "projectile",
    color: "#e7fff8",
    energyCost: 16,
    cooldown: 10,
    scaling: "melee",
    mult: dpsMult(10, 6),
    shots: 6,
    radial: true,
    range: 300,
  }),
  spark: act({ kind: "projectile", color: "#d8ccff", energyCost: 5, cooldown: 1.55, scaling: "spell", mult: dpsMult(1.55), shots: 1, range: 380 }),
  "frost-ring": act({
    kind: "nova",
    color: "#b9d4ff",
    energyCost: 12,
    cooldown: 6,
    scaling: "spell",
    mult: dpsMult(6),
    range: 192,
    slow: 0.4,
    slowDur: 2.4,
  }),
  mend: act({ kind: "channel", color: "#d2ffe8", energyCost: 8, cooldown: 8, channelTime: 2.1, healFrac: 0.22 }),
  "cinder-lance": act({
    kind: "projectile",
    color: "#ffb077",
    energyCost: 10,
    cooldown: 3.4,
    scaling: "spell",
    mult: dpsMult(3.4),
    shots: 1,
    range: 400,
    burn: 4,
  }),
  conflagration: act({
    kind: "nova",
    color: "#ff8a3d",
    energyCost: 20,
    cooldown: 11,
    scaling: "spell",
    mult: dpsMult(11),
    range: 156,
    burn: 5,
  }),
  "ward-chant": act({
    kind: "aura",
    color: "#c3b6ff",
    energyPerSec: 2.2,
    aura: { damageReduction: 0.12, armor: 10 },
  }),
  litany: act({ kind: "channel", color: "#f3e9ff", energyCost: 0, cooldown: 12, channelTime: 2.4, healFrac: 0.16 }),
  sundering: act({ kind: "nova", color: "#c4532a", energyCost: 22, cooldown: 14, mult: dpsMult(14), range: 180, stun: 0.45 }),
  inferno: act({ kind: "nova", color: "#ff5a1f", energyCost: 24, cooldown: 13, scaling: "spell", mult: dpsMult(13), range: 210, burn: 7 }),
  "glacier-bolt": act({
    kind: "projectile",
    color: "#b9d4ff",
    energyCost: 9,
    cooldown: 3.2,
    scaling: "spell",
    mult: dpsMult(3.2),
    shots: 1,
    range: 400,
    slow: 0.35,
    slowDur: 2,
  }),
  maelstrom: act({
    kind: "nova",
    color: "#8ec8ff",
    energyCost: 18,
    cooldown: 11,
    scaling: "spell",
    mult: dpsMult(11),
    range: 170,
    slow: 0.4,
    slowDur: 2.2,
  }),
  deluge: act({
    kind: "nova",
    color: "#6aa8ff",
    energyCost: 24,
    cooldown: 14,
    scaling: "spell",
    mult: dpsMult(14),
    range: 220,
    slow: 0.5,
    slowDur: 2.8,
    stun: 0.25,
  }),
};

/**
 * Earlier tree nodes that feed a small bonus into this skill.
 * Each non-hub skill lists 1–4 feeders that sit earlier on its branch.
 * Per-rank bonuses stay small so investing early nodes still matters late.
 */
export interface SynergyLink {
  from: string;
  /** Extra damage / aura / heal power per feeder rank. */
  powerPerRank?: number;
  /** Cooldown cut per feeder rank (actives). */
  cdrPerRank?: number;
}

export const SKILL_SYNERGIES: Record<string, SynergyLink[]> = {
  // Holy
  "braced-guard": [{ from: "iron-oath", powerPerRank: 0.02 }],
  "stone-skin": [{ from: "iron-oath", powerPerRank: 0.02 }],
  "bulwark-aura": [
    { from: "stone-skin", powerPerRank: 0.025 },
    { from: "braced-guard", powerPerRank: 0.025 },
    { from: "iron-oath", powerPerRank: 0.015 },
  ],
  bastion: [
    { from: "braced-guard", powerPerRank: 0.02 },
    { from: "stone-skin", powerPerRank: 0.02 },
    { from: "iron-oath", powerPerRank: 0.015 },
  ],
  "iron-blood": [
    { from: "bastion", powerPerRank: 0.025 },
    { from: "stone-skin", powerPerRank: 0.02 },
    { from: "braced-guard", powerPerRank: 0.015 },
  ],
  "shield-bash": [
    { from: "bastion", powerPerRank: 0.03 },
    { from: "braced-guard", powerPerRank: 0.025 },
    { from: "iron-oath", powerPerRank: 0.015 },
  ],
  aegis: [
    { from: "shield-bash", powerPerRank: 0.025 },
    { from: "iron-blood", powerPerRank: 0.03 },
    { from: "bastion", powerPerRank: 0.02 },
    { from: "braced-guard", powerPerRank: 0.015 },
  ],
  citadel: [
    { from: "aegis", powerPerRank: 0.03 },
    { from: "iron-blood", powerPerRank: 0.025 },
    { from: "bastion", powerPerRank: 0.02 },
    { from: "stone-skin", powerPerRank: 0.015 },
  ],

  // Bleed
  "heavy-blow": [{ from: "blood-oath", powerPerRank: 0.035 }],
  cleave: [
    { from: "heavy-blow", powerPerRank: 0.03 },
    { from: "blood-oath", powerPerRank: 0.02 },
  ],
  ravager: [
    { from: "heavy-blow", powerPerRank: 0.025 },
    { from: "cleave", powerPerRank: 0.02 },
    { from: "blood-oath", powerPerRank: 0.015 },
  ],
  "wrath-speed": [
    { from: "ravager", powerPerRank: 0.025 },
    { from: "heavy-blow", powerPerRank: 0.02 },
    { from: "blood-oath", powerPerRank: 0.015 },
  ],
  "ruin-strike": [
    { from: "ravager", powerPerRank: 0.03 },
    { from: "heavy-blow", powerPerRank: 0.03 },
    { from: "cleave", powerPerRank: 0.02 },
  ],
  breaker: [
    { from: "ruin-strike", powerPerRank: 0.03 },
    { from: "cleave", powerPerRank: 0.025 },
    { from: "wrath-speed", powerPerRank: 0.02 },
    { from: "heavy-blow", powerPerRank: 0.015 },
  ],
  sundering: [
    { from: "breaker", powerPerRank: 0.035 },
    { from: "ruin-strike", powerPerRank: 0.025 },
    { from: "cleave", powerPerRank: 0.02 },
    { from: "ravager", powerPerRank: 0.015 },
  ],

  // Air
  "fleet-step": [{ from: "keen-edge", powerPerRank: 0.02 }],
  lunge: [{ from: "keen-edge", powerPerRank: 0.035 }],
  "knife-fan": [
    { from: "lunge", powerPerRank: 0.03 },
    { from: "keen-edge", powerPerRank: 0.02 },
  ],
  slip: [
    { from: "fleet-step", powerPerRank: 0.03 },
    { from: "keen-edge", powerPerRank: 0.02 },
  ],
  marksman: [
    { from: "knife-fan", powerPerRank: 0.025 },
    { from: "lunge", powerPerRank: 0.02 },
    { from: "keen-edge", powerPerRank: 0.015 },
  ],
  "keen-eye": [
    { from: "marksman", powerPerRank: 0.025 },
    { from: "knife-fan", powerPerRank: 0.02 },
    { from: "keen-edge", powerPerRank: 0.015 },
  ],
  "piercing-throw": [
    { from: "marksman", powerPerRank: 0.03 },
    { from: "knife-fan", powerPerRank: 0.025 },
    { from: "keen-eye", powerPerRank: 0.02 },
  ],
  "ash-rain": [
    { from: "piercing-throw", powerPerRank: 0.03 },
    { from: "knife-fan", powerPerRank: 0.025 },
    { from: "keen-eye", powerPerRank: 0.02 },
    { from: "marksman", powerPerRank: 0.015 },
  ],
  deadeye: [
    { from: "ash-rain", powerPerRank: 0.03 },
    { from: "piercing-throw", powerPerRank: 0.025 },
    { from: "keen-eye", powerPerRank: 0.02 },
    { from: "marksman", powerPerRank: 0.015 },
  ],

  // Poison
  "toxin-coat": [{ from: "open-vein", powerPerRank: 0.025 }],
  cutpurse: [
    { from: "toxin-coat", powerPerRank: 0.025 },
    { from: "open-vein", powerPerRank: 0.02 },
  ],
  "deep-cut": [
    { from: "cutpurse", powerPerRank: 0.025 },
    { from: "open-vein", powerPerRank: 0.025 },
    { from: "toxin-coat", powerPerRank: 0.015 },
  ],
  "tendon-cut": [
    { from: "cutpurse", powerPerRank: 0.03 },
    { from: "open-vein", powerPerRank: 0.025 },
    { from: "toxin-coat", powerPerRank: 0.015 },
  ],
  "veiled-strike": [
    { from: "tendon-cut", powerPerRank: 0.03 },
    { from: "deep-cut", powerPerRank: 0.025 },
    { from: "open-vein", powerPerRank: 0.02 },
    { from: "toxin-coat", powerPerRank: 0.015 },
  ],
  hemorrhage: [
    { from: "veiled-strike", powerPerRank: 0.03 },
    { from: "deep-cut", powerPerRank: 0.025 },
    { from: "open-vein", powerPerRank: 0.02 },
    { from: "cutpurse", powerPerRank: 0.015 },
  ],

  // Fire
  kindling: [{ from: "ember-flow", powerPerRank: 0.025 }],
  pyre: [
    { from: "kindling", powerPerRank: 0.025 },
    { from: "ember-flow", powerPerRank: 0.02 },
  ],
  "cinder-lance": [
    { from: "pyre", powerPerRank: 0.03 },
    { from: "kindling", powerPerRank: 0.025 },
    { from: "ember-flow", powerPerRank: 0.015 },
  ],
  "ash-plume": [
    { from: "pyre", powerPerRank: 0.025 },
    { from: "kindling", powerPerRank: 0.02 },
    { from: "ember-flow", powerPerRank: 0.015 },
  ],
  conflagration: [
    { from: "cinder-lance", powerPerRank: 0.03 },
    { from: "ash-plume", powerPerRank: 0.025 },
    { from: "kindling", powerPerRank: 0.02 },
    { from: "pyre", powerPerRank: 0.015 },
  ],
  inferno: [
    { from: "conflagration", powerPerRank: 0.035 },
    { from: "cinder-lance", powerPerRank: 0.025 },
    { from: "kindling", powerPerRank: 0.02 },
    { from: "ash-plume", powerPerRank: 0.015 },
  ],

  // Water
  spark: [{ from: "reservoir", powerPerRank: 0.035 }],
  "frost-ring": [
    { from: "spark", powerPerRank: 0.03 },
    { from: "reservoir", powerPerRank: 0.02 },
  ],
  mend: [
    { from: "reservoir", powerPerRank: 0.03 },
    { from: "spark", powerPerRank: 0.015 },
  ],
  tide: [
    { from: "frost-ring", powerPerRank: 0.025 },
    { from: "mend", powerPerRank: 0.02 },
    { from: "reservoir", powerPerRank: 0.015 },
  ],
  undertow: [
    { from: "tide", powerPerRank: 0.025 },
    { from: "frost-ring", powerPerRank: 0.02 },
    { from: "reservoir", powerPerRank: 0.015 },
  ],
  "glacier-bolt": [
    { from: "tide", powerPerRank: 0.03 },
    { from: "spark", powerPerRank: 0.025 },
    { from: "frost-ring", powerPerRank: 0.02 },
  ],
  maelstrom: [
    { from: "glacier-bolt", powerPerRank: 0.03 },
    { from: "undertow", powerPerRank: 0.025 },
    { from: "frost-ring", powerPerRank: 0.02 },
    { from: "tide", powerPerRank: 0.015 },
  ],
  deluge: [
    { from: "maelstrom", powerPerRank: 0.035 },
    { from: "glacier-bolt", powerPerRank: 0.025 },
    { from: "undertow", powerPerRank: 0.02 },
    { from: "tide", powerPerRank: 0.015 },
  ],

  // Unholy
  cantor: [{ from: "first-rite", powerPerRank: 0.03 }],
  breath: [
    { from: "cantor", powerPerRank: 0.025 },
    { from: "first-rite", powerPerRank: 0.02 },
  ],
  "ward-chant": [
    { from: "cantor", powerPerRank: 0.03 },
    { from: "breath", powerPerRank: 0.025 },
    { from: "first-rite", powerPerRank: 0.015 },
  ],
  litany: [
    { from: "ward-chant", powerPerRank: 0.03 },
    { from: "breath", powerPerRank: 0.025 },
    { from: "cantor", powerPerRank: 0.02 },
    { from: "first-rite", powerPerRank: 0.015 },
  ],
  benediction: [
    { from: "litany", powerPerRank: 0.03 },
    { from: "breath", powerPerRank: 0.025 },
    { from: "ward-chant", powerPerRank: 0.02 },
    { from: "cantor", powerPerRank: 0.015 },
  ],
};

/** Sum of synergy power from invested feeder ranks (0 = no bonus). */
export function synergyPower(id: string, ranks: Record<string, number>): number {
  const links = SKILL_SYNERGIES[id];
  if (!links?.length) return 0;
  let total = 0;
  for (const link of links) {
    const feeder = ranks[link.from] ?? 0;
    if (feeder <= 0) continue;
    total += feeder * (link.powerPerRank ?? 0);
  }
  return total;
}

/** Synergy cooldown multiplier (≤ 1). */
export function synergyCdMul(id: string, ranks: Record<string, number>): number {
  const links = SKILL_SYNERGIES[id];
  if (!links?.length) return 1;
  let cut = 0;
  for (const link of links) {
    const feeder = ranks[link.from] ?? 0;
    if (feeder <= 0) continue;
    cut += feeder * (link.cdrPerRank ?? 0.004);
  }
  return Math.max(0.82, 1 - cut);
}

export function synergiesFor(id: string): SynergyLink[] {
  return SKILL_SYNERGIES[id] ?? [];
}

export function passiveContribution(id: string, rank: number, ranks: Record<string, number> = {}): Partial<Mods> {
  const per = PASSIVE_PER_RANK[id];
  if (!per || rank <= 0) return {};
  const syn = 1 + synergyPower(id, ranks);
  const out: Partial<Mods> = {};
  for (const key of Object.keys(per) as (keyof Mods)[]) {
    const value = per[key];
    if (typeof value === "number") out[key] = value * rank * syn;
  }
  return out;
}

/** Base cast DPS before rank/gear cooldown modifiers: (mult × shots) / cooldown. */
export function activeBaseDps(spec: ActiveSpec): number | null {
  if (spec.kind === "aura" || spec.kind === "buff" || spec.kind === "channel") return null;
  if (spec.mult <= 0 || spec.cooldown <= 0) return null;
  return (spec.mult * Math.max(1, spec.shots)) / spec.cooldown;
}

export function scaledActive(id: string, rank: number, ranks: Record<string, number> = {}): ActiveSpec | null {
  const spec = ACTIVES[id];
  if (!spec || rank <= 0) return null;
  const steps = rank - 1;
  // Damage climbs with ranks; cooldown trim stays mild so base DPS balance still holds.
  const cdScale = Math.max(0.7, 1 - 0.015 * steps);
  const syn = 1 + synergyPower(id, ranks);
  const cdSyn = synergyCdMul(id, ranks);
  return {
    ...spec,
    mult: spec.mult * (1 + 0.12 * steps) * syn,
    cooldown: spec.cooldown * cdScale * cdSyn,
    energyCost: spec.energyCost,
    healFrac: spec.healFrac * (1 + 0.1 * steps) * syn,
    burn: spec.burn * (1 + 0.12 * steps) * syn,
    shieldFrac: spec.shieldFrac * (1 + 0.08 * steps) * syn,
    aura: scaleAura(spec.aura, rank, syn),
  };
}

function scaleAura(aura: Partial<Mods>, rank: number, syn = 1): Partial<Mods> {
  const out: Partial<Mods> = {};
  for (const key of Object.keys(aura) as (keyof Mods)[]) {
    const value = aura[key];
    if (typeof value === "number") out[key] = value * (1 + 0.12 * (rank - 1)) * syn;
  }
  return out;
}

const MOD_LABEL: Partial<Record<keyof Mods, (value: number) => string>> = {
  life: (value) => `${signed(value)} life`,
  energy: (value) => `${signed(value)} energy`,
  energyMax: (value) => `${signed(value)} max energy`,
  energyOnHit: (value) => `${signed(value)} energy on hit`,
  chargeMax: (value) => `${signed(value)} skill charges`,
  armor: (value) => `${signed(Math.round(value))} armor`,
  armorPct: (value) => `${signedPct(value)} armor`,
  meleeMult: (value) => `${signedPct(value)} melee damage`,
  spellMult: (value) => `${signedPct(value)} spell damage`,
  attackSpeed: (value) => `${signedPct(value)} attack speed`,
  moveSpeed: (value) => `${signedPct(value)} move speed`,
  crit: (value) => `${signedPct(value)} critical chance`,
  attackRating: (value) => `${signed(Math.round(value))} attack rating`,
  lifeRegen: (value) => `${value.toFixed(1)} life each second`,
  energyRegen: (value) => `${value.toFixed(1)} energy each second`,
  cdr: (value) => `${signedPct(value)} cooldown recovery`,
  damageReduction: (value) => `${Math.round(value * 100)}% less damage taken`,
  bleedChance: (value) => `${Math.round(value * 100)}% bleed chance`,
  goldFind: (value) => `${signedPct(value)} gold found`,
  magicFind: (value) => `${signedPct(value)} magic find`,
  projectileMult: (value) => `${signedPct(value)} projectile damage`,
  thorns: (value) => `${Math.round(value)} thorns`,
  evasion: (value) => `${signedPct(value)} evasion`,
  vendorPrice: (value) => `${signedPct(value)} vendor prices`,
  vendorQuality: (value) => `${signedPct(value)} vendor quality`,
};

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}`;
}

function signedPct(value: number): string {
  const pct = Math.round(value * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export function formatMods(mods: Partial<Mods>): string {
  const parts: string[] = [];
  for (const key of Object.keys(mods) as (keyof Mods)[]) {
    const value = mods[key];
    const label = MOD_LABEL[key];
    if (typeof value === "number" && value !== 0 && label) parts.push(label(value));
  }
  return parts.join(", ");
}

export function describeSkill(id: string, rank: number, ranks: Record<string, number> = {}): string {
  const skill = skillById(id);
  if (!skill) return "";
  const shown = Math.max(1, rank);
  if (skill.kind === "passive") {
    const text = formatMods(passiveContribution(id, shown, ranks));
    const tail = rank > 0 ? text : `${text} at rank 1`;
    const syn = describeSynergies(id, ranks);
    return `${skill.blurb} ${tail}.${syn}`;
  }
  const spec = scaledActive(id, shown, ranks);
  if (!spec) return skill.blurb;
  const bits = [skill.blurb];
  if (spec.kind === "aura") {
    bits.push(`While toggled: ${formatMods(spec.aura)}. Drains ${spec.energyPerSec.toFixed(1)} energy each second.`);
  } else if (spec.kind === "channel") {
    bits.push(
      `Channel ${spec.channelTime.toFixed(1)}s. Restores ${Math.round(spec.healFrac * 100)}% life${
        id === "litany" ? " and a share of energy" : ""
      }. Cooldown ${spec.cooldown.toFixed(1)}s.`,
    );
  } else if (spec.kind === "buff") {
    if (spec.shieldFrac > 0) bits.push(`Grants a shield of ${Math.round(spec.shieldFrac * 100)}% life for ${spec.buffTime.toFixed(0)}s.`);
    if (spec.invuln > 0) bits.push(`Cannot be hit for ${spec.invuln.toFixed(2)}s.`);
    bits.push(`Cooldown ${spec.cooldown.toFixed(1)}s. Energy ${spec.energyCost}.`);
  } else {
    const school = spec.scaling === "spell" ? "spell" : "weapon";
    bits.push(`${Math.round(spec.mult * 100)}% ${school} damage. Cooldown ${spec.cooldown.toFixed(1)}s. Energy ${spec.energyCost}.`);
    if (spec.stun) bits.push(`Stuns for ${spec.stun.toFixed(1)}s.`);
    if (spec.slow) bits.push("Slows.");
    if (spec.burn) bits.push("Burns.");
    if (spec.dash) bits.push("Dashes along your facing.");
  }
  if (rank === 0 && skill.maxRank > 1) bits.push("Ranks raise power; damage skills keep pace with their cooldown.");
  bits.push(describeSynergies(id, ranks).trim());
  return bits.filter(Boolean).join(" ");
}

function describeSynergies(id: string, ranks: Record<string, number>): string {
  const links = synergiesFor(id);
  if (!links.length) return "";
  const parts = links.map((link) => {
    const feeder = skillById(link.from);
    const have = ranks[link.from] ?? 0;
    const pct = Math.round((link.powerPerRank ?? 0) * 100);
    return `${feeder?.name ?? link.from} (+${pct}%/rank${have ? `, ${have}` : ""})`;
  });
  return ` Synergies: ${parts.join("; ")}.`;
}
