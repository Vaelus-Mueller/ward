import type { Affix, ArmorType, GemKind, Item, ItemSlot, Rarity, WeaponStyle } from "./types";

/**
 * Reminder for later — do not implement yet.
 * Set items need one shared visual look per set: the same dye, trim, and body tint
 * on every piece, so a worn set reads as a matching outfit. No set bonuses until that look exists.
 */

const GEM_WEAPON: Record<GemKind, Affix> = {
  ruby: { key: "damage", value: 2, label: "Ruby: +2 weapon damage" },
  sapphire: { key: "attackRating", value: 8, label: "Sapphire: +8 attack rating" },
  topaz: { key: "crit", value: 0.02, label: "Topaz: +2% critical chance" },
  emerald: { key: "agility", value: 2, label: "Emerald: +2 Agility" },
  diamond: { key: "damage", value: 3, label: "Diamond: +3 weapon damage" },
  amethyst: { key: "strength", value: 2, label: "Amethyst: +2 Strength" },
  skull: { key: "lifeRegen", value: 0.35, label: "Skull: +0.35 life regeneration" },
};

const GEM_HELM: Record<GemKind, Affix> = {
  ruby: { key: "life", value: 8, label: "Ruby: +8 life" },
  sapphire: { key: "mana", value: 6, label: "Sapphire: +6 mana" },
  topaz: { key: "goldFind", value: 0.04, label: "Topaz: +4% gold find" },
  emerald: { key: "agility", value: 2, label: "Emerald: +2 Agility" },
  diamond: { key: "armor", value: 4, label: "Diamond: +4 armor" },
  amethyst: { key: "strength", value: 2, label: "Amethyst: +2 Strength" },
  skull: { key: "lifeRegen", value: 0.3, label: "Skull: +0.30 life regeneration" },
};

const GEM_ARMOR: Record<GemKind, Affix> = {
  ruby: { key: "life", value: 12, label: "Ruby: +12 life" },
  sapphire: { key: "mana", value: 8, label: "Sapphire: +8 mana" },
  topaz: { key: "goldFind", value: 0.05, label: "Topaz: +5% gold find" },
  emerald: { key: "agility", value: 3, label: "Emerald: +3 Agility" },
  diamond: { key: "armor", value: 6, label: "Diamond: +6 armor" },
  amethyst: { key: "strength", value: 3, label: "Amethyst: +3 Strength" },
  skull: { key: "lifeRegen", value: 0.4, label: "Skull: +0.40 life regeneration" },
};

export function gemAffixes(item: Item): Affix[] {
  const table = item.slot === "weapon" ? GEM_WEAPON : item.slot === "head" ? GEM_HELM : GEM_ARMOR;
  if (item.slot !== "weapon" && item.slot !== "head" && item.slot !== "chest") return [];
  return item.gems.filter((gem): gem is GemKind => gem !== null).map((gem) => table[gem]);
}

export function socketCap(slot: ItemSlot, armorType: ArmorType | null, style: WeaponStyle, ilvl: number): number {
  if (slot !== "weapon" && slot !== "head" && slot !== "chest") return 0;
  let base = 2;
  if (slot === "weapon") base = style === "focus" ? 2 : style === "bow" ? 4 : 3;
  else if (slot === "head") base = armorType === "plate" ? 3 : armorType === "cloth" ? 1 : 2;
  else base = armorType === "plate" ? 4 : armorType === "mail" ? 3 : 2;
  const byLevel = ilvl <= 25 ? 3 : ilvl <= 40 ? 4 : 6;
  return Math.min(base, byLevel);
}

/**
 * Diablo 2 socket count, kept rare on everything except normal white gear.
 * White (normal) rolls 0 through the max, each outcome equal, so 0 means no sockets.
 * Grey (low quality) uses that same roll with a max of 1.
 * Green and blue (magic) only socket when a socket prefix hits: Mechanic's 1–2, Artisan's 3, Jeweler's 4.
 * Purple, orange, yellow, gold, and red do not roll sockets.
 * Rainbow has a small chance of a single socket.
 * Belts, boots, gloves, rings, and necklaces never socket.
 */
