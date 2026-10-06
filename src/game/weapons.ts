import type { WeaponHands, WeaponStyle } from "./types";

/**
 * Distinct weapon identities. Combat speed / reach / swing timing come from this table
 * (1H vs 2H variants where both exist). Leave room for more types later.
 */
export type WeaponType =
  | "sword"
  | "axe"
  | "mace"
  | "staff"
  | "wand"
  | "bow"
  | "crossbow"
  | "dagger"
  | "throwing_dagger"
  | "throwing_star"
  | "throwing_axe"
  | "spear"
  | "javelin";

export interface WeaponProfile {
  type: WeaponType;
  label: string;
  style: WeaponStyle;
  hands: WeaponHands;
  /** Attacks-per-beat multiplier — higher is faster. Feeds attackPeriod. */
  speed: number;
  /** World-unit hit / shot reach before item rangeBonus. */
  reach: number;
  /** Committed swing / draw window in seconds (visual + brief lock feel). */
  swing: number;
}

/** Canonical profiles — 2H entries are generally slower unless the type is built for pace. */
export const WEAPON_PROFILES: Record<WeaponType, WeaponProfile> = {
  dagger: { type: "dagger", label: "Dagger", style: "melee", hands: 1, speed: 1.28, reach: 52, swing: 0.12 },
  sword: { type: "sword", label: "Sword", style: "melee", hands: 1, speed: 1.0, reach: 70, swing: 0.16 },
  axe: { type: "axe", label: "Axe", style: "melee", hands: 1, speed: 0.92, reach: 68, swing: 0.18 },
  mace: { type: "mace", label: "Mace", style: "melee", hands: 1, speed: 0.88, reach: 66, swing: 0.19 },
  spear: { type: "spear", label: "Spear", style: "melee", hands: 2, speed: 0.9, reach: 108, swing: 0.2 },
  staff: { type: "staff", label: "Staff", style: "focus", hands: 2, speed: 0.86, reach: 250, swing: 0.22 },
  wand: { type: "wand", label: "Wand", style: "focus", hands: 1, speed: 1.12, reach: 230, swing: 0.14 },
  bow: { type: "bow", label: "Bow", style: "bow", hands: 2, speed: 1.0, reach: 300, swing: 0.2 },
  crossbow: { type: "crossbow", label: "Crossbow", style: "handbow", hands: 1, speed: 0.9, reach: 260, swing: 0.22 },
  throwing_dagger: { type: "throwing_dagger", label: "Throwing Dagger", style: "thrown", hands: 1, speed: 1.22, reach: 175, swing: 0.12 },
  throwing_star: { type: "throwing_star", label: "Throwing Star", style: "thrown", hands: 1, speed: 1.3, reach: 165, swing: 0.11 },
  throwing_axe: { type: "throwing_axe", label: "Throwing Axe", style: "thrown", hands: 1, speed: 1.0, reach: 190, swing: 0.16 },
  javelin: { type: "javelin", label: "Javelin", style: "thrown", hands: 1, speed: 0.95, reach: 220, swing: 0.18 },
};

/** Optional 2H overlays when the same family exists as two-hand (axe / mace / sword). */
export const WEAPON_PROFILES_2H: Partial<Record<WeaponType, WeaponProfile>> = {
  sword: { type: "sword", label: "Greatsword", style: "melee", hands: 2, speed: 0.82, reach: 88, swing: 0.24 },
  axe: { type: "axe", label: "Greataxe", style: "melee", hands: 2, speed: 0.74, reach: 92, swing: 0.28 },
  mace: { type: "mace", label: "Maul", style: "melee", hands: 2, speed: 0.72, reach: 86, swing: 0.3 },
  crossbow: { type: "crossbow", label: "Heavy Crossbow", style: "bow", hands: 2, speed: 0.78, reach: 320, swing: 0.28 },
};

export function weaponProfile(type: WeaponType | null | undefined, hands: WeaponHands = 1): WeaponProfile {
  if (!type || !(type in WEAPON_PROFILES)) {
    return hands === 2
      ? WEAPON_PROFILES_2H.sword ?? { ...WEAPON_PROFILES.sword, hands: 2, speed: 0.82, reach: 88, swing: 0.24 }
      : WEAPON_PROFILES.sword;
  }
  if (hands === 2 && WEAPON_PROFILES_2H[type]) return WEAPON_PROFILES_2H[type]!;
  return WEAPON_PROFILES[type];
}

export function weaponTypeLabel(type: WeaponType | null | undefined, hands: WeaponHands = 1): string {
  return weaponProfile(type, hands).label;
}

/** Best-effort type from legacy name/style when saves lack weaponType. */
export function inferWeaponType(name: string, style: WeaponStyle, hands: WeaponHands): WeaponType {
  const n = name.toLowerCase();
  if (style === "bow" || n.includes("bow") && !n.includes("cross")) return "bow";
  if (style === "handbow" || n.includes("crossbow")) return "crossbow";
  if (style === "focus") {
    if (n.includes("staff") || n.includes("rod") || hands === 2) return "staff";
    return "wand";
  }
  if (style === "thrown") {
    if (n.includes("star") || n.includes("shuriken")) return "throwing_star";
    if (n.includes("javelin") || n.includes("pilum")) return "javelin";
    if (n.includes("hatchet") || n.includes("axe")) return "throwing_axe";
    return "throwing_dagger";
  }
  if (n.includes("spear") || n.includes("pike") || n.includes("lance")) return "spear";
  if (n.includes("dagger") || n.includes("knife") || n.includes("dirk")) return "dagger";
  if (n.includes("mace") || n.includes("maul") || n.includes("hammer") || n.includes("club")) return "mace";
  if (n.includes("axe") || n.includes("cleaver") || n.includes("hatchet")) return "axe";
  if (n.includes("staff")) return "staff";
  if (n.includes("wand") || n.includes("focus")) return "wand";
  if (n.includes("javelin")) return "javelin";
  return hands === 2 && (n.includes("great") || n.includes("claymore")) ? "sword" : "sword";
}

export function formatAttackSpeed(speed: number): string {
  // Present as relative swing rate vs a 1.0 sword.
  const pct = Math.round(speed * 100);
  return `${pct}% swing rate`;
}

export function formatReach(reach: number): string {
  return `reach ${Math.round(reach)}`;
}
