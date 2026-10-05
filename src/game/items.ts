import { liveItem, rollSocketCount, socketCap } from "./itemstats";
import { meetsRequirements } from "./formulas";
import type {
  Affix,
  ArmorType,
  Character,
  GemKind,
  Item,
  ItemSlot,
  MaterialId,
  Rarity,
  SlotName,
  WeaponHands,
  WeaponStyle,
} from "./types";
import { ARMOR_LABEL, GEAR_SLOTS, INVENTORY_CAP, MATERIAL_LABEL, MATERIAL_ORDER, RARITY_LABEL } from "./types";

/**
 * Reminder for later — do not implement yet.
 * Set items need one shared visual look per set (same dye, trim, and body tint)
 * so the outfit matches. No set bonuses until that look exists.
 */

interface BaseItem {
  name: string;
  slot: ItemSlot;
  armorType: ArmorType | null;
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
}

const WEAPONS: BaseItem[] = [
  { name: "Ash Blade", slot: "weapon", armorType: null, style: "melee", hands: 1, damageMin: 5, damageMax: 9, armor: 0, speed: 1, rangeBonus: 0, reqStr: 12, reqDex: 0, reqEne: 0 },
  { name: "Split Cleaver", slot: "weapon", armorType: null, style: "melee", hands: 1, damageMin: 8, damageMax: 14, armor: 0, speed: 0.84, rangeBonus: 0, reqStr: 18, reqDex: 0, reqEne: 0 },
  { name: "Gate Spear", slot: "weapon", armorType: null, style: "melee", hands: 2, damageMin: 7, damageMax: 12, armor: 0, speed: 0.95, rangeBonus: 30, reqStr: 14, reqDex: 0, reqEne: 0 },
  { name: "Oak Maul", slot: "weapon", armorType: null, style: "melee", hands: 2, damageMin: 11, damageMax: 18, armor: 0, speed: 0.78, rangeBonus: 0, reqStr: 22, reqDex: 0, reqEne: 0 },
  { name: "Great Ashblade", slot: "weapon", armorType: null, style: "melee", hands: 2, damageMin: 10, damageMax: 16, armor: 0, speed: 0.88, rangeBonus: 0, reqStr: 20, reqDex: 0, reqEne: 0 },
  { name: "Reed Bow", slot: "weapon", armorType: null, style: "bow", hands: 2, damageMin: 4, damageMax: 8, armor: 0, speed: 1, rangeBonus: 0, reqStr: 0, reqDex: 14, reqEne: 0 },
  { name: "Palm Crossbow", slot: "weapon", armorType: null, style: "handbow", hands: 1, damageMin: 5, damageMax: 9, armor: 0, speed: 0.92, rangeBonus: 0, reqStr: 0, reqDex: 12, reqEne: 0 },
  { name: "Throwing Knives", slot: "weapon", armorType: null, style: "thrown", hands: 1, damageMin: 3, damageMax: 7, armor: 0, speed: 1.18, rangeBonus: 0, reqStr: 0, reqDex: 10, reqEne: 0 },
  { name: "Bone Hatchet", slot: "weapon", armorType: null, style: "thrown", hands: 1, damageMin: 5, damageMax: 9, armor: 0, speed: 1.02, rangeBonus: 0, reqStr: 8, reqDex: 10, reqEne: 0 },
  { name: "Moon Focus", slot: "weapon", armorType: null, style: "focus", hands: 1, damageMin: 3, damageMax: 6, armor: 0, speed: 1.08, rangeBonus: 0, reqStr: 0, reqDex: 0, reqEne: 12 },
];

const SHIELDS: BaseItem[] = [
  { name: "Wood Buckler", slot: "shield", armorType: "leather", style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 8, speed: 1, rangeBonus: 0, reqStr: 0, reqDex: 0, reqEne: 0 },
  { name: "Iron Targe", slot: "shield", armorType: "mail", style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 14, speed: 1, rangeBonus: 0, reqStr: 12, reqDex: 0, reqEne: 0 },
  { name: "Tower Plate", slot: "shield", armorType: "plate", style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 22, speed: 1, rangeBonus: 0, reqStr: 18, reqDex: 0, reqEne: 0 },
];

const ARMOR_ROWS: Record<
  ArmorType,
  Record<
    "head" | "chest" | "belt" | "boots" | "gloves",
    Omit<BaseItem, "slot" | "armorType" | "style" | "speed" | "rangeBonus" | "damageMin" | "damageMax" | "hands"> & {
      armor: number;
    }
  >
