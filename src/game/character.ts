import { equipped, xpToNext } from "./formulas";
import { ACTIVES, SKILLS, SPEC_LABEL, SECTORS, skillById, type SkillNode } from "./skills";
import {
  ATTRS,
  CLASS_POINT_LEVELS,
  classPointsForLevel,
  MAX_LEVEL,
  PARAGON_CAP,
  PARAGON_SKILL_EVERY,
  PARAGON_STAT_POINTS,
  SKILL_POINTS_PER_LEVEL,
  STAT_POINTS_PER_LEVEL,
  type Attr,
  emptyEquipment,
  type Character,
  type Gender,
  type RaceId,
  type SectorId,
} from "./types";

export function createCharacter(name = "Exile", race: RaceId = "human", gender: Gender = "male"): Character {
  return {
    name,
    race,
    gender: gender === "female" ? "female" : "male",
    level: 1,
    xp: 0,
    gold: 0,
    spent: { strength: 0, agility: 0, stamina: 0, luck: 0, spirit: 0 },
    unspentStats: 0,
    unspentSkills: 0,
    unspentClass: 0,
    skillRanks: {},
    slotted: [null, null, null],
    equipment: emptyEquipment(),
    inventory: [],
    gems: [],
    materials: [],
    salvageMarks: ["grey", "white"],
    retrains: 0,
    paragon: 0,
  };
}

export interface LevelGain {
  levels: number;
  paragons: number;
}

export function grantXp(c: Character, amount: number): LevelGain {
  const none = { levels: 0, paragons: 0 };
  if (amount <= 0) return none;
  if (!Number.isFinite(c.paragon)) c.paragon = 0;
  if (c.level >= MAX_LEVEL && c.paragon >= PARAGON_CAP) return none;
  c.xp += amount;
  let levels = 0;
  let paragons = 0;
  while (c.level < MAX_LEVEL && c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    c.level += 1;
    c.unspentStats += STAT_POINTS_PER_LEVEL;
    c.unspentSkills += SKILL_POINTS_PER_LEVEL;
    if ((CLASS_POINT_LEVELS as readonly number[]).includes(c.level)) c.unspentClass += 1;
    levels += 1;
  }
  while (c.level >= MAX_LEVEL && c.paragon < PARAGON_CAP && c.xp >= xpToNext(MAX_LEVEL + c.paragon)) {
    c.xp -= xpToNext(MAX_LEVEL + c.paragon);
    c.paragon += 1;
    c.unspentStats += PARAGON_STAT_POINTS;
    if (c.paragon % PARAGON_SKILL_EVERY === 0) c.unspentSkills += 1;
    paragons += 1;
  }
  if (c.level >= MAX_LEVEL && c.paragon >= PARAGON_CAP) c.xp = 0;
  return { levels, paragons };
}

export function spendStat(c: Character, attr: Attr): boolean {
  if (c.unspentStats <= 0) return false;
  c.unspentStats -= 1;
  c.spent[attr] += 1;
  return true;
}

export function refundStat(c: Character, attr: Attr): boolean {
  if (c.spent[attr] <= 0) return false;
  c.spent[attr] -= 1;
  c.unspentStats += 1;
  return true;
}

export function retrainCost(c: Character): number {
  if (c.retrains <= 0) return 0;
  return 40 * 2 ** (c.retrains - 1);
}

export function retrain(c: Character): boolean {
  const cost = retrainCost(c);
  if (c.gold < cost) return false;
  c.gold -= cost;
  c.retrains += 1;
  for (const attr of ATTRS) c.spent[attr] = 0;
  c.unspentStats = (c.level - 1) * STAT_POINTS_PER_LEVEL + c.paragon * PARAGON_STAT_POINTS;
  c.skillRanks = {};
  c.unspentSkills = (c.level - 1) * SKILL_POINTS_PER_LEVEL + Math.floor(c.paragon / PARAGON_SKILL_EVERY);
  c.unspentClass = classPointsForLevel(c.level);
  c.slotted = [null, null, null];
  return true;
}

