/**
 * Ward monster roster — SRD/CC-safe archetypes with resist/weak multipliers.
 *
 * Combat rules (Josh — hard bans, including elites):
 * - Resistances & weaknesses only (tunable multipliers).
 * - NEVER immunities (no 0-damage / immune-to-type). Floor is RESIST_FLOOR.
 * - NEVER resurrections.
 * - NEVER summons.
 *
 * Legal: 5.1 SRD creature-*type* concepts and Ward-original names only.
 * Models: KayKit CC0 GLBs where mapped, else procedural kitbash (no scraped D&D assets).
 */
import type { DamagePair, EnemyKind } from "./types";

/** Never allow a multiplier at or below this — immunities are banned. */
export const RESIST_FLOOR = 0.35;
/** Soft cap so weaknesses stay readable on phone UI/combat. */
export const WEAK_CEILING = 1.75;

export type CreatureType =
  | "aberration"
  | "beast"
  | "celestial"
  | "construct"
  | "dragon"
  | "elemental"
  | "fey"
  | "fiend"
  | "giant"
  | "humanoid"
  | "monstrosity"
  | "ooze"
  | "plant"
  | "undead";

export type ModelSource = "kaykit-glb" | "procedural";

export type DamageProfile = Partial<Record<DamagePair, number>>;

export interface MonsterDef {
  id: EnemyKind;
  /** Player-facing Ward name (never closed WotC product identity). */
  name: string;
  /** SRD-style creature type category. */
  creatureType: CreatureType;
  blurb: string;
  /** Damage taken multiplier by pair. Missing keys default to 1. Clamped to [RESIST_FLOOR, WEAK_CEILING]. */
  damageTaken: DamageProfile;
  /** Combat role for AI/spawn weighting. */
  role: "skirmisher" | "bruiser" | "ranged" | "elite";
  model: ModelSource;
  /** KayKit file key when model === "kaykit-glb". */
  glbKey?: string;
  /** Target phase: wave1 is playable now; later waves are documented stubs. */
  wave: 1 | 2 | 3;
  /** Hard bans — always false; present so reviews/tests can assert. */
  canResurrect: false;
  canSummon: false;
}

const ALL_PAIRS: DamagePair[] = ["bleed", "holy", "air", "fire", "water", "poison", "unholy"];

/** Clamp a single multiplier — immunities (≤0 / below floor) are illegal. */
export function clampDamageMul(raw: number): number {
  if (!Number.isFinite(raw)) return 1;
  return Math.min(WEAK_CEILING, Math.max(RESIST_FLOOR, raw));
}

/** Resolve damage-taken mul for a monster vs a damage pair. */
export function damageTakenMul(def: MonsterDef, pair: DamagePair): number {
  return clampDamageMul(def.damageTaken[pair] ?? 1);
}

export function assertCombatBans(def: MonsterDef): void {
  if (def.canResurrect) throw new Error(`${def.id}: resurrection is banned`);
  if (def.canSummon) throw new Error(`${def.id}: summons are banned`);
  for (const pair of ALL_PAIRS) {
    const mul = damageTakenMul(def, pair);
    if (mul <= 0 || mul < RESIST_FLOOR) throw new Error(`${def.id}: immunity-like mul for ${pair}`);
  }
}

function def(
  partial: Omit<MonsterDef, "canResurrect" | "canSummon" | "damageTaken"> & { damageTaken: DamageProfile },
): MonsterDef {
  const damageTaken: DamageProfile = {};
  for (const [pair, mul] of Object.entries(partial.damageTaken) as [DamagePair, number][]) {
    damageTaken[pair] = clampDamageMul(mul);
  }
  const monster: MonsterDef = {
    ...partial,
    damageTaken,
    canResurrect: false,
    canSummon: false,
  };
  assertCombatBans(monster);
  return monster;
}

/**
 * Wave 1 playable roster — covers every major creature type with ≥1 entry.
 * Existing KayKit skeletons keep their ids (hound/sentinel/archer/brute).
 */