export function rollSocketCount(rng: () => number, rarity: Rarity, cap: number): number {
  if (cap <= 0) return 0;
  if (rarity === "grey") return Math.floor(rng() * (Math.min(1, cap) + 1));
  if (rarity === "white") return Math.floor(rng() * (cap + 1));
  if (rarity === "green" || rarity === "blue") {
    if (rng() > (rarity === "blue" ? 0.07 : 0.04)) return 0;
    const roll = rng();
    const count = roll < 0.6 ? (rng() < 0.5 ? 1 : 2) : roll < 0.9 ? 3 : 4;
    return Math.min(cap, count);
  }
  if (rarity === "rainbow") return rng() < 0.06 ? Math.min(1, cap) : 0;
  return 0;
}

function roundAffix(key: string, value: number): number {
  if (
    key === "crit" ||
    key === "manaRegen" ||
    key === "lifeRegen" ||
    key === "goldFind" ||
    key === "meleeMult" ||
    key === "spellMult" ||
    key === "evasion" ||
    key === "damageReduction" ||
    key === "moveSpeed" ||
    key === "bleedChance" ||
    key === "cdr" ||
    key === "attackSpeed"
  ) {
    return Math.round(value * 100) / 100;
  }
  return Math.max(1, Math.round(value));
}

function affixLabel(key: string, value: number): string {
  switch (key) {
    case "strength":
      return `+${value} Strength`;
    case "agility":
      return `+${value} Agility`;
    case "endurance":
      return `+${value} Endurance`;
    case "wisdom":
      return `+${value} Wisdom`;
    case "life":
      return `+${value} Life`;
    case "mana":
      return `+${value} Mana`;
    case "armor":
      return `+${value} Armor`;
    case "damage":
      return `+${value} Weapon Damage`;
    case "attackRating":
      return `+${value} Attack Rating`;
    case "crit":
      return `+${Math.round(value * 100)}% Critical Chance`;
    case "manaRegen":
      return `+${value.toFixed(2)} Mana Regeneration`;
    case "lifeRegen":
      return `+${value.toFixed(2)} Life Regeneration`;
    case "goldFind":
      return `+${Math.round(value * 100)}% Gold Find`;
    case "meleeMult":
      return `${Math.round(value * 100)}% more melee damage`;
    case "spellMult":
      return `${Math.round(value * 100)}% more spell damage`;
    case "evasion":
      return `${Math.round(value * 100)}% dodge`;
    case "damageReduction":
      return `${Math.round(value * 100)}% damage reduction`;
    case "moveSpeed":
      return `${Math.round(value * 100)}% movement speed`;
    case "thorns":
      return `${value} thorns`;
    case "bleedChance":
      return `${Math.round(value * 100)}% bleed chance`;
    case "cdr":
      return `${Math.round(value * 100)}% cooldown reduction`;
    case "attackSpeed":
      return `${Math.round(value * 100)}% attack speed`;
    default:
      return `+${value} ${key}`;
  }
}

export function liveItem(item: Item, level: number): Item {
  const born = item.bornLevel > 0 ? item.bornLevel : 1;
  const mul = item.rarity === "rainbow" ? Math.max(1, level) / born : 1;
  let damageMin = item.damageMin <= 0 ? 0 : Math.max(1, Math.round(item.damageMin * mul));
  let damageMax = item.damageMax <= 0 ? 0 : Math.max(damageMin, Math.round(item.damageMax * mul));
  let armor = Math.max(0, Math.round(item.armor * mul));
  if (item.ethereal && item.slot === "weapon") {
    damageMin = Math.max(1, Math.round(damageMin * 1.1));
    damageMax = Math.max(damageMin, Math.round(damageMax * 1.1));
  } else if (item.ethereal) {
    armor = Math.round(armor * 1.1);
  }
  const affixes = item.affixes.map((affix) => {
    const value = roundAffix(affix.key, affix.value * mul);
    return { key: affix.key, value, label: affixLabel(affix.key, value) };
  });
  return { ...item, damageMin, damageMax, armor, affixes: [...affixes, ...gemAffixes(item)] };
}
