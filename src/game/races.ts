import type { Attr, RaceId } from "./types";

export type { RaceId };

export interface RaceDef {
  id: RaceId;
  name: string;
  blurb: string;
  attrs: Record<Attr, number>;
  bonuses: string[];
  penalties: string[];
  /** Extra racial passive shown on the create screen. */
  passive?: string;
  /** Percent armor bonus from the race itself (no flat innate armor). */
  armorPct?: number;
  /** Multiplier on armor values printed on gear pieces (affixes still apply in full). */
  gearArmorMul?: number;
  /** How many one-hand weapons this race can wield at once. */
  weaponSlots?: number;
}

export const RACES: RaceDef[] = [
  {
    id: "human",
    name: "Human",
    blurb: "A ward exile of average stock. Steady hands and a stubborn frame.",
    attrs: { strength: 2, agility: -1, stamina: 2, luck: 1, spirit: -1 },
    bonuses: ["+2 Strength", "+2 Stamina", "+1 Luck"],
    penalties: ["−1 Agility", "−1 Spirit"],
  },
  {
    id: "elf",
    name: "Elf",
    blurb: "Long of limb and sharp of eye. The ward’s cold air suits them.",
    attrs: { strength: -2, agility: 4, stamina: -3, luck: 0, spirit: 3 },
    bonuses: ["+4 Agility", "+3 Spirit"],
    penalties: ["−3 Stamina", "−2 Strength"],
  },
  {
    id: "dwarf",
    name: "Dwarf",
    blurb: "Broad and deep-rooted. They take a blow better than they chase it.",
    attrs: { strength: 4, agility: -3, stamina: 4, luck: -1, spirit: -2 },
    bonuses: ["+4 Strength", "+4 Stamina"],
    penalties: ["−3 Agility", "−2 Spirit", "−1 Luck"],
  },
  {
    id: "gnome",
    name: "Gnome",
    blurb: "Small scholars with clever fingers and little patience for axes.",
    attrs: { strength: -3, agility: 2, stamina: -2, luck: 1, spirit: 4 },
    bonuses: ["+4 Spirit", "+2 Agility", "+1 Luck"],
    penalties: ["−3 Strength", "−2 Stamina"],
  },
  {
    id: "hobbit",
    name: "Hobbit",
    blurb: "Quiet feet and a hardy gut. Soft voices, hard to keep down.",
    attrs: { strength: -3, agility: 3, stamina: 3, luck: 2, spirit: -2 },
    bonuses: ["+3 Agility", "+3 Stamina", "+2 Luck"],
    penalties: ["−3 Strength", "−2 Spirit"],
  },
  {
    id: "insectoid",
    name: "Insectoid",
    blurb: "Chitin and clicks. Four blade-arms, a carapace grown from within.",
    attrs: { strength: 2, agility: 4, stamina: -1, luck: -2, spirit: -3 },
    bonuses: ["+4 Agility", "+2 Strength"],
    penalties: ["−3 Spirit", "−2 Luck", "−1 Stamina"],
    passive:
      "Four Arms — wield four one-hand weapons. Chitin grants percent armor; gear armor barely thickens the shell, but enchantments still bind.",
    armorPct: 0.9,
    gearArmorMul: 0.15,
    weaponSlots: 4,
  },
  {
    id: "minotaur",
    name: "Minotaur",
    blurb: "Horn and muscle. A charge that shakes stone, a mind that does not.",
    attrs: { strength: 5, agility: -4, stamina: 2, luck: -1, spirit: -3 },
    bonuses: ["+5 Strength", "+2 Stamina"],
    penalties: ["−4 Agility", "−3 Spirit", "−1 Luck"],
    passive: "Bull Grip — wield a two-handed melee weapon and still hold a shield or off-hand blade.",
  },
  {
    id: "golem",
    name: "Golem",
    blurb: "Bound clay and ward-stone. Hard to break, slower to think or turn.",
    attrs: { strength: 3, agility: -4, stamina: 5, luck: -2, spirit: -4 },
    bonuses: ["+5 Stamina", "+3 Strength"],
    penalties: ["−4 Agility", "−4 Spirit", "−2 Luck"],
  },
];

export const RACE_IDS: RaceId[] = RACES.map((race) => race.id);

export function raceById(id: string | null | undefined): RaceDef {
  return RACES.find((race) => race.id === id) ?? RACES[0]!;
}

export function isRaceId(value: unknown): value is RaceId {
  return typeof value === "string" && RACE_IDS.includes(value as RaceId);
}

export function raceName(id: string | null | undefined): string {
  return raceById(id).name;
}

export function raceAttrs(id: string | null | undefined): Record<Attr, number> {
  return raceById(id).attrs;
}

export function raceWeaponSlots(id: string | null | undefined): number {
  return raceById(id).weaponSlots ?? 2;
}

export function raceArmorPct(id: string | null | undefined): number {
  return raceById(id).armorPct ?? 0;
}

/** @deprecated Flat innate armor removed — use raceArmorPct. */
export function raceInnateArmor(id: string | null | undefined): number {
  void id;
  return 0;
}

export function raceGearArmorMul(id: string | null | undefined): number {
  return raceById(id).gearArmorMul ?? 1;
}
