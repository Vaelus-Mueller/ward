export const ARENA = { width: 3600, height: 60000, margin: 160 };
export const BASE_ATTR = 10;
/** Starting life at level 1 with innate stamina (before racial % and gear). */
export const BASE_LIFE = 50;
export const STAT_POINTS_PER_LEVEL = 5;
export const SKILL_POINTS_PER_LEVEL = 1;
export const CLASS_POINT_LEVELS = [25, 50] as const;
export const PARAGON_STAT_POINTS = 1;
export const PARAGON_SKILL_EVERY = 5;
export const MAX_LEVEL = 100;

/** Class points earned from character level (one at 25, another at 50). */
export function classPointsForLevel(level: number): number {
  let total = 0;
  for (const gate of CLASS_POINT_LEVELS) {
    if (level >= gate) total += 1;
  }
  return total;
}
export const PARAGON_CAP = 200;
export const INVENTORY_CAP = 16;
export const GEM_QUALITIES = 20;

export type Attr = "strength" | "agility" | "stamina" | "luck" | "spirit";
export type DamagePair =
  | "air"
  | "water"
  | "fire"
  | "holy"
  | "poison"
  | "bleed"
  | "unholy";
/** Skill-wheel cones map 1:1 onto damage pairs. */
export type SectorId = DamagePair;
export type SkillKind = "passive" | "active" | "aura" | "channel" | "key" | "capstone";
export type EnemyKind =
  | "hound"
  | "sentinel"
  | "archer"
  | "brute"
  | "wolf"
  | "slime"
  | "gargoyle"
  | "wisp"
  | "imp"
  | "spider"
  | "cultist"
  | "sprig"
  | "whelp"
  | "hillock"
  | "lurker"
  | "lumen"
  | "flicker";

export const ATTRS: Attr[] = ["strength", "agility", "stamina", "luck", "spirit"];

export const ATTR_LABEL: Record<Attr, string> = {
  strength: "Strength",
  agility: "Agility",
  stamina: "Stamina",
  luck: "Luck",
  spirit: "Spirit",
};

export const ATTR_HINT: Record<Attr, string> = {
  strength: "Damage dealt for every class.",
  agility: "Minor dodge, minor crit, and extra damage for swift classes.",
  stamina: "Life total and a little armor.",
  luck: "Crit rate, gold find, magic find, and better vendor deals.",
  spirit: "Energy regen and a little more energy storage.",
};

export const DAMAGE_PAIR_LABEL: Record<DamagePair, { primary: string; secondary: string; blurb: string }> = {
  air: { primary: "Air", secondary: "Lightning", blurb: "Gales and lightning." },
  water: { primary: "Water", secondary: "Ice", blurb: "Tides and frost." },
  fire: { primary: "Fire", secondary: "Magma", blurb: "Flame and molten stone." },
  holy: { primary: "Holy", secondary: "True", blurb: "Sacred light and true damage." },
  poison: { primary: "Poison", secondary: "Venom", blurb: "Toxins and venom." },
  bleed: { primary: "Bleed", secondary: "Physical", blurb: "Steel and opened veins." },
  unholy: { primary: "Unholy", secondary: "Darkness", blurb: "Blight and shadow." },
};

export type SlotName =
  | "weapon"
  | "offhand"
  | "weapon3"
  | "weapon4"
  | "head"
  | "chest"
  | "belt"
  | "boots"
  | "gloves"
  | "ring1"
  | "ring2"
  | "neck"
  | "ear1"
  | "ear2";
export type ItemSlot =
  | "weapon"
  | "shield"
  | "head"
  | "chest"
  | "belt"
  | "boots"
  | "gloves"
  | "ring"
  | "neck"
  | "earring"
  | "gem";
