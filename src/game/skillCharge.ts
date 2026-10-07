import { clamp, type Character, type Derived, type Mods } from "./types";
import { gearNumber } from "./formulas";
import { raceCdr } from "./races";
import { scaledActive } from "./skills";

/** Per-slot skill energy bank. Actives store charges; channels/auras use energy alone. */
export interface SkillBank {
  energy: number;
  charges: number;
}

export interface SkillChargeProfile {
  /** Energy needed to gain one charge (or to cast a channel / fill an aura well). */
  pool: number;
  /** Stored charges for discrete actives; 0 for channel/aura (continuous bar only). */
  maxCharges: number;
  /** True for channel and aura — UI shows an outer ring, no pips. */
  continuous: boolean;
  color: string;
}

export function emptySkillBanks(): [SkillBank, SkillBank, SkillBank] {
  return [
    { energy: 0, charges: 0 },
    { energy: 0, charges: 0 },
    { energy: 0, charges: 0 },
  ];
}

/**
 * Pool and charge capacity for a slotted skill.
 * Skill rank and attributes shrink the pool (faster to fill).
 * Former cooldown weight still sets how many charges a skill can bank.
 * No mana/CDR gear — charge pace is skill + attributes (+ racial recharge).
 */
export function skillChargeProfile(
  id: string,
  rank: number,
  ranks: Record<string, number>,
  derived: Derived,
  mods: Mods,
  character: Character,
): SkillChargeProfile | null {
  const spec = scaledActive(id, rank, ranks);
  if (!spec) return null;
  const continuous = spec.kind === "channel" || spec.kind === "aura";
  const attrScale =
    spec.scaling === "spell"
      ? 1 + derived.spirit * 0.014
      : 1 + derived.strength * 0.011 + derived.agility * 0.004;
  const raceEase = 1 + clamp(raceCdr(character.race), -0.35, 0.4) * 0.45;
  const rankEase = 1 + 0.04 * Math.max(0, rank - 1);
  const weight = 10 + spec.energyCost * 2.4 + spec.cooldown * 2.8;
  const pool = Math.max(8, Math.round(weight / Math.max(0.55, attrScale * raceEase * rankEase)));

  let maxCharges = 0;
  if (!continuous) {
    maxCharges = clamp(Math.round(4.6 - spec.cooldown / 3.2), 1, 4);
    maxCharges = clamp(maxCharges + Math.round(mods.chargeMax + gearNumber(character, "chargeMax")), 1, 6);
  }

  return {
    pool,
    maxCharges,
    continuous,
    color: spec.color,
  };
}

/**
 * Damage multiplier from charge pace and bank size.
 * Slow-to-fill skills (large pool) hit harder; more max charges softens each cast.
 */
export function skillChargeDamageFactor(profile: SkillChargeProfile, chargeOnHit: number): number {
  const onHit = Math.max(0.5, chargeOnHit);
  const chargeSpeed = onHit / Math.max(1, profile.pool);
  const banks = Math.max(1, profile.continuous ? 1 : profile.maxCharges);
  // Reference: ~0.15 fill/hit and 2 stored charges → factor ≈ 1.
  const factor = (0.15 / Math.max(0.04, chargeSpeed)) * (2 / banks);
  return clamp(factor, 0.55, 6.5);
}

/** Add on-hit energy into a bank, converting full pools into charges when applicable. */
export function addBankEnergy(bank: SkillBank, profile: SkillChargeProfile, amount: number): void {
  if (amount <= 0 || profile.pool <= 0) return;
  if (profile.continuous) {
    bank.energy = Math.min(profile.pool, bank.energy + amount);
    return;
  }
  if (bank.charges >= profile.maxCharges) {
    bank.energy = profile.pool;
    return;
  }
  bank.energy += amount;
  while (bank.energy >= profile.pool && bank.charges < profile.maxCharges) {
    bank.energy -= profile.pool;
    bank.charges += 1;
  }
  if (bank.charges >= profile.maxCharges) bank.energy = Math.min(bank.energy, profile.pool);
}

export function bankReady(bank: SkillBank, profile: SkillChargeProfile): boolean {
  if (profile.continuous) return bank.energy >= profile.pool - 0.001;
  return bank.charges >= 1;
}

/** Spend one cast: a charge for actives, a full pool for channels. */
export function spendBank(bank: SkillBank, profile: SkillChargeProfile): boolean {
  if (!bankReady(bank, profile)) return false;
  if (profile.continuous) {
    bank.energy = 0;
    return true;
  }
  bank.charges -= 1;
  return true;
}
