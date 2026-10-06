import { liveItem } from "./itemstats";
import {
  raceArmorPct,
  raceAttrs,
  raceEnergyRegenMul,
  raceEvasion,
  raceGearArmorMul,
  raceGoldFind,
  raceInnateArmor,
  raceLifePct,
  raceLifeRegenFlat,
  raceLifeRegenMul,
  raceLifeRegenPct,
  raceLifeSteal,
  raceMagicFind,
  raceMoveSpeed,
} from "./races";
import {
  ATTRS,
  GEAR_SLOTS,
  type Affix,
  type Attr,
  type Character,
  type Derived,
  type Item,
  type Mods,
  type SlotName,
  type WeaponStyle,
  BASE_ATTR,
  BASE_LIFE,
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
  const racial = raceAttrs(c.race);
  const totals: Record<Attr, number> = {
    strength: 0,
    agility: 0,
    stamina: 0,
    luck: 0,
    spirit: 0,
  };
  for (const attr of ATTRS) {
    const innate = BASE_ATTR + c.spent[attr];
    totals[attr] = Math.round(innate * (1 + racial[attr]));
  }
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

/** Weapon slots that contribute attack dice (main + extras). */
export const WEAPON_SLOTS: SlotName[] = ["weapon", "offhand", "weapon3", "weapon4"];

export function equippedWeapons(c: Character): Item[] {
  return WEAPON_SLOTS.map((slot) => c.equipment[slot]).filter((item): item is Item => {
    if (!item) return false;
    return item.slot === "weapon" || (item.slot === "shield" ? false : item.damageMax > 0);
  });
}

function lived(c: Character): Item[] {
  return equipped(c).map((item) => liveItem(item, c.level));
}

export function gearNumber(c: Character, key: string): number {
  let total = 0;
  for (const item of lived(c)) {
    // Base armor plates are handled by gearArmorValue (racial mul). Affix armor still counts here.
    if (key === "armor") {
      for (const affix of item.affixes) {
        if (affix.key === "armor") total += affix.value;
      }
      continue;
    }
    for (const affix of item.affixes) {
      if (affix.key === key) total += affix.value;
    }
  }
  return total;
}

/** Armor from gear pieces only (not affixes). Subject to racial gear-armor mul. */
export function gearArmorValue(c: Character): number {
  let total = 0;
  for (const item of lived(c)) total += item.armor;
  return total * raceGearArmorMul(c.race);
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
    (BASE_LIFE + (c.level - 1) * 5 + (attr.stamina - BASE_ATTR) + mods.life + gearNumber(c, "life")) *
      (1 + raceLifePct(c.race)),
  );
  // Spirit feeds energy storage; passives/gear add more.
  const energy = Math.round(
    24 + c.level * 0.5 + attr.spirit * 0.4 + mods.energy + mods.energyMax + gearNumber(c, "energy") + gearNumber(c, "energyMax"),
  );
  const energyOnHit = Math.max(1, 3 + mods.energyOnHit + gearNumber(c, "energyOnHit") + attr.spirit * 0.02);
  let armor =
    attr.stamina * 0.25 + raceInnateArmor(c.race) + gearArmorValue(c) + mods.armor + gearNumber(c, "armor");
  armor *= 1 + mods.armorPct + raceArmorPct(c.race);

  const attackRating = Math.round(
    10 + c.level * 2 + attr.agility * 1.5 + mods.attackRating + gearNumber(c, "attackRating"),
  );
  const evasion = clamp(
    0.02 + attr.agility * 0.0025 + mods.evasion + gearNumber(c, "evasion") + raceEvasion(c.race),
    0,
    0.45,
  );
  const crit = clamp(
    0.02 + attr.agility * 0.001 + attr.luck * 0.0035 + mods.crit + gearNumber(c, "crit"),
    0,
    0.6,
  );

  // STR feeds all damage. AGI adds for swift/ranged styles.
  const strMul = 1 + attr.strength * 0.015;
  const agiClass =
    style === "bow" || style === "thrown" || style === "handbow" || (style === "melee" && c.race === "insectoid")
      ? 1 + attr.agility * 0.008
      : style === "melee"
        ? 1 + attr.agility * 0.002
        : 1;
  const meleeMul = mods.meleeMult + gearNumber(c, "meleeMult");
  const spellMulGear = mods.spellMult + gearNumber(c, "spellMult");
  const skillMul = style === "focus" ? 1 + spellMulGear : 1 + meleeMul;
  const ranged = style === "bow" || style === "thrown" || style === "handbow";
  const bowMul = ranged ? 1 + mods.projectileMult * 0.5 : 1;

  const flat = gearNumber(c, "damage");
  const dice = weaponDice(c);
  let meleeMin = (dice.min + flat) * strMul * agiClass * skillMul * bowMul;
  let meleeMax = (dice.max + flat) * strMul * agiClass * skillMul * bowMul;
  if (meleeMax < meleeMin) meleeMax = meleeMin;

  const focusBonus = style === "focus" ? 1.15 : 1;
  const spellMul = (1 + spellMulGear) * focusBonus * strMul;
  const spellMin = (4 + attr.spirit * 0.15 + attr.strength * 0.25) * spellMul;
  const spellMax = (7 + attr.spirit * 0.25 + attr.strength * 0.4) * spellMul;

  const speed = weapon?.speed ?? 1;
  const attackPeriod =
    0.58 / speed / (1 + mods.attackSpeed + gearNumber(c, "attackSpeed") + attr.agility * 0.002);
  const moveSpeed =
    172 *
    (1 + mods.moveSpeed + gearNumber(c, "moveSpeed") + attr.agility * 0.0025 + raceMoveSpeed(c.race));
  const weaponRange =
    (style === "bow"
      ? 300
      : style === "handbow"
        ? 240
        : style === "thrown"
          ? 180
          : style === "focus"
            ? 230
            : 70) + (weapon?.rangeBonus ?? 0);

  const goldFind = mods.goldFind + gearNumber(c, "goldFind") + attr.luck * 0.012 + raceGoldFind(c.race);
  const magicFind = mods.magicFind + gearNumber(c, "magicFind") + attr.luck * 0.01 + raceMagicFind(c.race);
  const vendorPrice = clamp(mods.vendorPrice + gearNumber(c, "vendorPrice") + attr.luck * 0.008, -0.35, 0.5);
  const vendorQuality = mods.vendorQuality + gearNumber(c, "vendorQuality") + attr.luck * 0.006;

  const baseRegen =
    c.level +
    attr.stamina / 10 +
    mods.lifeRegen +
    gearNumber(c, "lifeRegen") +
    raceLifeRegenFlat(c.race) +
    life * raceLifeRegenPct(c.race);
  const lifeRegen = baseRegen * raceLifeRegenMul(c.race);
  const energyRegen =
    (0.35 + attr.spirit * 0.04 + mods.energyRegen + gearNumber(c, "energyRegen")) * raceEnergyRegenMul(c.race);

  return {
    strength: attr.strength,
    agility: attr.agility,
    stamina: attr.stamina,
    luck: attr.luck,
    spirit: attr.spirit,
    life,
    energy,
    energyOnHit,
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
    lifeRegen,
    energyRegen,
    thorns: mods.thorns + gearNumber(c, "thorns"),
    damageReduction: clamp(mods.damageReduction + gearNumber(c, "damageReduction"), 0, 0.35),
    bleedChance: clamp(mods.bleedChance + gearNumber(c, "bleedChance"), 0, 0.75),
    goldFind,
    magicFind,
    vendorPrice,
    vendorQuality,
    lifeSteal: clamp(raceLifeSteal(c.race), 0, 0.25),
  };
}