export type ArmorType = "cloth" | "leather" | "mail" | "plate";
export type Rarity = "grey" | "white" | "green" | "blue" | "purple" | "orange" | "yellow" | "gold" | "red" | "rainbow";
export type GemKind = "ruby" | "sapphire" | "topaz" | "emerald" | "diamond" | "amethyst" | "skull";
export type MaterialId = "weave" | "hide" | "rings" | "plate" | "steel" | "dust";
export type WeaponStyle = "melee" | "bow" | "focus" | "thrown" | "handbow";
export type WeaponHands = 1 | 2;

export const RARITIES: Rarity[] = ["grey", "white", "green", "blue", "purple", "orange", "yellow", "gold", "red", "rainbow"];

export const MATERIAL_LABEL: Record<MaterialId, string> = {
  weave: "Cloth Weave",
  hide: "Hide",
  rings: "Mail Rings",
  plate: "Plate Shards",
  steel: "Weapon Steel",
  dust: "Jewel Dust",
};

export const MATERIAL_ORDER: MaterialId[] = ["weave", "hide", "rings", "plate", "steel", "dust"];

export interface SocketGem {
  kind: GemKind;
  quality: number;
}

export interface GemStack {
  kind: GemKind;
  quality: number;
  count: number;
}

export interface MaterialStack {
  id: MaterialId;
  count: number;
}

export interface Affix {
  key: string;
  value: number;
  label: string;
}

export const GEAR_SLOTS: SlotName[] = [
  "weapon",
  "offhand",
  "weapon3",
  "weapon4",
  "head",
  "chest",
  "belt",
  "boots",
  "gloves",
  "ring1",
  "ring2",
  "neck",
  "ear1",
  "ear2",
];

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
    offhand: null,
    weapon3: null,
    weapon4: null,
    head: null,
    chest: null,
    belt: null,
    boots: null,
    gloves: null,
    ring1: null,
    ring2: null,
    neck: null,
    ear1: null,
    ear2: null,
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
  hands: WeaponHands;
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
  quality: number;
  sockets: number;
  gems: (SocketGem | null)[];
}

export type RaceId =
  | "human"
  | "elf"
  | "dwarf"
  | "gnome"
  | "hobbit"
  | "insectoid"
  | "minotaur"
  | "golem"
  | "lizard"
  | "undead";

export interface Character {
  name: string;
  race: RaceId;
  level: number;
  xp: number;
  gold: number;
  spent: Record<Attr, number>;
  unspentStats: number;
  unspentSkills: number;
  unspentClass: number;
  skillRanks: Record<string, number>;
  slotted: [string | null, string | null, string | null];
  equipment: Record<SlotName, Item | null>;
  inventory: Item[];
  gems: GemStack[];
  materials: MaterialStack[];
  salvageMarks: Rarity[];
  retrains: number;
  paragon: number;
}

export interface Mods {
  life: number;
  energy: number;
  energyMax: number;
  energyOnHit: number;
  chargeMax: number;
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
  energyRegen: number;
  cdr: number;
  damageReduction: number;
  bleedChance: number;
  goldFind: number;
  magicFind: number;
  projectileMult: number;
  vendorPrice: number;
  vendorQuality: number;
}

export interface Derived {
  strength: number;
  agility: number;
  stamina: number;
  luck: number;
  spirit: number;
  life: number;
  energy: number;
  energyOnHit: number;
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
  energyRegen: number;
  thorns: number;
  damageReduction: number;
  bleedChance: number;
  goldFind: number;
  magicFind: number;
  vendorPrice: number;
  vendorQuality: number;
  /** Fraction of damage dealt healed on hit (racial + gear). */
  lifeSteal: number;
}

export function emptyMods(): Mods {
  return {
    life: 0,
    energy: 0,
    energyMax: 0,
    energyOnHit: 0,
    chargeMax: 0,
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
    energyRegen: 0,
    cdr: 0,
    damageReduction: 0,
    bleedChance: 0,
    goldFind: 0,
    magicFind: 0,
    projectileMult: 0,
    vendorPrice: 0,
    vendorQuality: 0,
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
