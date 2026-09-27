export const ARENA = { width: 2400, height: 1600, margin: 78 };
export const BASE_ATTR = 10;
export const STAT_POINTS_PER_LEVEL = 5;
export const SKILL_POINTS_PER_LEVEL = 1;
export const PARAGON_STAT_POINTS = 1;
export const PARAGON_SKILL_EVERY = 5;
export const MAX_LEVEL = 100;
export const PARAGON_CAP = 200;
export const INVENTORY_CAP = 16;

export type Attr = "strength" | "agility" | "endurance" | "wisdom";
export type SlotName = "weapon" | "head" | "chest" | "belt" | "boots" | "gloves" | "ring1" | "ring2" | "neck";
export type ItemSlot = "weapon" | "head" | "chest" | "belt" | "boots" | "gloves" | "ring" | "neck" | "gem";
export type ArmorType = "cloth" | "leather" | "mail" | "plate";
export type Rarity = "grey" | "white" | "green" | "blue" | "purple" | "orange" | "yellow" | "gold" | "red" | "rainbow";
export type GemKind = "ruby" | "sapphire" | "topaz" | "emerald" | "diamond" | "amethyst" | "skull";
export type WeaponStyle = "melee" | "bow" | "focus";
export type SectorId = "bulwark" | "shade" | "rite";
export type SkillKind = "passive" | "active" | "aura" | "channel";
export type EnemyKind = "hound" | "sentinel" | "archer" | "brute";

export const ATTRS: Attr[] = ["strength", "agility", "endurance", "wisdom"];

export const ATTR_LABEL: Record<Attr, string> = {
  strength: "Strength",
  agility: "Agility",
  endurance: "Endurance",
  wisdom: "Wisdom",
};

export const ATTR_HINT: Record<Attr, string> = {
  strength: "Melee damage and armor.",
  agility: "Hit chance, evasion, bows, and speed.",
  endurance: "Life. Four life per point, and 1 health each second for every 10 points.",
  wisdom: "Mana and spell damage.",
};

export interface Affix {
  key: string;
  value: number;
  label: string;
}

export const GEAR_SLOTS: SlotName[] = ["weapon", "head", "chest", "belt", "boots", "gloves", "ring1", "ring2", "neck"];

export const RARITY_LABEL: Record<Rarity, string> = {
  grey: "Grey",
  white: "White",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  orange: "Orange",
  yellow: "Yellow",
  gold: "Gold",
  red: "Red",
  rainbow: "Rainbow",
};

export const ARMOR_LABEL: Record<ArmorType, string> = {
  cloth: "Cloth",
  leather: "Leather",
  mail: "Mail",
  plate: "Plate",
};

export function emptyEquipment(): Record<SlotName, Item | null> {
  return {
    weapon: null,
    head: null,
    chest: null,
    belt: null,
    boots: null,
    gloves: null,
    ring1: null,
    ring2: null,
    neck: null,
  };
}

export interface Item {
  uid: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  armorType: ArmorType | null;
  ethereal: boolean;
  uniqueId: string | null;
  style: WeaponStyle;
  damageMin: number;
  damageMax: number;
  armor: number;
  speed: number;
  rangeBonus: number;
  reqStr: number;
  reqDex: number;
  reqEne: number;
  affixes: Affix[];
  bornLevel: number;
  ilvl: number;
  dye: number;
  sockets: number;
  gems: (GemKind | null)[];
}

export interface Character {
  level: number;
  xp: number;
  gold: number;
  spent: Record<Attr, number>;
  unspentStats: number;
  unspentSkills: number;
  skillRanks: Record<string, number>;
  slotted: [string | null, string | null, string | null];
  equipment: Record<SlotName, Item | null>;
  inventory: Item[];
  retrains: number;
  paragon: number;
}

export interface Mods {
  life: number;
  mana: number;
  armor: number;
  armorPct: number;
  meleeMult: number;
  spellMult: number;
  attackSpeed: number;
  moveSpeed: number;
  crit: number;
  evasion: number;
  attackRating: number;
  thorns: number;
  lifeRegen: number;
  manaRegen: number;
  cdr: number;
  damageReduction: number;
  bleedChance: number;
  goldFind: number;
  projectileMult: number;
}

export interface Derived {
  strength: number;
  agility: number;
  endurance: number;
  wisdom: number;
  life: number;
  mana: number;
  armor: number;
  attackRating: number;
  evasion: number;
  crit: number;
  meleeMin: number;
  meleeMax: number;
  spellMin: number;
  spellMax: number;
  attackPeriod: number;
  moveSpeed: number;
  weaponStyle: WeaponStyle;
  weaponRange: number;
  lifeRegen: number;
  manaRegen: number;
  thorns: number;
  damageReduction: number;
  bleedChance: number;
  goldFind: number;
}

export function emptyMods(): Mods {
  return {
    life: 0,
    mana: 0,
    armor: 0,
    armorPct: 0,
    meleeMult: 0,
    spellMult: 0,
    attackSpeed: 0,
    moveSpeed: 0,
    crit: 0,
    evasion: 0,
    attackRating: 0,
    thorns: 0,
    lifeRegen: 0,
    manaRegen: 0,
    cdr: 0,
    damageReduction: 0,
    bleedChance: 0,
    goldFind: 0,
    projectileMult: 0,
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