export const MONSTERS: Record<EnemyKind, MonsterDef> = {
  // —— Undead (KayKit CC0) ——
  hound: def({
    id: "hound",
    name: "Bone Hound",
    creatureType: "undead",
    blurb: "A pack runner of yellowed bone.",
    role: "skirmisher",
    model: "kaykit-glb",
    glbKey: "hound",
    wave: 1,
    damageTaken: { holy: 1.45, fire: 1.2, bleed: 0.55, poison: 0.55, unholy: 0.7 },
  }),
  sentinel: def({
    id: "sentinel",
    name: "Ash Sentinel",
    creatureType: "undead",
    blurb: "Mail and oath, still standing the gate.",
    role: "bruiser",
    model: "kaykit-glb",
    glbKey: "sentinel",
    wave: 1,
    damageTaken: { holy: 1.5, fire: 1.15, bleed: 0.5, poison: 0.5, unholy: 0.65, water: 1.1 },
  }),
  archer: def({
    id: "archer",
    name: "Ossuary Archer",
    creatureType: "undead",
    blurb: "Dry fingers on a stolen crossbow.",
    role: "ranged",
    model: "kaykit-glb",
    glbKey: "archer",
    wave: 1,
    damageTaken: { holy: 1.4, fire: 1.2, bleed: 0.55, poison: 0.55, air: 1.15 },
  }),
  brute: def({
    id: "brute",
    name: "Ward Brute",
    creatureType: "undead",
    blurb: "A towering dead mage bound in iron bands.",
    role: "elite",
    model: "kaykit-glb",
    glbKey: "brute",
    wave: 1,
    damageTaken: { holy: 1.55, fire: 1.1, bleed: 0.45, poison: 0.45, unholy: 0.6, air: 1.2 },
  }),

  // —— Beast ——
  wolf: def({
    id: "wolf",
    name: "Ash Wolf",
    creatureType: "beast",
    blurb: "A lean hunter from the outer courts.",
    role: "skirmisher",
    model: "procedural",
    wave: 1,
    damageTaken: { bleed: 1.25, fire: 1.15, poison: 1.2, holy: 0.9, air: 1.05 },
  }),

  // —— Ooze ——
  slime: def({
    id: "slime",
    name: "Gate Slime",
    creatureType: "ooze",
    blurb: "A wet mass that drinks steel poorly and fire well.",
    role: "bruiser",
    model: "procedural",
    wave: 1,
    damageTaken: { fire: 1.55, holy: 1.2, bleed: 0.45, poison: 0.5, water: 0.7, air: 1.1 },
  }),

  // —— Construct ——
  gargoyle: def({
    id: "gargoyle",
    name: "Courtyard Gargoyle",
    creatureType: "construct",
    blurb: "Stone wings and a patient perch.",
    role: "bruiser",
    model: "procedural",
    wave: 1,
    damageTaken: { bleed: 0.4, poison: 0.4, water: 1.35, air: 1.25, holy: 1.1, fire: 0.85, unholy: 0.9 },
  }),

  // —— Elemental ——
  wisp: def({
    id: "wisp",
    name: "Ember Wisp",
    creatureType: "elemental",
    blurb: "A drifting coal of ward-light.",
    role: "skirmisher",
    model: "procedural",
    wave: 1,
    damageTaken: { water: 1.55, air: 1.2, fire: 0.45, bleed: 0.5, poison: 0.5, holy: 1.1 },
  }),

  // —— Fiend ——
  imp: def({
    id: "imp",
    name: "Cinder Imp",
    creatureType: "fiend",
    blurb: "A petty spite from below the Tenth.",
    role: "skirmisher",
    model: "procedural",
    wave: 1,
    damageTaken: { holy: 1.55, water: 1.25, fire: 0.55, unholy: 0.6, bleed: 1.05 },
  }),

  // —— Monstrosity ——
  spider: def({
    id: "spider",
    name: "Vault Spinner",
    creatureType: "monstrosity",
    blurb: "Too many legs for a honest cellar.",
    role: "skirmisher",
    model: "procedural",
    wave: 1,
    damageTaken: { fire: 1.35, air: 1.2, poison: 0.55, bleed: 1.1, holy: 1.05 },
  }),

  // —— Humanoid ——
  cultist: def({
    id: "cultist",
    name: "Ash Cultist",
    creatureType: "humanoid",
    blurb: "A living zealot of the broken gate.",
    role: "ranged",
    model: "procedural",
    wave: 1,
    damageTaken: { bleed: 1.15, poison: 1.1, holy: 1.2, unholy: 0.85, fire: 1.05 },
  }),

  // —— Plant / Fey-adjacent ——
  sprig: def({
    id: "sprig",
    name: "Reed Sprig",
    creatureType: "plant",
    blurb: "Marsh wood given a mean little walk.",
    role: "skirmisher",
    model: "procedural",
    wave: 1,
    damageTaken: { fire: 1.6, bleed: 1.2, water: 0.55, poison: 0.7, air: 1.1 },
  }),

  // —— Dragon (whelp — archetype only) ——
  whelp: def({
    id: "whelp",
    name: "Cinder Whelp",
    creatureType: "dragon",
    blurb: "A young fire-throat, not a named wyrm.",
    role: "elite",
    model: "procedural",
    wave: 1,
    damageTaken: { water: 1.45, air: 1.15, fire: 0.5, bleed: 0.85, holy: 1.05, poison: 0.9 },
  }),

  // —— Giant ——
  hillock: def({
    id: "hillock",
    name: "Hillock Thug",
    creatureType: "giant",
    blurb: "A broad brute from the cairn walks.",
    role: "elite",
    model: "procedural",
    wave: 1,
    damageTaken: { bleed: 1.2, poison: 1.15, air: 1.1, fire: 1.05, holy: 1.0 },
  }),

  // —— Aberration ——
  lurker: def({
    id: "lurker",
    name: "Depth Lurker",
    creatureType: "aberration",
    blurb: "Eyes where eyes should not be.",
    role: "bruiser",
    model: "procedural",
    wave: 1,
    damageTaken: { holy: 1.35, fire: 1.2, unholy: 0.7, poison: 0.75, water: 1.1 },
  }),

  // —— Celestial (Ward name) ——
  lumen: def({
    id: "lumen",
    name: "Fallen Lumen",
    creatureType: "celestial",
    blurb: "A cracked ward-light still trying to judge.",
    role: "bruiser",
    model: "procedural",
    wave: 1,
    damageTaken: { unholy: 1.5, poison: 1.2, holy: 0.5, fire: 0.85, bleed: 0.9 },
  }),

  // —— Fey ——
  flicker: def({
    id: "flicker",
    name: "Gate Flicker",
    creatureType: "fey",
    blurb: "A mischievous glint between stones.",
    role: "skirmisher",
    model: "procedural",
    wave: 1,
    damageTaken: { unholy: 1.35, fire: 1.2, bleed: 0.75, poison: 0.8, holy: 1.1, air: 0.85 },
  }),
};