/**
 * Weapon dice before STR/AGI/skill modifiers.
 * Insectoid (weak arms): main 75%, each off-arm 25%.
 * Everyone else: main 100%, each extra weapon hand 50%.
 * Shields add none.
 */
function weaponDice(c: Character): { min: number; max: number } {
  const mainMul = c.race === "insectoid" ? 0.75 : 1;
  const extraMul = c.race === "insectoid" ? 0.25 : 0.5;
  const main = c.equipment.weapon ? liveItem(c.equipment.weapon, c.level) : null;
  let min = (main?.damageMin ?? 3) * mainMul;
  let max = (main?.damageMax ?? 6) * mainMul;
  for (const slot of ["offhand", "weapon3", "weapon4"] as const) {
    const piece = c.equipment[slot];
    if (!piece) continue;
    const live = liveItem(piece, c.level);
    if (live.slot === "shield" || live.damageMax <= 0) continue;
    min += live.damageMin * extraMul;
    max += live.damageMax * extraMul;
  }
  return { min, max };
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
  return attr.strength >= item.reqStr && attr.agility >= item.reqDex && attr.spirit >= item.reqEne;
}

export function requirementText(item: Item): string | null {
  const parts: string[] = [];
  if (item.reqStr) parts.push(`${item.reqStr} Strength`);
  if (item.reqDex) parts.push(`${item.reqDex} Agility`);
  if (item.reqEne) parts.push(`${item.reqEne} Spirit`);
  return parts.length ? `Requires ${parts.join(", ")}` : null;
}

export function summarizeAffix(affix: Affix): string {
  return affix.label;
}