> = {
  cloth: {
    head: { name: "Cloth Hood", armor: 3, reqStr: 0, reqDex: 0, reqEne: 0 },
    chest: { name: "Cloth Robe", armor: 8, reqStr: 0, reqDex: 0, reqEne: 8 },
    belt: { name: "Cloth Sash", armor: 2, reqStr: 0, reqDex: 0, reqEne: 0 },
    boots: { name: "Cloth Shoes", armor: 3, reqStr: 0, reqDex: 0, reqEne: 0 },
    gloves: { name: "Cloth Wraps", armor: 2, reqStr: 0, reqDex: 0, reqEne: 0 },
  },
  leather: {
    head: { name: "Leather Cap", armor: 5, reqStr: 0, reqDex: 8, reqEne: 0 },
    chest: { name: "Leather Jack", armor: 12, reqStr: 0, reqDex: 12, reqEne: 0 },
    belt: { name: "Leather Belt", armor: 4, reqStr: 0, reqDex: 6, reqEne: 0 },
    boots: { name: "Leather Boots", armor: 5, reqStr: 0, reqDex: 8, reqEne: 0 },
    gloves: { name: "Leather Gloves", armor: 4, reqStr: 0, reqDex: 6, reqEne: 0 },
  },
  mail: {
    head: { name: "Mail Coif", armor: 7, reqStr: 10, reqDex: 0, reqEne: 0 },
    chest: { name: "Mail Hauberk", armor: 16, reqStr: 14, reqDex: 0, reqEne: 0 },
    belt: { name: "Mail Girdle", armor: 5, reqStr: 8, reqDex: 0, reqEne: 0 },
    boots: { name: "Mail Greaves", armor: 7, reqStr: 10, reqDex: 0, reqEne: 0 },
    gloves: { name: "Mail Gauntlets", armor: 5, reqStr: 8, reqDex: 0, reqEne: 0 },
  },
  plate: {
    head: { name: "Plate Helm", armor: 9, reqStr: 16, reqDex: 0, reqEne: 0 },
    chest: { name: "Plate Cuirass", armor: 22, reqStr: 20, reqDex: 0, reqEne: 0 },
    belt: { name: "Plate Belt", armor: 6, reqStr: 12, reqDex: 0, reqEne: 0 },
    boots: { name: "Plate Sabatons", armor: 9, reqStr: 14, reqDex: 0, reqEne: 0 },
    gloves: { name: "Plate Gauntlets", armor: 6, reqStr: 12, reqDex: 0, reqEne: 0 },
  },
};

const JEWELRY: BaseItem[] = [
  { name: "Iron Band", slot: "ring", armorType: null, style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 0, speed: 1, rangeBonus: 0, reqStr: 0, reqDex: 0, reqEne: 0 },
  { name: "Bone Circle", slot: "ring", armorType: null, style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 0, speed: 1, rangeBonus: 0, reqStr: 0, reqDex: 0, reqEne: 0 },
  { name: "Copper Chain", slot: "neck", armorType: null, style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 0, speed: 1, rangeBonus: 0, reqStr: 0, reqDex: 0, reqEne: 0 },
  { name: "Ward Torc", slot: "neck", armorType: null, style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 0, speed: 1, rangeBonus: 0, reqStr: 0, reqDex: 0, reqEne: 0 },
  { name: "Bone Stud", slot: "earring", armorType: null, style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 0, speed: 1, rangeBonus: 0, reqStr: 0, reqDex: 0, reqEne: 0 },
  { name: "Ash Drop", slot: "earring", armorType: null, style: "melee", hands: 1, damageMin: 0, damageMax: 0, armor: 0, speed: 1, rangeBonus: 0, reqStr: 0, reqDex: 0, reqEne: 0 },
];

const DYES: Record<ArmorType, number[]> = {
  cloth: [0x8f3d4c, 0x2f4d6a, 0xcbb98a, 0x3d5c45, 0x4a3d66],
  leather: [0x6b4423, 0x4a3020, 0x8a5a32, 0x3d2918],
  mail: [0x8e98a3, 0x6e7c88, 0xb7c0c8],
  plate: [0x5c6168, 0x3e4450, 0x8a8478],
};

const AFFIXES: { affix: Affix; prefix: string; weight: number }[] = [
  { prefix: "Oak", affix: { key: "strength", value: 3, label: "+3 Strength" }, weight: 4 },
  { prefix: "Lynx", affix: { key: "agility", value: 3, label: "+3 Agility" }, weight: 4 },
  { prefix: "Hart", affix: { key: "endurance", value: 3, label: "+3 Endurance" }, weight: 4 },
  { prefix: "Sage", affix: { key: "wisdom", value: 3, label: "+3 Wisdom" }, weight: 3 },
  { prefix: "Stalwart", affix: { key: "life", value: 14, label: "+14 Life" }, weight: 4 },
  { prefix: "Well", affix: { key: "mana", value: 10, label: "+10 Mana" }, weight: 3 },
  { prefix: "Plated", affix: { key: "armor", value: 8, label: "+8 Armor" }, weight: 3 },
  { prefix: "Keen", affix: { key: "damage", value: 2, label: "+2 Weapon Damage" }, weight: 3 },
  { prefix: "True", affix: { key: "attackRating", value: 12, label: "+12 Attack Rating" }, weight: 2 },
  { prefix: "Cruel", affix: { key: "crit", value: 0.03, label: "+3% Critical Chance" }, weight: 2 },
  { prefix: "Flowing", affix: { key: "manaRegen", value: 0.35, label: "+0.35 Mana Regeneration" }, weight: 2 },
  { prefix: "Ember", affix: { key: "burn", value: 2.5, label: "+2.5 Fire Burn on Hit" }, weight: 2 },
  { prefix: "Rime", affix: { key: "frost", value: 0.2, label: "Chill: 20% slow on Hit" }, weight: 2 },
  { prefix: "Storm", affix: { key: "lightning", value: 4, label: "+4 Lightning Damage" }, weight: 2 },
];