export function pointsInSector(c: Character, sector: SectorId): number {
  let total = 0;
  for (const skill of SKILLS) {
    if (skill.sector === sector) total += c.skillRanks[skill.id] ?? 0;
  }
  return total;
}

export function pointsInSpec(c: Character, spec: string): number {
  let total = 0;
  for (const skill of SKILLS) {
    if (skill.spec === spec) total += c.skillRanks[skill.id] ?? 0;
  }
  return total;
}

export function canSpendSkill(c: Character, id: string): { ok: boolean; reason: string } {
  const skill = skillById(id);
  if (!skill) return { ok: false, reason: "Unknown skill." };
  const rank = c.skillRanks[id] ?? 0;
  if (rank >= skill.maxRank) return { ok: false, reason: "Already at max rank." };
  if (skill.classPoint) {
    if ((c.unspentClass ?? 0) <= 0) return { ok: false, reason: "No class points left." };
  } else if (c.unspentSkills <= 0) {
    return { ok: false, reason: "No skill points left." };
  }
  for (const req of skill.requires) {
    if ((c.skillRanks[req] ?? 0) < 1) {
      return { ok: false, reason: `Requires ${skillById(req)?.name ?? req}.` };
    }
  }
  if (skill.requiresAny.length > 0) {
    const open = skill.requiresAny.some((req) => (c.skillRanks[req] ?? 0) >= 1);
    if (!open) {
      const names = skill.requiresAny.map((req) => skillById(req)?.name ?? req).join(" or ");
      return { ok: false, reason: `Requires ${names}.` };
    }
  }
  return { ok: true, reason: "" };
}

export function spendSkill(c: Character, id: string): boolean {
  if (!canSpendSkill(c, id).ok) return false;
  const skill = skillById(id)!;
  c.skillRanks[id] = (c.skillRanks[id] ?? 0) + 1;
  if (skill.classPoint) c.unspentClass = Math.max(0, (c.unspentClass ?? 0) - 1);
  else c.unspentSkills -= 1;
  return true;
}

export function slotSkill(c: Character, id: string, index: 0 | 1 | 2): string | null {
  const skill = skillById(id);
  if (!skill) return "Unknown skill.";
  if (skill.kind === "passive" || skill.kind === "key") return "Passives and keys are always on. They do not use a slot.";
  if (skill.kind === "capstone" && !ACTIVES[id]) return "This capstone is always on. It does not use a slot.";
  if ((c.skillRanks[id] ?? 0) < 1) return "Learn the skill before assigning it.";
  for (let i = 0; i < 3; i++) {
    if (c.slotted[i] === id) c.slotted[i] = null;
  }
  c.slotted[index] = id;
  return null;
}

export function clearSlot(c: Character, index: 0 | 1 | 2): void {
  c.slotted[index] = null;
}

export function classTitle(c: Character): string {
  let bestSpec = "";
  let best = 0;
  for (const spec of Object.keys(SPEC_LABEL)) {
    const points = pointsInSpec(c, spec);
    if (points > best) {
      best = points;
      bestSpec = spec;
    }
  }
  if (bestSpec) return SPEC_LABEL[bestSpec] ?? "Unbound";
  let sector: SectorId | "" = "";
  let sectorPoints = 0;
  for (const id of Object.keys(SECTORS) as SectorId[]) {
    const points = pointsInSector(c, id);
    if (points > sectorPoints) {
      sectorPoints = points;
      sector = id;
    }
  }
  if (sector) return SECTORS[sector].label;
  return "Unbound";
}

export function knownActives(c: Character): SkillNode[] {
  return SKILLS.filter((skill) => {
    if ((c.skillRanks[skill.id] ?? 0) <= 0) return false;
    if (skill.kind === "passive" || skill.kind === "key") return false;
    if (skill.kind === "capstone" && !ACTIVES[skill.id]) return false;
    return true;
  });
}

export function gearCount(c: Character): number {
  return equipped(c).length + c.inventory.length;
}
