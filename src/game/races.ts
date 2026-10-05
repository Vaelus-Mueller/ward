import { ATTRS, ATTR_LABEL, DAMAGE_PAIR_LABEL, type Attr, type DamagePair, type RaceId } from "./types";

const RESIST_FLOOR = 0.35;
const WEAK_CEILING = 1.75;

function clampDamageMul(raw: number): number {
  if (!Number.isFinite(raw)) return 1;
  return Math.min(WEAK_CEILING, Math.max(RESIST_FLOOR, raw));
}

export type { RaceId };

/** Damage-taken multipliers for the player (1 = normal). */
export type RaceDamageTaken = Partial<Record<DamagePair, number>>;

export interface RaceDef {
  id: RaceId;
  name: string;
  blurb: string;
  /**
   * Percentage modifiers on innate attributes (base + spent).
   * 0.04 = +4%, -0.02 = −2%. Gear affixes stay flat and are added after.
   */
  attrs: Record<Attr, number>;
  bonuses: string[];
  penalties: string[];
  /** Extra racial passive shown on the create screen. */
  passive?: string;
  /** Flat innate armor that does not come from gear. */
  innateArmor?: number;
  /** Multiplier on armor values printed on gear pieces (affixes still apply in full). */
  gearArmorMul?: number;
  /** How many one-hand weapons this race can wield at once. */
  weaponSlots?: number;
  /** Bonus max life as a fraction of the computed life pool. */
  lifePct?: number;
  /** Bonus armor as a fraction after flat armor is summed. */
  armorPct?: number;
  /** Extra flat life regeneration per second. */
  lifeRegen?: number;
  /** Life regeneration as a fraction of max life per second. */
  lifeRegenPct?: number;
  /** Multiplier on all life regeneration (flat + %-of-life). */
  lifeRegenMul?: number;
  /** Fraction of damage dealt returned as life on hit. */
  lifeSteal?: number;
  /**
   * Cooldown reduction. Positive shortens skills; negative lengthens them
   * (golem stone-slow minds).
   */
  cdr?: number;
  /** Small move-speed bonus/penalty (fraction). */
  moveSpeed?: number;
  /** Small flat evasion bonus. */
  evasion?: number;
  /** Damage-taken profile vs elemental pairs. */
  damageTaken?: RaceDamageTaken;
}

type RaceInput = Omit<RaceDef, "bonuses" | "penalties"> & {
  extras?: { bonuses?: string[]; penalties?: string[] };
};

function race(partial: RaceInput): RaceDef {
  const bonuses: string[] = [];
  const penalties: string[] = [];
  for (const attr of ATTRS) {
    const pct = partial.attrs[attr];
    if (!pct) continue;
    const label = `${signedPct(pct)} ${ATTR_LABEL[attr]}`;
    if (pct > 0) bonuses.push(label);
    else penalties.push(label);
  }
  pushBonus(bonuses, penalties, partial.lifePct, "max life");
  pushBonus(bonuses, penalties, partial.armorPct, "armor");
  if (partial.innateArmor && partial.innateArmor > 0) bonuses.push(`+${partial.innateArmor} innate armor`);
  if (partial.lifeRegen && partial.lifeRegen > 0) bonuses.push(`+${partial.lifeRegen.toFixed(1)} life regen`);
  pushBonus(bonuses, penalties, partial.lifeRegenPct, "max-life regen / sec");
  if (partial.lifeRegenMul != null && partial.lifeRegenMul !== 1) {
    const delta = partial.lifeRegenMul - 1;
    pushBonus(bonuses, penalties, delta, "life regen");
  }
  pushBonus(bonuses, penalties, partial.lifeSteal, "life steal on hit");
  if (partial.cdr) {
    // Positive cdr = faster skills (bonus); negative = slower (drawback).
    if (partial.cdr > 0) bonuses.push(`${signedPct(partial.cdr)} skill recharge`);
    else penalties.push(`${signedPct(partial.cdr)} skill recharge`);
  }
  pushBonus(bonuses, penalties, partial.moveSpeed, "move speed");
  if (partial.evasion && partial.evasion > 0) bonuses.push(`+${Math.round(partial.evasion * 100)}% evasion`);
  if (partial.damageTaken) {
    for (const [pair, mul] of Object.entries(partial.damageTaken) as [DamagePair, number][]) {
      if (mul === 1) continue;
      const name = DAMAGE_PAIR_LABEL[pair].primary;
      if (mul < 1) bonuses.push(`Resist ${name} ${Math.round((1 - mul) * 100)}%`);
      else penalties.push(`Weak to ${name} ${Math.round((mul - 1) * 100)}%`);
    }
  }
  if (partial.extras?.bonuses) bonuses.push(...partial.extras.bonuses);
  if (partial.extras?.penalties) penalties.push(...partial.extras.penalties);
  const { extras: _extras, ...rest } = partial;
  return { ...rest, bonuses, penalties };
}