export const WAVE1_KINDS = (Object.keys(MONSTERS) as EnemyKind[]).filter((id) => MONSTERS[id].wave === 1);

export function monsterOf(kind: EnemyKind): MonsterDef {
  return MONSTERS[kind];
}

export function creatureTypesCovered(): CreatureType[] {
  return [...new Set(WAVE1_KINDS.map((id) => MONSTERS[id].creatureType))];
}

/**
 * Full target roster (waves 2–3) — names are Ward-original; archetypes are SRD type-safe.
 * Not spawned until assets/AI land.
 */
export const DEFERRED_ROSTER: { name: string; creatureType: CreatureType; wave: 2 | 3; notes: string }[] = [
  { name: "Vein Jelly", creatureType: "ooze", wave: 2, notes: "Larger ooze; resist bleed/poison, weak fire" },
  { name: "Iron Warder", creatureType: "construct", wave: 2, notes: "Animated armor; weak water/air" },
  { name: "Marsh Hydra Spawn", creatureType: "monstrosity", wave: 2, notes: "Multi-neck kitbash; NO regen-as-rez" },
  { name: "Storm Shard", creatureType: "elemental", wave: 2, notes: "Air elemental; weak water" },
  { name: "Tide Glob", creatureType: "elemental", wave: 2, notes: "Water elemental; weak air/fire" },
  { name: "Cairn Ogre", creatureType: "giant", wave: 2, notes: "Bigger hillock variant" },
  { name: "Bone Knight", creatureType: "undead", wave: 2, notes: "KayKit warrior re-rig / LOD" },
  { name: "Pyre Drake", creatureType: "dragon", wave: 3, notes: "Adult-tier dragon archetype; still no immunity" },
  { name: "Choir Remnant", creatureType: "celestial", wave: 3, notes: "Stronger lumen" },
  { name: "Night Hagkin", creatureType: "fiend", wave: 3, notes: "Ward name — not product identity" },
  { name: "Grellow", creatureType: "aberration", wave: 3, notes: "Floating aberration kitbash" },
  { name: "Thorn Chorus", creatureType: "plant", wave: 3, notes: "Plant cluster; weak fire" },
  { name: "Court Trickster", creatureType: "fey", wave: 3, notes: "Fey humanoid caster — no summons" },
  { name: "Road Bandit", creatureType: "humanoid", wave: 2, notes: "Living humanoid skirmisher" },
  { name: "Dire Boar", creatureType: "beast", wave: 2, notes: "Beast bruiser" },
];

