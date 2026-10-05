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
}

export const RACES: RaceDef[] = [
  {
    id: "human",
    name: "Human",
    blurb: "A ward exile of average stock. Steady hands and a stubborn frame.",
    attrs: { strength: 2, agility: -1, endurance: 2, wisdom: -1 },
    bonuses: ["+2 Strength", "+2 Endurance"],
    penalties: ["−1 Agility", "−1 Wisdom"],
  },
  {
    id: "elf",
    name: "Elf",
    blurb: "Long of limb and sharp of eye. The ward’s cold air suits them.",
    attrs: { strength: -2, agility: 4, endurance: -3, wisdom: 3 },
    bonuses: ["+4 Agility", "+3 Wisdom"],
    penalties: ["−3 Endurance", "−2 Strength"],
  },
  {
    id: "dwarf",
    name: "Dwarf",
    blurb: "Broad and deep-rooted. They take a blow better than they chase it.",
    attrs: { strength: 4, agility: -3, endurance: 4, wisdom: -2 },
    bonuses: ["+4 Strength", "+4 Endurance"],
    penalties: ["−3 Agility", "−2 Wisdom"],
  },
  {
    id: "gnome",
    name: "Gnome",
    blurb: "Small scholars with clever fingers and little patience for axes.",
    attrs: { strength: -3, agility: 2, endurance: -2, wisdom: 4 },
    bonuses: ["+4 Wisdom", "+2 Agility"],
    penalties: ["−3 Strength", "−2 Endurance"],
  },
  {
    id: "hobbit",
    name: "Hobbit",
    blurb: "Quiet feet and a hardy gut. Soft voices, hard to keep down.",
    attrs: { strength: -3, agility: 3, endurance: 3, wisdom: -2 },
    bonuses: ["+3 Agility", "+3 Endurance"],
    penalties: ["−3 Strength", "−2 Wisdom"],
  },
  {
    id: "insectoid",
    name: "Insectoid",
    blurb: "Chitin and clicks. Fast strikes, thin patience for soft magic.",
    attrs: { strength: 2, agility: 4, endurance: -2, wisdom: -3 },
    bonuses: ["+4 Agility", "+2 Strength"],
    penalties: ["−3 Wisdom", "−2 Endurance"],
  },
  {
    id: "minotaur",
    name: "Minotaur",
    blurb: "Horn and muscle. A charge that shakes stone, a mind that does not.",
    attrs: { strength: 5, agility: -4, endurance: 2, wisdom: -3 },
    bonuses: ["+5 Strength", "+2 Endurance"],
    penalties: ["−4 Agility", "−3 Wisdom"],
    passive: "Bull Grip — wield a two-handed melee weapon and still hold a shield or off-hand blade.",
  },
  {
    id: "golem",
    name: "Golem",
    blurb: "Bound clay and ward-stone. Hard to break, slower to think or turn.",
    attrs: { strength: 3, agility: -4, endurance: 5, wisdom: -4 },
    bonuses: ["+5 Endurance", "+3 Strength"],
    penalties: ["−4 Agility", "−4 Wisdom"],
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