function pushBonus(bonuses: string[], penalties: string[], value: number | undefined, label: string): void {
  if (!value) return;
  const text = `${signedPct(value)} ${label}`;
  if (value > 0) bonuses.push(text);
  else penalties.push(text);
}

function signedPct(value: number): string {
  const pct = Math.round(value * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

/**
 * Racial kits lean on classic fantasy tropes (D&D/Pathfinder SRD-style):
 * dwarven poison resilience, elven lightness, construct immunities-as-resists,
 * lizardfolk regeneration/natural armor, undead dark affinity + holy weakness.
 * Numbers stay mild — single-digit attribute %, soft resists/weaks, no immunities.
 */
export const RACES: RaceDef[] = [
  race({
    id: "human",
    name: "Human",
    blurb: "A ward exile of average stock. Steady hands and a stubborn frame.",
    attrs: { strength: 0.03, agility: -0.02, stamina: 0.03, luck: 0.03, spirit: -0.02 },
    extras: { bonuses: ["+4% gold find", "+4% magic find"] },
    passive: "Adaptability — fortune favors the common blood: slight gold and magic find.",
  }),
  race({
    id: "elf",
    name: "Elf",
    blurb: "Long of limb and sharp of eye. The ward’s cold air suits them.",
    attrs: { strength: -0.04, agility: 0.07, stamina: -0.05, luck: 0, spirit: 0.05 },
    moveSpeed: 0.04,
    damageTaken: { air: 0.9, bleed: 1.1 },
    passive: "Windkin — light step and a kinship with air; steel bites deeper into slight frames.",
  }),
  race({
    id: "dwarf",
    name: "Dwarf",
    blurb: "Broad and deep-rooted. They take a blow better than they chase it.",
    attrs: { strength: 0.06, agility: -0.05, stamina: 0.07, luck: -0.02, spirit: -0.03 },
    innateArmor: 6,
    moveSpeed: -0.04,
    damageTaken: { poison: 0.85, fire: 0.92 },
    passive: "Stone Resilience — dwarven hide shrugs poison and heat; short legs slow the chase.",
  }),
  race({
    id: "gnome",
    name: "Gnome",
    blurb: "Small scholars with clever fingers and little patience for axes.",
    attrs: { strength: -0.05, agility: 0.04, stamina: -0.04, luck: 0.02, spirit: 0.07 },
    extras: { bonuses: ["+8% energy regen"] },
    damageTaken: { air: 0.92, bleed: 1.08 },
    passive: "Tinker Mind — quick wit feeds the ward-spark; soft bodies fear open steel.",
  }),
  race({
    id: "hobbit",
    name: "Hobbit",
    blurb: "Quiet feet and a hardy gut. Soft voices, hard to keep down.",
    attrs: { strength: -0.05, agility: 0.05, stamina: 0.05, luck: 0.05, spirit: -0.03 },
    evasion: 0.03,
    damageTaken: { poison: 0.92 },
    passive: "Lucky Footing — hard to pin down, harder to poison. Halfling luck holds.",
  }),
  race({
    id: "insectoid",
    name: "Insectoid",
    blurb: "Chitin and clicks. Four blade-arms, a carapace grown from within.",
    attrs: { strength: 0.04, agility: 0.07, stamina: -0.02, luck: -0.04, spirit: -0.05 },
    innateArmor: 28,
    gearArmorMul: 0.15,
    weaponSlots: 4,
    damageTaken: { poison: 0.85, bleed: 0.9, fire: 1.12 },
    extras: { penalties: ["Cannot wield two-handers", "Main hand 75% / off-arms 25% weapon damage"] },
    passive:
      "Four Arms — four one-hand weapons only. Chitin shrugs venom and cuts; flame cracks the shell. Gear armor barely thickens it, but enchantments still bind.",
  }),
  race({
    id: "minotaur",
    name: "Minotaur",
    blurb: "Horn and muscle. A charge that shakes stone, a mind that does not.",
    attrs: { strength: 0.09, agility: -0.07, stamina: 0.04, luck: -0.02, spirit: -0.05 },
    lifePct: 0.04,
    damageTaken: { bleed: 0.92, air: 1.1 },
    extras: { bonuses: ["Bull Grip: dual two-hand melee (off-hand 50% weapon damage)"] },
    passive:
      "Bull Grip — two-handed melee in each hand, or a two-hander with shield/blade. Thick hide; slow to turn into the wind.",
  }),
  race({
    id: "golem",
    name: "Golem",
    blurb: "Bound clay and ward-stone. Hard to break, slower to think or turn.",
    attrs: { strength: 0.05, agility: -0.06, stamina: 0.03, luck: -0.03, spirit: -0.06 },
    lifePct: 0.06,
    armorPct: 0.1,
    cdr: -0.12,
    damageTaken: { bleed: 0.85, poison: 0.85, water: 1.12 },
    passive:
      "Living Stone — +10% armor and sturdier life, but skills wake slowly in clay. Construct flesh resists cuts and venom; water unbinds the seal.",
  }),
  race({
    id: "lizard",
    name: "Lizard",
    blurb: "Scaled swamp-blood. Cold eyes, a patient gut, skin like boiled leather.",
    attrs: { strength: 0.04, agility: 0.03, stamina: 0.05, luck: -0.02, spirit: -0.03 },
    innateArmor: 8,
    lifeRegenPct: 0.01,
    damageTaken: { poison: 0.9, water: 1.1 },
    passive:
      "Cold Blood — regenerate 1% of max life each second. Scales turn blades of venom; frost and tide bite the cold-blooded.",
  }),
  race({
    id: "undead",
    name: "Undead",
    blurb: "A ward-bound corpse that still answers. Hunger where a heart once was.",
    attrs: { strength: 0.04, agility: 0.02, stamina: -0.03, luck: -0.02, spirit: 0.03 },
    lifeSteal: 0.04,
    lifeRegenMul: 0.7,
    damageTaken: { unholy: 0.82, holy: 1.18, bleed: 0.88, poison: 0.88 },
    passive:
      "Grave Hunger — siphon 4% of damage dealt as life. Dark slides off dead flesh; sacred light and slow mending do not.",
  }),
];

export const RACE_IDS: RaceId[] = RACES.map((entry) => entry.id);

export function raceById(id: string | null | undefined): RaceDef {
  return RACES.find((entry) => entry.id === id) ?? RACES[0]!;
}

export function isRaceId(value: unknown): value is RaceId {
  return typeof value === "string" && RACE_IDS.includes(value as RaceId);
}

export function raceName(id: string | null | undefined): string {
  return raceById(id).name;
}

/** Percentage deltas (0.04 = +4%) applied to innate attributes. */
export function raceAttrs(id: string | null | undefined): Record<Attr, number> {
  return raceById(id).attrs;
}

export function raceWeaponSlots(id: string | null | undefined): number {
  return raceById(id).weaponSlots ?? 2;
}

export function raceInnateArmor(id: string | null | undefined): number {
  return raceById(id).innateArmor ?? 0;
}

export function raceGearArmorMul(id: string | null | undefined): number {
  return raceById(id).gearArmorMul ?? 1;
}

export function raceLifePct(id: string | null | undefined): number {
  return raceById(id).lifePct ?? 0;
}

export function raceArmorPct(id: string | null | undefined): number {
  return raceById(id).armorPct ?? 0;
}

export function raceLifeSteal(id: string | null | undefined): number {
  return raceById(id).lifeSteal ?? 0;
}

export function raceCdr(id: string | null | undefined): number {
  return raceById(id).cdr ?? 0;
}

export function raceMoveSpeed(id: string | null | undefined): number {
  return raceById(id).moveSpeed ?? 0;
}

export function raceEvasion(id: string | null | undefined): number {
  return raceById(id).evasion ?? 0;
}

export function raceLifeRegenFlat(id: string | null | undefined): number {
  return raceById(id).lifeRegen ?? 0;
}

export function raceLifeRegenPct(id: string | null | undefined): number {
  return raceById(id).lifeRegenPct ?? 0;
}

export function raceLifeRegenMul(id: string | null | undefined): number {
  return raceById(id).lifeRegenMul ?? 1;
}

/** Player damage-taken multiplier for a damage pair. */
export function raceDamageTakenMul(id: string | null | undefined, pair: DamagePair): number {
  const mul = raceById(id).damageTaken?.[pair] ?? 1;
  return clampDamageMul(mul);
}

/** Human Adaptability find bonuses. */
export function raceGoldFind(id: string | null | undefined): number {
  return id === "human" ? 0.04 : 0;
}

export function raceMagicFind(id: string | null | undefined): number {
  return id === "human" ? 0.04 : 0;
}

export function raceEnergyRegenMul(id: string | null | undefined): number {
  return id === "gnome" ? 1.08 : 1;
}