/** Stats baselines keyed by EnemyKind — used by sim.makeEnemy. */
export const MONSTER_ARCH: Record<
  EnemyKind,
  { hp: number; dmg: number; def: number; armor: number; speed: number; range: number; cd: number; r: number; xp: number; gold: number; sight: number }
> = {
  hound: { hp: 28, dmg: 7, def: 12, armor: 2, speed: 96, range: 46, cd: 0.95, r: 16, xp: 14, gold: 3, sight: 250 },
  sentinel: { hp: 64, dmg: 10, def: 24, armor: 16, speed: 58, range: 52, cd: 1.2, r: 20, xp: 24, gold: 6, sight: 230 },
  archer: { hp: 34, dmg: 8, def: 14, armor: 4, speed: 70, range: 270, cd: 1.75, r: 15, xp: 18, gold: 5, sight: 310 },
  brute: { hp: 220, dmg: 18, def: 32, armor: 22, speed: 48, range: 78, cd: 2.4, r: 34, xp: 90, gold: 24, sight: 240 },
  wolf: { hp: 32, dmg: 8, def: 14, armor: 3, speed: 108, range: 44, cd: 0.9, r: 15, xp: 16, gold: 4, sight: 270 },
  slime: { hp: 70, dmg: 9, def: 10, armor: 8, speed: 42, range: 40, cd: 1.35, r: 22, xp: 20, gold: 5, sight: 200 },
  gargoyle: { hp: 90, dmg: 12, def: 28, armor: 20, speed: 62, range: 50, cd: 1.3, r: 18, xp: 28, gold: 8, sight: 240 },
  wisp: { hp: 22, dmg: 9, def: 8, armor: 1, speed: 88, range: 120, cd: 1.4, r: 12, xp: 15, gold: 4, sight: 280 },
  imp: { hp: 26, dmg: 8, def: 11, armor: 2, speed: 100, range: 54, cd: 1.05, r: 13, xp: 17, gold: 5, sight: 260 },
  spider: { hp: 36, dmg: 9, def: 16, armor: 5, speed: 92, range: 48, cd: 1.0, r: 16, xp: 18, gold: 5, sight: 250 },
  cultist: { hp: 38, dmg: 9, def: 15, armor: 4, speed: 72, range: 240, cd: 1.65, r: 15, xp: 19, gold: 6, sight: 300 },
  sprig: { hp: 34, dmg: 7, def: 13, armor: 6, speed: 70, range: 46, cd: 1.1, r: 15, xp: 16, gold: 4, sight: 220 },
  whelp: { hp: 160, dmg: 16, def: 26, armor: 14, speed: 70, range: 90, cd: 2.0, r: 26, xp: 70, gold: 18, sight: 260 },
  hillock: { hp: 200, dmg: 17, def: 30, armor: 18, speed: 50, range: 70, cd: 2.2, r: 30, xp: 80, gold: 20, sight: 230 },
  lurker: { hp: 95, dmg: 13, def: 22, armor: 10, speed: 64, range: 55, cd: 1.25, r: 20, xp: 30, gold: 9, sight: 245 },
  lumen: { hp: 85, dmg: 12, def: 20, armor: 12, speed: 68, range: 60, cd: 1.3, r: 18, xp: 32, gold: 10, sight: 255 },
  flicker: { hp: 24, dmg: 8, def: 12, armor: 2, speed: 110, range: 50, cd: 0.95, r: 12, xp: 18, gold: 6, sight: 275 },
};