const TIER_AFFIXES: Record<Rarity, number> = {
  grey: 0,
  white: 0,
  green: 1,
  blue: 2,
  purple: 3,
  orange: 4,
  yellow: 4,
  gold: 4,
  red: 4,
  rainbow: 3,
};

const TIER_POWER: Record<Rarity, number> = {
  grey: 0.7,
  white: 1,
  green: 1.12,
  blue: 1.28,
  purple: 1.5,
  orange: 1.78,
  yellow: 1.92,
  gold: 1.96,
  red: 2.15,
  rainbow: 1.5,
};

const GEM_NAMES: Record<GemKind, string> = {
  ruby: "Ruby",
  sapphire: "Sapphire",
  topaz: "Topaz",
  emerald: "Emerald",
  diamond: "Diamond",
  amethyst: "Amethyst",
  skull: "Skull",
};

const ETHEREAL_CHANCE = 0.008;

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function weightedAffix(rng: () => number): { affix: Affix; prefix: string } {
  const total = AFFIXES.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of AFFIXES) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return AFFIXES[0]!;
}

export function rollRarity(rng: () => number, wave: number): Rarity {
  const weights: [Rarity, number][] = [
    ["grey", Math.max(2, 42 - wave * 1.6)],
    ["white", Math.max(6, 30 - wave * 0.5)],
    ["green", 14 + wave * 0.8],
    ["blue", 4 + wave * 1.1],
    ["purple", Math.max(0, (wave - 3) * 0.9)],
    ["orange", Math.max(0, (wave - 7) * 0.55)],
    ["yellow", Math.max(0, (wave - 10) * 0.35)],
    ["red", Math.max(0, (wave - 12) * 0.28)],
    ["rainbow", Math.max(0, (wave - 8) * 0.08)],
  ];
  const total = weights.reduce((sum, entry) => sum + entry[1], 0);
  let roll = rng() * total;
  for (const [rarity, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return "white";
}

function armorBases(): BaseItem[] {
  const list: BaseItem[] = [];
  for (const armorType of ["cloth", "leather", "mail", "plate"] as ArmorType[]) {
    for (const slot of ["head", "chest", "belt", "boots", "gloves"] as const) {
      const row = ARMOR_ROWS[armorType][slot];
      list.push({
        ...row,
        slot,
        armorType,
        style: "melee",
        hands: 1,
        damageMin: 0,
        damageMax: 0,
        speed: 1,
        rangeBonus: 0,
      });
    }
  }
  return list;
}

const BASES = [...WEAPONS, ...SHIELDS, ...armorBases(), ...JEWELRY];

interface UniqueDef {
  id: string;
  name: string;
  slot: ItemSlot;
  armorType: ArmorType | null;
  style: WeaponStyle;
  hands?: WeaponHands;
  minWave: number;
  damageMin: number;
  damageMax: number;
  armor: number;
  speed: number;
  rangeBonus: number;
  reqStr: number;
  reqDex: number;
  reqEne: number;
  affixes: Affix[];
  sockets: number;
  dye: number;
}

const NORMAL_AFFIX_KEYS = new Set(AFFIXES.map((entry) => entry.affix.key));

const UNIQUES: UniqueDef[] = [
  {
    id: "ashwake",
    name: "Ashwake",
    slot: "weapon",
    armorType: null,
    style: "melee",
    minWave: 3,
    damageMin: 12,
    damageMax: 20,
    armor: 0,
    speed: 1.05,
    rangeBonus: 0,
    reqStr: 14,
    reqDex: 0,
    reqEne: 0,
    sockets: 1,
    dye: 0xc4a05a,
    affixes: [
      { key: "meleeMult", value: 0.12, label: "Sunder: 12% more melee damage" },
      { key: "bleedChance", value: 0.08, label: "Open Wound: 8% bleed chance" },
      { key: "strength", value: 4, label: "+4 Strength" },
      { key: "damage", value: 3, label: "+3 Weapon Damage" },
    ],
  },
  {
    id: "moonwell",
    name: "Moonwell",
    slot: "weapon",
    armorType: null,
    style: "focus",
    minWave: 6,
    damageMin: 8,
    damageMax: 14,
    armor: 0,
    speed: 1.08,
    rangeBonus: 0,
    reqStr: 0,
    reqDex: 0,
    reqEne: 14,
    sockets: 0,
    dye: 0x9a7ad4,
    affixes: [
      { key: "spellMult", value: 0.14, label: "Rite: 14% more spell damage" },
      { key: "wisdom", value: 4, label: "+4 Wisdom" },
      { key: "mana", value: 12, label: "+12 Mana" },
      { key: "manaRegen", value: 0.4, label: "+0.40 Mana Regeneration" },
    ],
  },
  {
    id: "first-watch",
    name: "Cowl of the First Watch",
    slot: "head",
    armorType: "cloth",
    style: "melee",
    minWave: 1,
    damageMin: 0,
    damageMax: 0,
    armor: 8,
    speed: 1,
    rangeBonus: 0,
    reqStr: 0,
    reqDex: 0,
    reqEne: 0,
    sockets: 1,
    dye: 0x6e2433,
    affixes: [
      { key: "evasion", value: 0.05, label: "Watchful: 5% dodge" },
      { key: "life", value: 18, label: "+18 Life" },
      { key: "endurance", value: 3, label: "+3 Endurance" },
      { key: "armor", value: 6, label: "+6 Armor" },
    ],
  },
  {
    id: "ward-hauberk",
    name: "Ward Hauberk",
    slot: "chest",
    armorType: "mail",
    style: "melee",
    minWave: 8,
    damageMin: 0,
    damageMax: 0,
    armor: 30,
    speed: 1,
    rangeBonus: 0,
    reqStr: 16,
    reqDex: 0,
    reqEne: 0,
    sockets: 2,
    dye: 0x7f8c99,
    affixes: [
      { key: "damageReduction", value: 0.06, label: "Bulwark: 6% damage reduction" },
      { key: "thorns", value: 5, label: "Ward Spikes: 5 thorns" },
      { key: "endurance", value: 4, label: "+4 Endurance" },
      { key: "life", value: 20, label: "+20 Life" },
    ],
  },
  {
    id: "quiet-sash",
    name: "Quiet Sash",
    slot: "belt",
    armorType: "leather",
    style: "melee",
    minWave: 1,
    damageMin: 0,
    damageMax: 0,
    armor: 7,
    speed: 1,
    rangeBonus: 0,
    reqStr: 0,
    reqDex: 8,
    reqEne: 0,
    sockets: 0,
    dye: 0x5c3a22,
    affixes: [
      { key: "moveSpeed", value: 0.08, label: "Soft Step: 8% movement speed" },
      { key: "agility", value: 4, label: "+4 Agility" },
      { key: "attackRating", value: 12, label: "+12 Attack Rating" },
      { key: "life", value: 10, label: "+10 Life" },
    ],
  },
  {
    id: "ember-sabatons",
    name: "Ember Sabatons",
    slot: "boots",
    armorType: "plate",
    style: "melee",
    minWave: 8,
    damageMin: 0,
    damageMax: 0,
    armor: 16,
    speed: 1,
    rangeBonus: 0,
    reqStr: 16,
    reqDex: 0,
    reqEne: 0,
    sockets: 0,
    dye: 0x8a4a32,
    affixes: [
      { key: "thorns", value: 4, label: "Ember Tread: 4 thorns" },
      { key: "moveSpeed", value: 0.05, label: "Long Stride: 5% movement speed" },
      { key: "armor", value: 8, label: "+8 Armor" },
      { key: "strength", value: 3, label: "+3 Strength" },
    ],
  },
  {
    id: "cantor-wraps",
    name: "Cantor Wraps",
    slot: "gloves",
    armorType: "cloth",
    style: "melee",
    minWave: 4,
    damageMin: 0,
    damageMax: 0,
    armor: 6,
    speed: 1,
    rangeBonus: 0,
    reqStr: 0,
    reqDex: 0,
    reqEne: 10,
    sockets: 0,
    dye: 0x3d4a78,
    affixes: [
      { key: "cdr", value: 0.08, label: "Measured Cast: 8% cooldown reduction" },
      { key: "wisdom", value: 3, label: "+3 Wisdom" },
      { key: "mana", value: 10, label: "+10 Mana" },
      { key: "crit", value: 0.03, label: "+3% Critical Chance" },
    ],
  },
  {
    id: "lost-gate",
    name: "Lost Gate Band",
    slot: "ring",
    armorType: null,
    style: "melee",
    minWave: 1,
    damageMin: 0,
    damageMax: 0,
    armor: 0,
    speed: 1,
    rangeBonus: 0,
    reqStr: 0,
    reqDex: 0,
    reqEne: 0,
    sockets: 0,
    dye: 0xd4b15a,
    affixes: [
      { key: "goldFind", value: 0.15, label: "Gate Tax: 15% gold find" },
      { key: "attackSpeed", value: 0.08, label: "Hurried Hand: 8% attack speed" },
      { key: "strength", value: 3, label: "+3 Strength" },
      { key: "life", value: 12, label: "+12 Life" },
    ],
  },
  {
    id: "deep-ward",
    name: "Deep Ward Torc",
    slot: "neck",
    armorType: null,
    style: "melee",
    minWave: 4,
    damageMin: 0,
    damageMax: 0,
    armor: 0,
    speed: 1,
    rangeBonus: 0,
    reqStr: 0,
    reqDex: 0,
    reqEne: 0,
    sockets: 0,
    dye: 0x3d7a8a,
    affixes: [
      { key: "lifeRegen", value: 1.2, label: "Ward Pulse: +1.20 life regeneration" },
      { key: "mana", value: 14, label: "+14 Mana" },
      { key: "manaRegen", value: 0.4, label: "+0.40 Mana Regeneration" },
      { key: "wisdom", value: 3, label: "+3 Wisdom" },
    ],
  },
];

export function uniqueRoster(): { id: string; affixes: Affix[] }[] {
  return UNIQUES.map((entry) => ({ id: entry.id, affixes: entry.affixes }));
}

export function isSignatureAffix(key: string): boolean {
  return !NORMAL_AFFIX_KEYS.has(key);
}

export function uniqueChance(wave: number): number {
  return Math.min(0.04, 0.018 + Math.max(0, wave - 1) * 0.001);
}

function blankItem(partial: Omit<Item, "ethereal" | "uniqueId" | "bornLevel" | "ilvl" | "dye" | "quality" | "sockets" | "gems" | "hands"> & Partial<Item>): Item {
  return {
    ethereal: false,
    uniqueId: null,
    bornLevel: 0,
    ilvl: 1,
    dye: 0xcfc6b8,
    quality: 0,
    sockets: 0,
    gems: [],
    hands: 1,
    ...partial,
  };
}

export function starterBlade(uid = "starter-blade"): Item {
  const base = WEAPONS[0]!;
  return blankItem({
    uid,
    ...base,
    name: "Worn Ash Blade",
    rarity: "white",
    damageMin: 4,
    damageMax: 8,
    reqStr: 0,
    affixes: [],
  });
}

export function rollGem(rng: () => number, uid: string): Item {
  const kinds = Object.keys(GEM_NAMES) as GemKind[];
  const kind = pick(rng, kinds);
  return blankItem({
    uid,
    name: GEM_NAMES[kind],
    slot: "gem",
    rarity: "white",
    armorType: null,
    style: "melee",
    damageMin: 0,
    damageMax: 0,
    armor: 0,
    speed: 1,
    rangeBonus: 0,
    reqStr: 0,
    reqDex: 0,
    reqEne: 0,
    affixes: [],
    quality: 1,
    gems: [{ kind, quality: 1 }],
    dye: gemDye(kind),
  });
}

export function gemKind(item: Item): GemKind | null {
  if (item.slot !== "gem") return null;
  return item.gems[0]?.kind ?? null;
}

export function rollItem(rng: () => number, wave: number, uid: string, level = wave): Item {
  if (rng() < uniqueChance(wave)) {
    const pool = UNIQUES.filter((entry) => entry.minWave <= wave);
    if (pool.length > 0) return makeUnique(pick(rng, pool), rng, uid, wave, level);
  }
  const slotRoll = rng();
  const slotCut = [0.18, 0.26, 0.36, 0.49, 0.57, 0.65, 0.73, 0.82, 0.91];
  const slots: ItemSlot[] = ["weapon", "shield", "head", "chest", "belt", "boots", "gloves", "ring", "neck"];
  let slot: ItemSlot = "earring";
  for (let i = 0; i < slotCut.length; i++) {
    if (slotRoll < slotCut[i]!) {
      slot = slots[i]!;
      break;
    }
  }
  const pool = BASES.filter((base) => base.slot === slot);
  const base = pick(rng, pool);
  const rarity = rollRarity(rng, wave);
  const jewelry = isJewelry(slot);
  let affixCount = TIER_AFFIXES[rarity];
  if (jewelry) affixCount = Math.max(1, affixCount);
  const affixes: Affix[] = [];
  const used = new Set<string>();
  const prefixes: string[] = [];
  const waveMul = 1 + Math.max(0, wave - 1) * 0.08;
  const power = TIER_POWER[rarity] * waveMul;
  const affixPower = power * (rarity === "red" ? 1.35 : rarity === "orange" ? 1.15 : 1);
  for (let i = 0; i < affixCount; i++) {
    let choice = weightedAffix(rng);
    let guard = 0;
    while (used.has(choice.affix.key) && guard < 8) {
      choice = weightedAffix(rng);
      guard += 1;
    }
    used.add(choice.affix.key);
    const value = rolledAffixAmount(choice.affix.key, choice.affix.value, affixPower);
    affixes.push({ key: choice.affix.key, value, label: storedLabel(choice.affix.key, value) });
    prefixes.push(choice.prefix);
  }
  const ilvl = Math.max(1, wave, level);
  const cap = socketCap(base.slot, base.armorType, base.style, ilvl);
  const sockets = rollSocketCount(rng, rarity, cap);
  const ethereal = !isJewelry(base.slot) && base.slot !== "gem" && rng() < ETHEREAL_CHANCE;
  const prefix = prefixes[0] ? `${prefixes[0]} ` : "";
  const name = `${ethereal ? "Ethereal " : ""}${prefix}${base.name}`;
  const dyes = base.armorType ? DYES[base.armorType] : [0xcfc6b8, 0xe4c37a, 0x9aa7b8];
  return blankItem({
    uid,
    ...base,
    name,
    rarity,
    ethereal,
    damageMin: base.damageMin <= 0 ? 0 : Math.max(1, Math.round(base.damageMin * power)),
    damageMax: base.damageMax <= 0 ? 0 : Math.max(1, Math.round(base.damageMax * power)),
    armor: Math.max(0, Math.round(base.armor * power)),
    affixes,
    bornLevel: rarity === "rainbow" ? Math.max(1, level) : 0,
    ilvl,
    dye: pick(rng, dyes),
    sockets,
    gems: Array.from({ length: sockets }, () => null),
  });
}

function makeUnique(unique: UniqueDef, rng: () => number, uid: string, wave: number, level: number): Item {
  const ethereal = !isJewelry(unique.slot) && rng() < ETHEREAL_CHANCE;
  return blankItem({
    uid,
    name: `${ethereal ? "Ethereal " : ""}${unique.name}`,
    slot: unique.slot,
    rarity: "gold",
    armorType: unique.armorType,
    ethereal,
    uniqueId: unique.id,
    style: unique.style,
    hands: unique.hands ?? defaultHands(unique.slot, unique.style, unique.name),
    damageMin: unique.damageMin,
    damageMax: unique.damageMax,
    armor: unique.armor,
    speed: unique.speed,
    rangeBonus: unique.rangeBonus,
    reqStr: unique.reqStr,
    reqDex: unique.reqDex,
    reqEne: unique.reqEne,
    affixes: unique.affixes.map((affix) => ({ ...affix })),
    bornLevel: 0,
    ilvl: Math.max(1, wave, level),
    dye: unique.dye,
    sockets: unique.sockets,
    gems: Array.from({ length: unique.sockets }, () => null),
  });
}

const ATTRIBUTE_KEYS = new Set(["strength", "agility", "endurance", "wisdom"]);

export function rolledAffixAmount(key: string, base: number, power: number): number {
  const scale = ATTRIBUTE_KEYS.has(key) ? 0.5 : 1;
  return roundStored(key, base * power * scale);
}

function roundStored(key: string, value: number): number {
  if (key === "crit" || key === "manaRegen") return Math.round(value * 100) / 100;
  return Math.max(1, Math.round(value));
}

function storedLabel(key: string, value: number): string {
  if (key === "crit") return `+${Math.round(value * 100)}% Critical Chance`;
  if (key === "manaRegen") return `+${value.toFixed(2)} Mana Regeneration`;
  const names: Record<string, string> = {
    strength: "Strength",
    agility: "Agility",
    endurance: "Endurance",
    wisdom: "Wisdom",
    life: "Life",
    mana: "Mana",
    armor: "Armor",
    damage: "Weapon Damage",
    attackRating: "Attack Rating",
  };
  return `+${value} ${names[key] ?? key}`;
}

export function canCarry(c: Character): boolean {
  return c.inventory.length < INVENTORY_CAP;
}

export function tryAddItem(c: Character, item: Item): boolean {
  if (item.slot === "gem") {
    const kind = gemKind(item);
    if (!kind) return false;
    addGem(c, kind, item.quality || item.gems[0]?.quality || 1, 1);
    return true;
  }
  if (!canCarry(c)) return false;
  c.inventory.push(item);
  return true;
}

export function gemStackName(kind: GemKind, quality: number): string {
  const rank = Math.max(1, Math.round(quality) || 1);
  return rank === 1 ? GEM_NAMES[kind] : `${GEM_NAMES[kind]} ${rank}`;
}

export function addGem(c: Character, kind: GemKind, quality: number, count = 1): void {
  if (!Array.isArray(c.gems)) c.gems = [];
  const rank = Math.max(1, Math.round(quality) || 1);
  const stack = c.gems.find((entry) => entry.kind === kind && entry.quality === rank);
  if (stack) stack.count += count;
  else c.gems.push({ kind, quality: rank, count });
}

function takeGem(c: Character, kind: GemKind, quality: number): boolean {
  if (!Array.isArray(c.gems)) return false;
  const rank = Math.max(1, Math.round(quality) || 1);
  const stack = c.gems.find((entry) => entry.kind === kind && entry.quality === rank && entry.count > 0);
  if (!stack) return false;
  stack.count -= 1;
  if (stack.count <= 0) c.gems = c.gems.filter((entry) => entry.count > 0);
  return true;
}

function destination(c: Character, item: Item): SlotName | null {
  if (item.slot === "gem") return null;
  if (item.slot === "ring") {
    if (!c.equipment.ring1) return "ring1";
    if (!c.equipment.ring2) return "ring2";
    return "ring1";
  }
  if (item.slot === "earring") {
    if (!c.equipment.ear1) return "ear1";
    if (!c.equipment.ear2) return "ear2";
    return "ear1";
  }
  if (item.slot === "shield") return "offhand";
  if (item.slot === "weapon") {
    const main = c.equipment.weapon;
    // Dual wield / Bull Grip: a second one-hand melee fills the off-hand when allowed.
    if (isOffhandWeapon(item) && !c.equipment.offhand && main) {
      if (canPairOffhand(c, main)) return "offhand";
      // Still route to off-hand so equip can refuse a two-hander that isn't Bull Gripped.
      if (itemHands(main) === 2) return "offhand";
    }
    return "weapon";
  }
  return item.slot as SlotName;
}

/** One-hand melee blades (not shields) that can sit in the off-hand. */
export function isOffhandWeapon(item: Item): boolean {
  return item.slot === "weapon" && item.style === "melee" && itemHands(item) === 1;
}

export function isShield(item: Item | null | undefined): boolean {
  return !!item && item.slot === "shield";
}

export function itemHands(item: Item): WeaponHands {
  return item.hands === 2 ? 2 : 1;
}

export function isRangedStyle(style: WeaponStyle): boolean {
  return style === "bow" || style === "thrown" || style === "handbow";
}

/** Minotaur Bull Grip: 2H melee still leaves the off-hand free. */
export function canPairOffhand(c: Character, main: Item | null | undefined): boolean {
  if (!main) return true;
  if (itemHands(main) === 1) return true;
  return c.race === "minotaur" && main.style === "melee";
}

export function defaultHands(slot: ItemSlot, style: WeaponStyle, name = ""): WeaponHands {
  if (slot === "shield") return 1;
  if (style === "bow") return 2;
  if (style === "thrown" || style === "handbow" || style === "focus") return 1;
  const lower = name.toLowerCase();
  if (lower.includes("great") || lower.includes("maul") || lower.includes("spear") || lower.includes("pike")) return 2;
  return 1;
}

export function equipItem(c: Character, uid: string): string | null {
  const index = c.inventory.findIndex((item) => item.uid === uid);
  if (index < 0) return "That item is not in the pack.";
  const item = c.inventory[index]!;
  const slot = destination(c, item);
  if (!slot) return "Set a gem into an empty socket.";
  if (slot === "offhand") {
    if (!(isShield(item) || isOffhandWeapon(item))) {
      return "Only a shield or one-hand melee fits the off-hand.";
    }
    if (!canPairOffhand(c, c.equipment.weapon)) {
      return c.race === "minotaur"
        ? "That main-hand needs both hands."
        : "Two-handed weapons leave no room for an off-hand. Minotaurs can Bull Grip melee two-handers.";
    }
  }
  if (!meetsRequirements(c, item)) return "You do not meet the attribute requirement.";
  // Two-handers that cannot pair (bows, non-minotaur 2H melee) free the off-hand.
  if (slot === "weapon" && !canPairOffhand(c, item) && c.equipment.offhand) {
    const cleared = unequipItem(c, "offhand");
    if (cleared) return cleared;
  }
  const freshIndex = c.inventory.findIndex((entry) => entry.uid === uid);
  if (freshIndex < 0) return "That item is not in the pack.";
  const previous = c.equipment[slot];
  c.inventory.splice(freshIndex, 1);
  c.equipment[slot] = item;
  if (previous) c.inventory.push(previous);
  return null;
}

export function unequipItem(c: Character, slot: SlotName): string | null {
  const item = c.equipment[slot];
  if (!item) return "Nothing is equipped there.";
  if (!canCarry(c)) return "The pack is full.";
  c.equipment[slot] = null;
  c.inventory.push(item);
  return null;
}

export function socketGem(c: Character, itemUid: string, kind: GemKind, quality: number): string | null {
  const host = findHost(c, itemUid);
  if (!host) return "That item is not here.";
  const hole = host.gems.findIndex((entry) => entry === null);
  if (hole < 0) return "That item has no empty socket.";
  if (!takeGem(c, kind, quality)) return "That gem is not in the pouch.";
  host.gems[hole] = { kind, quality: Math.max(1, Math.round(quality) || 1) };
  return null;
}

function findHost(c: Character, uid: string): Item | undefined {
  const worn = GEAR_SLOTS.map((slot) => c.equipment[slot]).find((item) => item?.uid === uid);
  return worn ?? c.inventory.find((item) => item.uid === uid);
}

export function itemSummary(item: Item, level = 1): string {
  if (item.slot === "gem") {
    const kind = gemKind(item);
    return kind ? `${GEM_NAMES[kind]}. Socket it into a weapon, helm, or chest.` : "Gem";
  }
  const live = liveItem(item, level);
  const bits = [RARITY_LABEL[item.rarity], `item level ${Math.max(1, item.ilvl || 1)}`];
  if (item.armorType) bits.push(ARMOR_LABEL[item.armorType]);
  if (item.ethereal) bits.push(item.slot === "weapon" ? "+10% damage" : "+10% defence");
  if (item.slot === "weapon" || item.slot === "shield") {
    const style =
      item.slot === "shield"
        ? "Shield"
        : item.style === "bow"
          ? "Bow"
          : item.style === "handbow"
            ? "Hand Crossbow"
            : item.style === "thrown"
              ? "Thrown"
              : item.style === "focus"
                ? "Focus"
                : itemHands(item) === 2
                  ? "Two-Hand"
                  : "One-Hand";
    if (item.slot === "shield") bits.push(`${style} ${live.armor} armor`);
    else bits.push(`${style} ${live.damageMin}–${live.damageMax}`);
  } else if (live.armor > 0) bits.push(`${live.armor} armor`);
  if (item.sockets > 0) {
    const filled = item.gems.filter((gem) => gem).length;
    bits.push(`${filled}/${item.sockets} sockets`);
  }
  if (item.rarity === "rainbow") bits.push("Scales with level");
  return bits.join(" · ");
}

const RARITY_YIELD: Record<Rarity, number> = {
  grey: 0.5,
  white: 1,
  green: 1.5,
  blue: 2,
  purple: 3,
  orange: 4,
  yellow: 5,
  gold: 6,
  red: 8,
  rainbow: 6,
};

const FRACTION_AFFIX = new Set([
  "crit",
  "manaRegen",
  "lifeRegen",
  "goldFind",
  "meleeMult",
  "spellMult",
  "evasion",
  "damageReduction",
  "moveSpeed",
  "bleedChance",
  "cdr",
  "attackSpeed",
  "frost",
]);

export function materialFor(item: Item): MaterialId {
  if (item.slot === "weapon") return "steel";
  if (item.slot === "shield") return item.armorType === "plate" ? "plate" : item.armorType === "mail" ? "rings" : "hide";
  if (isJewelry(item.slot)) return "dust";
  if (item.armorType === "leather") return "hide";
  if (item.armorType === "mail") return "rings";
  if (item.armorType === "plate") return "plate";
  return "weave";
}

function isJewelry(slot: ItemSlot): boolean {
  return slot === "ring" || slot === "neck" || slot === "earring";
}

export function canUpgrade(item: Item): boolean {
  return (
    item.slot === "weapon" ||
    item.slot === "shield" ||
    item.slot === "head" ||
    item.slot === "chest" ||
    item.slot === "belt" ||
    item.slot === "boots" ||
    item.slot === "gloves" ||
    isJewelry(item.slot)
  );
}

export function upgradeCost(item: Item): number {
  return Math.max(1, Math.round(item.ilvl) || 1);
}

export function upgradeBill(item: Item): { id: MaterialId; count: number }[] {
  const count = upgradeCost(item);
  const index = MATERIAL_ORDER.indexOf(materialFor(item));
  return MATERIAL_ORDER.slice(0, Math.max(0, index) + 1).map((id) => ({ id, count }));
}

export function salvageCount(item: Item): number {
  const level = Math.max(1, Math.round(item.ilvl) || 1);
  return Math.max(1, Math.round((level * (RARITY_YIELD[item.rarity] ?? 1)) / 4));
}

export function materialCount(c: Character, id: MaterialId): number {
  return c.materials.find((entry) => entry.id === id)?.count ?? 0;
}

export function addMaterial(c: Character, id: MaterialId, count: number): void {
  if (!Array.isArray(c.materials)) c.materials = [];
  const stack = c.materials.find((entry) => entry.id === id);
  if (stack) stack.count += count;
  else c.materials.push({ id, count });
}

function spendMaterial(c: Character, id: MaterialId, count: number): boolean {
  const stack = c.materials.find((entry) => entry.id === id);
  if (!stack || stack.count < count) return false;
  stack.count -= count;
  if (stack.count <= 0) c.materials = c.materials.filter((entry) => entry.count > 0);
  return true;
}

export function salvageItem(c: Character, uid: string): string | null {
  const index = c.inventory.findIndex((item) => item.uid === uid);
  if (index < 0) return "That item is not in the pack.";
  const item = c.inventory[index]!;
  if (item.slot === "gem") return "Gems are not broken down.";
  const sockets = item.gems.filter((gem) => gem);
  c.inventory.splice(index, 1);
  for (const gem of sockets) {
    if (!gem) continue;
    addGem(c, gem.kind, gem.quality, 1);
  }
  const count = salvageCount(item);
  addMaterial(c, materialFor(item), count);
  return null;
}

export function salvageMarked(c: Character): string[] {
  const marks = new Set(c.salvageMarks ?? []);
  const ids = c.inventory.filter((item) => item.slot !== "gem" && marks.has(item.rarity)).map((item) => item.uid);
  const names: string[] = [];
  for (const uid of ids) {
    const item = c.inventory.find((entry) => entry.uid === uid);
    if (!item) continue;
    const name = item.name;
    if (salvageItem(c, uid) === null) names.push(name);
  }
  return names;
}

export function upgradeItem(c: Character, uid: string): string | null {
  const item = findHost(c, uid);
  if (!item) return "That item is not here.";
  if (!canUpgrade(item)) return "Sable improves weapons, armor, and jewelry only.";
  const bill = upgradeBill(item);
  const short = bill.filter((row) => materialCount(c, row.id) < row.count);
  if (short.length > 0) return `Needs ${short.map((row) => `${row.count} ${MATERIAL_LABEL[row.id]}`).join(", ")}.`;
  for (const row of bill) spendMaterial(c, row.id, row.count);
  const from = Math.max(1, Math.round(item.ilvl) || 1);
  const mul = (from + 1) / from;
  if (item.damageMin > 0) item.damageMin = Math.max(1, Math.round(item.damageMin * mul));
  if (item.damageMax > 0) item.damageMax = Math.max(item.damageMin, Math.round(item.damageMax * mul));
  if (item.armor > 0) item.armor = Math.max(1, Math.round(item.armor * mul));
  for (const affix of item.affixes) {
    affix.value = FRACTION_AFFIX.has(affix.key) ? Math.round(affix.value * mul * 100) / 100 : Math.max(1, Math.round(affix.value * mul));
  }
  item.ilvl = from + 1;
  return null;
}

function gemDye(kind: GemKind): number {
  const dyes: Record<GemKind, number> = {
    ruby: 0xc43b3b,
    sapphire: 0x3d7ec4,
    topaz: 0xe2b143,
    emerald: 0x3eaf62,
    diamond: 0xe8f2f6,
    amethyst: 0x9a5cc4,
    skull: 0xd7d0c4,
  };
  return dyes[kind];
}
