import { liveItem } from "./itemstats";
import {
  ATTRS,
  GEAR_SLOTS,
  type Affix,
  type Attr,
  type Character,
  type Derived,
  type Item,
  type Mods,
  type WeaponStyle,
  BASE_ATTR,
  clamp,
  emptyMods,
  MAX_LEVEL,
  PARAGON_CAP,
} from "./types";

export function xpToNext(level: number): number {
  return 20 + level * 16;
}

export function xpGoal(c: Character): number {
  if (c.level < MAX_LEVEL) return xpToNext(c.level);
  if (c.paragon < PARAGON_CAP) return xpToNext(MAX_LEVEL + c.paragon);
  return 1;
}

export function attributes(c: Character): Record<Attr, number> {
  const totals: Record<Attr, number> = {
    strength: BASE_ATTR + c.spent.strength,
    agility: BASE_ATTR + c.spent.agility,
    endurance: BASE_ATTR + c.spent.endurance,
    wisdom: BASE_ATTR + c.spent.wisdom,
  };
  for (const item of lived(c)) {
    for (const affix of item.affixes) {
      if ((ATTRS as string[]).includes(affix.key)) {
        totals[affix.key as Attr] += affix.value;
      }
    }
  }
  return totals;
}

export function equipped(c: Character): Item[] {
  return GEAR_SLOTS.map((slot) => c.equipment[slot]).filter((item): item is Item => item !== null);
}

function lived(c: Character): Item[] {
  return equipped(c).map((item) => liveItem(item, c.level));
}

export function gearNumber(c: Character, key: string): number {
  let total = 0;
  for (const item of lived(c)) {
    if (key === "armor") total += item.armor;
    for (const affix of item.affixes) {
      if (affix.key === key) total += affix.value;
    }
  }
  return total;
}

export function addMods(into: Mods, extra: Partial<Mods>): void {
  for (const key of Object.keys(extra) as (keyof Mods)[]) {
    const value = extra[key];
    if (typeof value === "number") into[key] += value;
  }
}

export function derive(c: Character, mods: Mods = emptyMods()): Derived {
  const attr = attributes(c);
  const weapon = c.equipment.weapon ? liveItem(c.equipment.weapon, c.level) : null;
  const style: WeaponStyle = weapon?.style ?? "melee";
  const life = Math.round(
    32 + c.level * 4 + attr.endurance * 4 + mods.life + gearNumber(c, "life"),
  );
  const mana = Math.round(
    16 + c.level + attr.wisdom * 3 + mods.mana + gearNumber(c, "mana"),
  );
  let armor =
    attr.strength * 0.35 + gearNumber(c, "armor") + mods.armor;
  armor *= 1 + mods.armorPct;
  const attackRating = Math.round(
    10 + c.level * 2 + attr.agility * 2 + mods.attackRating + gearNumber(c, "attackRating"),
  );
  const evasion = clamp(attr.agility * 0.0035 + mods.evasion + gearNumber(c, "evasion"), 0, 0.4);
  const crit = clamp(attr.agility * 0.002 + mods.crit + gearNumber(c, "crit"), 0, 0.55);
  const scaler =
    style === "bow" ? attr.agility : style === "focus" ? attr.wisdom : attr.strength;
  const statMul = 1 + scaler * 0.015;
  const meleeMul = mods.meleeMult + gearNumber(c, "meleeMult");
  const spellMulGear = mods.spellMult + gearNumber(c, "spellMult");
  const skillMul = style === "focus" ? 1 + spellMulGear : 1 + meleeMul;
  const bowMul = style === "bow" ? 1 + mods.projectileMult * 0.5 : 1;
  const flat = gearNumber(c, "damage");
  let meleeMin = ((weapon?.damageMin ?? 3) + flat) * statMul * skillMul * bowMul;
  let meleeMax = ((weapon?.damageMax ?? 6) + flat) * statMul * skillMul * bowMul;
  if (meleeMax < meleeMin) meleeMax = meleeMin;
  const focusBonus = style === "focus" ? 1.15 : 1;
  const spellMul = (1 + spellMulGear) * focusBonus;
  const spellMin = (4 + attr.wisdom * 0.4) * spellMul;
  const spellMax = (7 + attr.wisdom * 0.65) * spellMul;
  const speed = weapon?.speed ?? 1;
  const attackPeriod =
    0.58 / speed / (1 + mods.attackSpeed + gearNumber(c, "attackSpeed") + attr.agility * 0.002);
  const moveSpeed = 172 * (1 + mods.moveSpeed + gearNumber(c, "moveSpeed") + attr.agility * 0.0025);
  const weaponRange =
    (style === "bow" ? 300 : style === "focus" ? 230 : 70) + (weapon?.rangeBonus ?? 0);

  return {
    strength: attr.strength,
    agility: attr.agility,
    endurance: attr.endurance,
    wisdom: attr.wisdom,
    life,
    mana,
    armor,
    attackRating,
    evasion,
    crit,
    meleeMin,
    meleeMax,
    spellMin,
    spellMax,
    attackPeriod,
    moveSpeed,
    weaponStyle: style,
    weaponRange,
    lifeRegen: c.level + attr.endurance / 10 + mods.lifeRegen + gearNumber(c, "lifeRegen"),
    manaRegen: 1.15 + mods.manaRegen + gearNumber(c, "manaRegen"),
    thorns: mods.thorns + gearNumber(c, "thorns"),
    damageReduction: clamp(mods.damageReduction + gearNumber(c, "damageReduction"), 0, 0.35),
    bleedChance: clamp(mods.bleedChance + gearNumber(c, "bleedChance"), 0, 0.75),
    goldFind: mods.goldFind + gearNumber(c, "goldFind"),
  };
}

export function mitigate(raw: number, armor: number, attackerLevel: number, reduction = 0): number {
  const fromArmor = armor <= 0 ? 0 : armor / (armor + 50 + attackerLevel * 5);
  const afterArmor = raw * (1 - clamp(fromArmor, 0, 0.7));
  return Math.max(0, afterArmor * (1 - clamp(reduction, 0, 0.35)));
}

export function hitChance(attackRating: number, defense: number): number {
  const chance = attackRating / (attackRating + Math.max(1, defense));
  return clamp(chance, 0.45, 0.96);
}

export function rollRange(min: number, max: number, rng: () => number): number {
  return min + (max - min) * rng();
}

export function meetsRequirements(c: Character, item: Item): boolean {
  const attr = attributes(c);
  return attr.strength >= item.reqStr && attr.agility >= item.reqDex && attr.wisdom >= item.reqEne;
}

export function requirementText(item: Item): string | null {
  const parts: string[] = [];
  if (item.reqStr) parts.push(`${item.reqStr} Strength`);
  if (item.reqDex) parts.push(`${item.reqDex} Agility`);
  if (item.reqEne) parts.push(`${item.reqEne} Wisdom`);
  return parts.length ? `Requires ${parts.join(", ")}` : null;
}

export function formatAffix(affix: Affix): string {
  return affix.label;
}
