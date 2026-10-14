import { DAMAGE_PAIR_LABEL, type DamagePair, type Mods, type RaceId, type SectorId, type SkillKind } from "./types";

export interface SkillNode {
  id: string;
  name: string;
  kind: SkillKind;
  sector: SectorId;
  spec: string | null;
  ring: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  angle: number;
  radius: number;
  maxRank: number;
  levelGate: number;
  requires: string[];
  requiresAny: string[];
  sectorPoints: number;
  specPoints: number;
  hub: boolean;
  /** Legacy flag. Keystones spend keystone points; this stays false on ordinary passives. */
  classPoint: boolean;
  /** Learned on the racial ring. Only the character's own race is shown. */
  racial: boolean;
  race: RaceId | null;
  blurb: string;
}

export interface ActiveSpec {
  kind: "melee" | "arc" | "nova" | "projectile" | "dash" | "buff" | "aura" | "channel";
  energyCost: number;
  cooldown: number;
  scaling: "melee" | "spell";
  mult: number;
  range: number;
  arc: number;
  shots: number;
  radial: boolean;
  stun: number;
  slow: number;
  slowDur: number;
  bleed: number;
  burn: number;
  healFrac: number;
  shieldFrac: number;
  invuln: number;
  dash: number;
  moveBuff: number;
  buffTime: number;
  channelTime: number;
  energyPerSec: number;
  aura: Partial<Mods>;
  color: string;
}

export const SECTORS: Record<
  SectorId,
  { label: string; blurb: string; color: string; angle: number; pair: SectorId }
> = {
  bleed: {
    label: "Bleed",
    blurb: "Steel and opened veins.",
    color: "#c4532a",
    angle: -Math.PI / 2,
    pair: "bleed",
  },
  holy: {
    label: "Holy",
    blurb: "Sacred light and true wards.",
    color: "#e7c39a",
    angle: -Math.PI / 2 + (2 * Math.PI) / 7,
    pair: "holy",
  },
  air: {
    label: "Air",
    blurb: "Gales, speed, and lightning steel.",
    color: "#7ec8e8",
    angle: -Math.PI / 2 + (4 * Math.PI) / 7,
    pair: "air",
  },
  fire: {
    label: "Fire",
    blurb: "Flame and molten stone.",
    color: "#ff6a2a",
    angle: -Math.PI / 2 + (6 * Math.PI) / 7,
    pair: "fire",
  },
  water: {
    label: "Water",
    blurb: "Tides and frost.",
    color: "#6aa8ff",
    angle: -Math.PI / 2 + (8 * Math.PI) / 7,
    pair: "water",
  },
  poison: {
    label: "Poison",
    blurb: "Toxins and venom.",
    color: "#6ecf7a",
    angle: -Math.PI / 2 + (10 * Math.PI) / 7,
    pair: "poison",
  },
  unholy: {
    label: "Unholy",
    blurb: "Blight and shadow chants.",
    color: "#a894e6",
    angle: -Math.PI / 2 + (12 * Math.PI) / 7,
    pair: "unholy",
  },
};

export const SPEC_LABEL: Record<string, string> = {
  bastion: "Bastion",
  ravager: "Ravager",
  cutpurse: "Cutpurse",
  marksman: "Marksman",
  pyre: "Pyre",
  cantor: "Cantor",
  tide: "Tide",
  venom: "Venom",
};

const DEG = Math.PI / 180;

function place(sector: SectorId, offsetDeg: number, radius: number) {
  return { sector, angle: SECTORS[sector].angle + offsetDeg * DEG, radius };
}

function node(
  partial: Pick<SkillNode, "id" | "name" | "kind" | "blurb"> & {
    sector: SectorId;
    offset: number;
    radius: number;
    ring: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    spec?: string | null;
    maxRank?: number;
    requires?: string[];
    requiresAny?: string[];
    sectorPoints?: number;
    specPoints?: number;
    hub?: boolean;
    classPoint?: boolean;
    racial?: boolean;
    race?: RaceId | null;
  },
): SkillNode {
  const spot = place(partial.sector, partial.offset, partial.radius);
  const classPoint = partial.classPoint ?? false;
  return {
    id: partial.id,
    name: partial.name,
    kind: partial.kind,
    sector: partial.sector,
    spec: partial.spec ?? null,
    ring: partial.ring,
    angle: spot.angle,
    radius: spot.radius,
    maxRank:
      partial.kind === "key" || partial.racial
        ? 1
        : (partial.maxRank ?? (partial.kind === "capstone" || classPoint ? 1 : 20)),
    levelGate: 1,
    requires: partial.requires ?? [],
    requiresAny: partial.requiresAny ?? [],
    sectorPoints: partial.sectorPoints ?? 0,
    specPoints: partial.specPoints ?? 0,
    hub: partial.hub ?? false,
    classPoint,
    racial: partial.racial ?? false,
    race: partial.race ?? null,
    blurb: partial.blurb,
  };
}

export const SKILLS: SkillNode[] = [
  // —— Holy (offsets positive = away from bleed) ——
  node({ id: "iron-oath", name: "Iron Oath", kind: "passive", sector: "holy", offset: 0, radius: 0.26, ring: 1, hub: true, blurb: "Swear to the gate. Armor and melee blows thicken." }),
  node({ id: "braced-guard", name: "Braced Guard", kind: "passive", sector: "holy", offset: 8, radius: 0.42, ring: 2, requires: ["iron-oath"], blurb: "Set your stance. Flat armor each rank." }),
  node({ id: "stone-skin", name: "Stone Skin", kind: "passive", sector: "holy", offset: 20, radius: 0.42, ring: 2, requires: ["iron-oath"], blurb: "Hide hardens. More armor and life." }),
  node({ id: "oathbound", name: "Oathbound", kind: "passive", sector: "holy", offset: 12, radius: 0.56, ring: 3, maxRank: 1, requiresAny: ["braced-guard", "stone-skin"], blurb: "Seal of the ward. Armor and melee harden." }),
  node({ id: "bastion", name: "Bastion", kind: "key", sector: "holy", spec: "bastion", offset: 12, radius: 0.72, ring: 4, requires: ["oathbound"], blurb: "Final keystone of walls. Percent armor and melee." }),
  node({ id: "iron-blood", name: "Iron Blood", kind: "passive", sector: "holy", spec: "bastion", offset: 4, radius: 0.86, ring: 5, requires: ["bastion"], blurb: "Life pooled behind the wall." }),
  node({ id: "shield-bash", name: "Shield Bash", kind: "active", sector: "holy", spec: "bastion", offset: 16, radius: 0.86, ring: 5, requires: ["bastion"], blurb: "A short arc that stuns." }),
  node({ id: "bulwark-aura", name: "Bulwark", kind: "aura", sector: "holy", spec: "bastion", offset: 10, radius: 0.86, ring: 5, requires: ["bastion"], blurb: "Hold a warding stance. Drains energy." }),
  node({ id: "aegis", name: "Aegis", kind: "active", sector: "holy", spec: "bastion", offset: 12, radius: 1.0, ring: 6, requiresAny: ["iron-blood", "shield-bash"], blurb: "A shell of life that soaks the next blows." }),
  node({ id: "citadel", name: "Citadel", kind: "capstone", sector: "holy", spec: "bastion", offset: 12, radius: 1.14, ring: 7, maxRank: 1, requires: ["bastion"], blurb: "After the Bastion keystone. Percent armor and blows turned aside." }),

  // —— Bleed (offsets negative = away from holy) ——
  node({ id: "blood-oath", name: "Blood Oath", kind: "passive", sector: "bleed", offset: 0, radius: 0.26, ring: 1, hub: true, blurb: "Swear in steel. Melee blows bite deeper." }),
  node({ id: "heavy-blow", name: "Heavy Blow", kind: "active", sector: "bleed", offset: -8, radius: 0.42, ring: 2, requires: ["blood-oath"], blurb: "A committed strike that staggers." }),
  node({ id: "cleave", name: "Cleave", kind: "active", sector: "bleed", offset: -20, radius: 0.42, ring: 2, requires: ["blood-oath"], blurb: "A wide cut in front of you." }),
  node({ id: "bloodmarked", name: "Bloodmarked", kind: "passive", sector: "bleed", offset: -12, radius: 0.56, ring: 3, maxRank: 1, requiresAny: ["heavy-blow", "cleave"], blurb: "Seal of steel. Melee damage rises." }),
  node({ id: "ravager", name: "Ravager", kind: "key", sector: "bleed", spec: "ravager", offset: -12, radius: 0.72, ring: 4, requires: ["bloodmarked"], blurb: "Final keystone of breaking. Percent melee damage." }),
  node({ id: "wrath-speed", name: "Wrath Pace", kind: "passive", sector: "bleed", spec: "ravager", offset: -4, radius: 0.86, ring: 5, requires: ["ravager"], blurb: "Faster swings." }),
  node({ id: "ruin-strike", name: "Ruin Strike", kind: "active", sector: "bleed", spec: "ravager", offset: -18, radius: 0.86, ring: 5, requires: ["ravager"], blurb: "One heavy blow. Long recovery." }),
  node({ id: "breaker", name: "Breaker", kind: "active", sector: "bleed", spec: "ravager", offset: -12, radius: 1.0, ring: 6, requiresAny: ["wrath-speed", "ruin-strike"], blurb: "A shockwave around you." }),
  node({ id: "sundering", name: "Sundering", kind: "capstone", sector: "bleed", spec: "ravager", offset: -12, radius: 1.14, ring: 7, maxRank: 1, requires: ["ravager"], blurb: "After the Ravager keystone. Percent melee damage." }),

  // —— Air ——
  node({ id: "keen-edge", name: "Keen Edge", kind: "passive", sector: "air", offset: 0, radius: 0.26, ring: 1, hub: true, blurb: "The first cut is the true one. Crit and a lighter step." }),
  node({ id: "fleet-step", name: "Fleet Step", kind: "passive", sector: "air", offset: -14, radius: 0.42, ring: 2, requires: ["keen-edge"], blurb: "Move faster each rank." }),
  node({ id: "lunge", name: "Lunge", kind: "active", sector: "air", offset: 10, radius: 0.42, ring: 2, requires: ["keen-edge"], blurb: "Dash and strike along your facing." }),
  node({ id: "windmark", name: "Windmark", kind: "passive", sector: "air", offset: 0, radius: 0.56, ring: 3, maxRank: 1, requiresAny: ["fleet-step", "lunge"], blurb: "Seal of the gale. Projectile and thrown damage." }),
  node({ id: "marksman", name: "Marksman", kind: "key", sector: "air", spec: "marksman", offset: 0, radius: 0.72, ring: 4, requires: ["windmark"], blurb: "Final keystone of thrown and shot weapons." }),
  node({ id: "knife-fan", name: "Knife Fan", kind: "active", sector: "air", offset: -14, radius: 0.86, ring: 5, requires: ["marksman"], blurb: "Three knives in a spread." }),
  node({ id: "slip", name: "Slip", kind: "active", sector: "air", offset: 14, radius: 0.86, ring: 5, requires: ["marksman"], blurb: "A brief step out of harm and a burst of speed." }),
  node({ id: "keen-eye", name: "Keen Eye", kind: "passive", sector: "air", spec: "marksman", offset: -6, radius: 0.86, ring: 5, requires: ["marksman"], blurb: "Attack rating, so fewer swings miss." }),
  node({ id: "piercing-throw", name: "Piercing Throw", kind: "active", sector: "air", spec: "marksman", offset: 6, radius: 0.86, ring: 5, requires: ["marksman"], blurb: "A hard thrown blade." }),
  node({ id: "ash-rain", name: "Ash Rain", kind: "active", sector: "air", spec: "marksman", offset: 0, radius: 1.0, ring: 6, requiresAny: ["keen-eye", "piercing-throw"], blurb: "Blades outward in a ring." }),
  node({ id: "deadeye", name: "Deadeye", kind: "capstone", sector: "air", spec: "marksman", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["marksman"], blurb: "After the Marksman keystone. Percent projectile damage and crit." }),

  // —— Poison ——
  node({ id: "open-vein", name: "Open Vein", kind: "passive", sector: "poison", offset: 0, radius: 0.26, ring: 1, hub: true, blurb: "Hits can bleed and poison the wound." }),
  node({ id: "toxin-coat", name: "Toxin Coat", kind: "passive", sector: "poison", offset: -10, radius: 0.42, ring: 2, requires: ["open-vein"], blurb: "Bleeds land more readily." }),
  node({ id: "venomark", name: "Venomark", kind: "passive", sector: "poison", offset: 0, radius: 0.56, ring: 3, maxRank: 1, requires: ["toxin-coat"], blurb: "Seal of venom. Bleed chance and melee bite." }),
  node({ id: "cutpurse", name: "Cutpurse", kind: "key", sector: "poison", spec: "cutpurse", offset: 0, radius: 0.72, ring: 4, requires: ["venomark"], blurb: "Final keystone of bleeding targets." }),
  node({ id: "deep-cut", name: "Deep Cut", kind: "passive", sector: "poison", spec: "cutpurse", offset: -12, radius: 0.86, ring: 5, requires: ["cutpurse"], blurb: "Bleeds land more often." }),
  node({ id: "tendon-cut", name: "Tendon Cut", kind: "active", sector: "poison", spec: "cutpurse", offset: 12, radius: 0.86, ring: 5, requires: ["cutpurse"], blurb: "A cut that slows." }),
  node({ id: "veiled-strike", name: "Veiled Strike", kind: "active", sector: "poison", spec: "cutpurse", offset: 0, radius: 1.0, ring: 6, requiresAny: ["deep-cut", "tendon-cut"], blurb: "Dash through them. Far more likely to critical." }),
  node({ id: "hemorrhage", name: "Hemorrhage", kind: "capstone", sector: "poison", spec: "cutpurse", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["cutpurse"], blurb: "After the Cutpurse keystone. Percent bleed chance and melee." }),

  // —— Fire ——
  node({ id: "ember-flow", name: "Ember Flow", kind: "passive", sector: "fire", offset: 0, radius: 0.26, ring: 1, hub: true, blurb: "A coal under the ash. Energy returns faster." }),
  node({ id: "kindling", name: "Kindling", kind: "passive", sector: "fire", offset: -10, radius: 0.42, ring: 2, requires: ["ember-flow"], blurb: "Spells burn hotter." }),
  node({ id: "ashmark", name: "Ashmark", kind: "passive", sector: "fire", offset: 0, radius: 0.56, ring: 3, maxRank: 1, requires: ["kindling"], blurb: "Seal of flame. Percent spell damage." }),
  node({ id: "pyre", name: "Pyre", kind: "key", sector: "fire", spec: "pyre", offset: 0, radius: 0.72, ring: 4, requires: ["ashmark"], blurb: "Final keystone of fire. Percent spell damage." }),
  node({ id: "cinder-lance", name: "Cinder Lance", kind: "active", sector: "fire", spec: "pyre", offset: -10, radius: 0.86, ring: 5, requires: ["pyre"], blurb: "A burning lance." }),
  node({ id: "ash-plume", name: "Ash Plume", kind: "passive", sector: "fire", spec: "pyre", offset: 12, radius: 0.86, ring: 5, requires: ["pyre"], blurb: "Spell power from the rising ash." }),
  node({ id: "conflagration", name: "Conflagration", kind: "active", sector: "fire", spec: "pyre", offset: 0, radius: 1.0, ring: 6, requiresAny: ["cinder-lance", "ash-plume"], blurb: "Fire in every direction." }),
  node({ id: "inferno", name: "Inferno", kind: "capstone", sector: "fire", spec: "pyre", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["pyre"], blurb: "After the Pyre keystone. Percent spell damage." }),

  // —— Water ——
  node({ id: "reservoir", name: "Reservoir", kind: "passive", sector: "water", offset: 0, radius: 0.26, ring: 1, hub: true, blurb: "A deep well of energy." }),
  node({ id: "spark", name: "Spark", kind: "active", sector: "water", offset: -8, radius: 0.42, ring: 2, requires: ["reservoir"], blurb: "A fast bolt of cold light." }),
  node({ id: "mend", name: "Mend", kind: "channel", sector: "water", offset: 12, radius: 0.42, ring: 2, requires: ["reservoir"], blurb: "Channel to knit wounds. Stun or knockback breaks it." }),
  node({ id: "tidemark", name: "Tidemark", kind: "passive", sector: "water", offset: 0, radius: 0.56, ring: 3, maxRank: 1, requiresAny: ["spark", "mend"], blurb: "Seal of the tide. Percent spell damage." }),
  node({ id: "tide", name: "Tide", kind: "key", sector: "water", spec: "tide", offset: 0, radius: 0.72, ring: 4, requires: ["tidemark"], blurb: "Final keystone of tides. Percent frost spell damage." }),
  node({ id: "frost-ring", name: "Rime Ring", kind: "active", sector: "water", offset: -12, radius: 0.86, ring: 5, requires: ["tide"], blurb: "A cold ring that slows." }),
  node({ id: "undertow", name: "Undertow", kind: "passive", sector: "water", spec: "tide", offset: -4, radius: 0.86, ring: 5, requires: ["tide"], blurb: "Slows linger; energy wells deeper." }),
  node({ id: "glacier-bolt", name: "Glacier Bolt", kind: "active", sector: "water", spec: "tide", offset: 12, radius: 0.86, ring: 5, requires: ["tide"], blurb: "A heavy frost bolt." }),
  node({ id: "maelstrom", name: "Maelstrom", kind: "active", sector: "water", spec: "tide", offset: 0, radius: 1.0, ring: 6, requiresAny: ["undertow", "glacier-bolt"], blurb: "A spinning ring of ice and tide." }),
  node({ id: "deluge", name: "Deluge", kind: "capstone", sector: "water", spec: "tide", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["tide"], blurb: "After the Tide keystone. Percent spell damage." }),

  // —— Unholy ——
  node({ id: "first-rite", name: "First Rite", kind: "passive", sector: "unholy", offset: 0, radius: 0.26, ring: 1, hub: true, blurb: "The opening verse. Spell power and energy." }),
  node({ id: "vespers", name: "Vespers", kind: "passive", sector: "unholy", offset: 0, radius: 0.42, ring: 2, requires: ["first-rite"], blurb: "A quiet verse. Spell power each rank." }),
  node({ id: "darkmark", name: "Darkmark", kind: "passive", sector: "unholy", offset: 0, radius: 0.56, ring: 3, maxRank: 1, requires: ["vespers"], blurb: "Seal of the chant. Percent spell damage." }),
  node({ id: "cantor", name: "Cantor", kind: "key", sector: "unholy", spec: "cantor", offset: 0, radius: 0.72, ring: 4, requires: ["darkmark"], blurb: "Final keystone of chants. Percent spell damage." }),
  node({ id: "breath", name: "Breath", kind: "passive", sector: "unholy", spec: "cantor", offset: -12, radius: 0.86, ring: 5, requires: ["cantor"], blurb: "A steadier return of energy." }),
  node({ id: "ward-chant", name: "Ward Chant", kind: "aura", sector: "unholy", spec: "cantor", offset: 12, radius: 0.86, ring: 5, requires: ["cantor"], blurb: "A sung ward. Drains energy while it holds." }),
  node({ id: "litany", name: "Litany", kind: "channel", sector: "unholy", spec: "cantor", offset: 0, radius: 1.0, ring: 6, requiresAny: ["breath", "ward-chant"], blurb: "Channel life and energy. Stun or knockback breaks it." }),
  node({ id: "benediction", name: "Benediction", kind: "capstone", sector: "unholy", spec: "cantor", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["cantor"], blurb: "After the Cantor keystone. Percent spell damage and recovery." }),
];

let byId = new Map(SKILLS.map((skill) => [skill.id, skill]));

export function skillById(id: string): SkillNode | undefined {
  return byId.get(id);
}

export const PASSIVE_PER_RANK: Record<string, Partial<Mods>> = {
  // Multi-rank nodes stay near 1% per rank so rank 20 is about +20%, not a flat pile.
  "iron-oath": { armorPct: 0.01, meleeMult: 0.008 },
  "braced-guard": { armorPct: 0.012 },
  "stone-skin": { armorPct: 0.01, lifePct: 0.01 },
  oathbound: { armorPct: 0.06, meleeMult: 0.04 },
  bastion: { armorPct: 0.08, meleeMult: 0.04 },
  "iron-blood": { lifePct: 0.012 },
  citadel: { armorPct: 0.12, damageReduction: 0.08 },
  "blood-oath": { meleeMult: 0.01, crit: 0.002 },
  bloodmarked: { meleeMult: 0.06 },
  ravager: { meleeMult: 0.08 },
  "wrath-speed": { attackSpeed: 0.01 },
  sundering: { meleeMult: 0.12 },
  "keen-edge": { crit: 0.004, moveSpeed: 0.004 },
  "fleet-step": { moveSpeed: 0.01 },
  windmark: { projectileMult: 0.06 },
  marksman: { projectileMult: 0.08 },
  "keen-eye": { attackRatingPct: 0.012 },
  deadeye: { projectileMult: 0.12, crit: 0.05 },
  "open-vein": { bleedChance: 0.012 },
  "toxin-coat": { bleedChance: 0.01 },
  venomark: { bleedChance: 0.06, meleeMult: 0.04 },
  cutpurse: { bleedChance: 0.06, meleeMult: 0.04 },
  "deep-cut": { bleedChance: 0.01 },
  hemorrhage: { bleedChance: 0.1, meleeMult: 0.08 },
  "ember-flow": { spellMult: 0.01 },
  kindling: { spellMult: 0.012 },
  ashmark: { spellMult: 0.06 },
  pyre: { spellMult: 0.08 },
  "ash-plume": { spellMult: 0.012 },
  inferno: { spellMult: 0.12 },
  reservoir: { lifePct: 0.01, chargeMax: 0.025 },
  tidemark: { spellMult: 0.06 },
  tide: { spellMult: 0.08 },
  undertow: { lifePct: 0.008, spellMult: 0.01 },
  deluge: { spellMult: 0.12 },
  "first-rite": { spellMult: 0.01 },
  vespers: { spellMult: 0.012 },
  darkmark: { spellMult: 0.06 },
  cantor: { spellMult: 0.08 },
  breath: { lifeRegenPct: 0.012, spellMult: 0.01 },
  benediction: { spellMult: 0.12, lifeRegenPct: 0.08 },
  "race-human-stock": { goldFind: 0.06, magicFind: 0.06 },
  "race-human-road": { moveSpeed: 0.05, meleeMult: 0.04 },
  "race-human-key": { goldFind: 0.05, magicFind: 0.05 },
  "race-human-fortune": { goldFind: 0.05, magicFind: 0.05 },
  "race-human-hands": { meleeMult: 0.05, crit: 0.02 },
  "race-elf-wind": { moveSpeed: 0.04 },
  "race-elf-step": { evasion: 0.06, moveSpeed: 0.04 },
  "race-elf-key": { projectileMult: 0.06, moveSpeed: 0.03 },
  "race-elf-light": { evasion: 0.05 },
  "race-elf-eye": { crit: 0.03, projectileMult: 0.05 },
  "race-dwarf-hide": { armorPct: 0.08, moveSpeed: -0.04 },
  "race-dwarf-root": { armorPct: 0.06 },
  "race-dwarf-key": { armorPct: 0.06, lifePct: 0.04 },
  "race-dwarf-deep": { lifePct: 0.06 },
  "race-dwarf-mark": { meleeMult: 0.05 },
  "race-gnome-mind": { energyRegenPct: 0.08, spellMult: 0.04 },
  "race-gnome-spark": { spellMult: 0.05 },
  "race-gnome-key": { energyRegenPct: 0.06, cdr: 0.04 },
  "race-gnome-deep": { cdr: 0.04 },
  "race-gnome-mark": { crit: 0.02 },
  "race-hobbit-foot": { evasion: 0.04, crit: 0.02 },
  "race-hobbit-step": { evasion: 0.05 },
  "race-hobbit-key": { crit: 0.04, goldFind: 0.04 },
  "race-hobbit-deep": { lifePct: 0.05 },
  "race-hobbit-mark": { moveSpeed: 0.05 },
  "race-insectoid-chitin": { armorPct: 0.08, gearArmorPct: -0.85 },
  "race-insectoid-plate": { armorPct: 0.05 },
  "race-insectoid-key": { meleeMult: 0.06 },
  "race-insectoid-deep": { attackSpeed: 0.05 },
  "race-insectoid-mark": { crit: 0.02 },
  "race-minotaur-gore": { lifePct: 0.08, meleeMult: 0.04 },
  "race-minotaur-bulk": { meleeMult: 0.06 },
  "race-minotaur-key": { meleeMult: 0.06, lifePct: 0.04 },
  "race-minotaur-deep": { armorPct: 0.05 },
  "race-minotaur-mark": { attackSpeed: 0.04 },
  "race-golem-stone": { lifePct: 0.08, armorPct: 0.1, cdr: -0.12 },
  "race-golem-plate": { armorPct: 0.06 },
  "race-golem-key": { damageReduction: 0.06, armorPct: 0.06 },
  "race-golem-deep": { lifePct: 0.06 },
  "race-golem-mark": { meleeMult: 0.04 },
  "race-lizard-blood": { lifeRegenPct: 0.1, armorPct: 0.06 },
  "race-lizard-scale": { lifeRegenPct: 0.1 },
  "race-lizard-key": { lifePct: 0.05, lifeRegenPct: 0.06 },
  "race-lizard-deep": { armorPct: 0.05 },
  "race-lizard-mark": { meleeMult: 0.05 },
  "race-undead-hunger": { lifeSteal: 0.04, lifeRegenPct: -0.3 },
  "race-undead-siphon": { lifeSteal: 0.04 },
  "race-undead-key": { meleeMult: 0.05, lifeSteal: 0.03 },
  "race-undead-deep": { spellMult: 0.05 },
  "race-undead-mark": { crit: 0.02 },
};

/** Per-rank damage-taken delta (negative resists, positive is a weakness). Rank multiplies it. */
export const TAKEN_PER_RANK: Record<string, Partial<Record<DamagePair, number>>> = {
  "race-elf-wind": { air: -0.1, bleed: 0.1 },
  "race-dwarf-hide": { poison: -0.15, fire: -0.08 },
  "race-gnome-mind": { bleed: 0.08, air: -0.08 },
  "race-hobbit-foot": { poison: -0.08 },
  "race-insectoid-chitin": { poison: -0.15, bleed: -0.1, fire: 0.12 },
  "race-minotaur-gore": { bleed: -0.08, air: 0.1 },
  "race-golem-stone": { bleed: -0.15, poison: -0.15, water: 0.12 },
  "race-lizard-blood": { poison: -0.1, water: 0.1 },
  "race-undead-hunger": { unholy: -0.18, holy: 0.18, bleed: -0.12, poison: -0.12 },
};

export function skillTakenMul(ranks: Record<string, number>, pair: DamagePair): number {
  let mul = 1;
  for (const [id, rank] of Object.entries(ranks)) {
    if (rank <= 0) continue;
    const delta = TAKEN_PER_RANK[id]?.[pair];
    if (delta) mul += delta * rank;
  }
  if (!Number.isFinite(mul)) return 1;
  return Math.min(1.75, Math.max(0.35, mul));
}

/** Target (mult × shots / cooldown) for damaging actives at rank 1, before CDR. */
export const SKILL_DPS_TARGET = 0.5;

function act(partial: Partial<ActiveSpec> & Pick<ActiveSpec, "kind" | "color">): ActiveSpec {
  return {
    energyCost: 0,
    cooldown: 4,
    scaling: "melee",
    mult: 1,
    range: 80,
    arc: Math.PI * 0.7,
    shots: 1,
    radial: false,
    stun: 0,
    slow: 0,
    slowDur: 0,
    bleed: 0,
    burn: 0,
    healFrac: 0,
    shieldFrac: 0,
    invuln: 0,
    dash: 0,
    moveBuff: 0,
    buffTime: 0,
    channelTime: 0,
    energyPerSec: 0,
    aura: {},
    ...partial,
  };
}

/** Rank-1 damage multiplier so (mult × shots / cooldown) ≈ SKILL_DPS_TARGET. */
function dpsMult(cooldown: number, shots = 1): number {
  return Math.round((SKILL_DPS_TARGET * cooldown) / Math.max(1, shots) * 100) / 100;
}

export const ACTIVES: Record<string, ActiveSpec> = {
  "heavy-blow": act({ kind: "melee", color: "#e08a4f", energyCost: 4, cooldown: 3.1, mult: dpsMult(3.1), range: 82, stun: 0.4 }),
  cleave: act({ kind: "arc", color: "#e08a4f", energyCost: 8, cooldown: 4.2, mult: dpsMult(4.2), range: 96 }),
  "bulwark-aura": act({
    kind: "aura",
    color: "#e08a4f",
    energyPerSec: 2,
    aura: { armorPct: 0.08, damageReduction: 0.08 },
  }),
  "shield-bash": act({ kind: "arc", color: "#e7c39a", energyCost: 8, cooldown: 5, mult: dpsMult(5), range: 88, stun: 0.75 }),
  aegis: act({ kind: "buff", color: "#f0e2cf", energyCost: 16, cooldown: 14, shieldFrac: 0.3, buffTime: 6 }),
  "ruin-strike": act({ kind: "melee", color: "#c4532a", energyCost: 10, cooldown: 6, mult: dpsMult(6), range: 84 }),
  breaker: act({ kind: "nova", color: "#e08a4f", energyCost: 18, cooldown: 12, mult: dpsMult(12), range: 150, stun: 0.3 }),
  lunge: act({ kind: "dash", color: "#3ecfb0", energyCost: 6, cooldown: 3.6, mult: dpsMult(3.6), dash: 128, range: 70 }),
  "knife-fan": act({
    kind: "projectile",
    color: "#d7fff4",
    energyCost: 8,
    cooldown: 4,
    scaling: "melee",
    mult: dpsMult(4, 3),
    shots: 3,
    range: 340,
  }),
  slip: act({ kind: "buff", color: "#9ff3e0", energyCost: 8, cooldown: 7, invuln: 0.45, moveBuff: 0.35, buffTime: 1.15 }),
  "tendon-cut": act({
    kind: "melee",
    color: "#3ecfb0",
    energyCost: 6,
    cooldown: 4,
    mult: dpsMult(4),
    range: 78,
    slow: 0.45,
    slowDur: 2.2,
  }),
  "veiled-strike": act({
    kind: "dash",
    color: "#effffb",
    energyCost: 12,
    cooldown: 8,
    mult: dpsMult(8),
    dash: 150,
    range: 74,
    bleed: 1,
  }),
  "piercing-throw": act({
    kind: "projectile",
    color: "#b8fff0",
    energyCost: 7,
    cooldown: 3.2,
    scaling: "melee",
    mult: dpsMult(3.2),
    shots: 1,
    range: 420,
  }),
  "ash-rain": act({
    kind: "projectile",
    color: "#e7fff8",
    energyCost: 16,
    cooldown: 10,
    scaling: "melee",
    mult: dpsMult(10, 6),
    shots: 6,
    radial: true,
    range: 300,
  }),
  spark: act({ kind: "projectile", color: "#d8ccff", energyCost: 5, cooldown: 1.55, scaling: "spell", mult: dpsMult(1.55), shots: 1, range: 380 }),
  "frost-ring": act({
    kind: "nova",
    color: "#b9d4ff",
    energyCost: 12,
    cooldown: 6,
    scaling: "spell",
    mult: dpsMult(6),
    range: 192,
    slow: 0.4,
    slowDur: 2.4,
  }),
  mend: act({ kind: "channel", color: "#d2ffe8", energyCost: 8, cooldown: 8, channelTime: 2.1, healFrac: 0.22 }),
  "cinder-lance": act({
    kind: "projectile",
    color: "#ffb077",
    energyCost: 10,
    cooldown: 3.4,
    scaling: "spell",
    mult: dpsMult(3.4),
    shots: 1,
    range: 400,
    burn: 4,
  }),
  conflagration: act({
    kind: "nova",
    color: "#ff8a3d",
    energyCost: 20,
    cooldown: 11,
    scaling: "spell",
    mult: dpsMult(11),
    range: 156,
    burn: 5,
  }),
  "ward-chant": act({
    kind: "aura",
    color: "#c3b6ff",
    energyPerSec: 2.2,
    aura: { damageReduction: 0.08, armorPct: 0.06 },
  }),
  litany: act({ kind: "channel", color: "#f3e9ff", energyCost: 0, cooldown: 12, channelTime: 2.4, healFrac: 0.16 }),
  "glacier-bolt": act({
    kind: "projectile",
    color: "#b9d4ff",
    energyCost: 9,
    cooldown: 3.2,
    scaling: "spell",
    mult: dpsMult(3.2),
    shots: 1,
    range: 400,
    slow: 0.35,
    slowDur: 2,
  }),
  maelstrom: act({
    kind: "nova",
    color: "#8ec8ff",
    energyCost: 18,
    cooldown: 11,
    scaling: "spell",
    mult: dpsMult(11),
    range: 170,
    slow: 0.4,
    slowDur: 2.2,
  }),
  "race-human-skill": act({ kind: "melee", color: "#e7c39a", energyCost: 8, cooldown: 4, mult: dpsMult(4), range: 84, stun: 0.3 }),
  "race-elf-skill": act({ kind: "projectile", color: "#7ec8e8", energyCost: 8, cooldown: 3.6, scaling: "spell", mult: dpsMult(3.6), range: 360 }),
  "race-dwarf-skill": act({ kind: "melee", color: "#c4532a", energyCost: 8, cooldown: 4.4, mult: dpsMult(4.4), range: 80, stun: 0.45 }),
  "race-gnome-skill": act({ kind: "projectile", color: "#6ecf7a", energyCost: 8, cooldown: 3.4, scaling: "spell", mult: dpsMult(3.4), range: 340 }),
  "race-hobbit-skill": act({ kind: "projectile", color: "#e7c39a", energyCost: 6, cooldown: 3.2, mult: dpsMult(3.2), range: 280 }),
  "race-insectoid-skill": act({ kind: "melee", color: "#6ecf7a", energyCost: 8, cooldown: 3.8, mult: dpsMult(3.8, 2), shots: 2, range: 78 }),
  "race-minotaur-skill": act({ kind: "dash", color: "#c4532a", energyCost: 10, cooldown: 5, mult: dpsMult(5), range: 110, dash: 90, stun: 0.35 }),
  "race-golem-skill": act({ kind: "nova", color: "#e7c39a", energyCost: 12, cooldown: 6, mult: dpsMult(6), range: 120, stun: 0.3 }),
  "race-lizard-skill": act({ kind: "melee", color: "#6aa8ff", energyCost: 8, cooldown: 3.6, mult: dpsMult(3.6), range: 88 }),
  "race-undead-skill": act({ kind: "melee", color: "#a894e6", energyCost: 8, cooldown: 4, mult: dpsMult(4), range: 82 }),
};

function racialNode(
  partial: Parameters<typeof node>[0] & { race: RaceId },
): SkillNode {
  return node({ ...partial, racial: true, race: partial.race });
}

/**
 * One racial wheel per race.
 * Ring 1 is open. Its keystone opens ring 5. The race skill sits after that keystone.
 */
export const RACIAL_SKILLS: SkillNode[] = [
  racialNode({ id: "race-human-stock", name: "Common Stock", kind: "passive", sector: "holy", race: "human", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Common blood notices coin and curios." }),
  racialNode({ id: "race-human-road", name: "Open Road", kind: "passive", sector: "holy", race: "human", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "A steady stride and a plain strike." }),
  racialNode({ id: "race-human-key", name: "Adaptability", kind: "key", sector: "holy", race: "human", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-human-stock", "race-human-road"], blurb: "Keystone of humankind. Fortune thickens." }),
  racialNode({ id: "race-human-fortune", name: "Fortune", kind: "passive", sector: "holy", race: "human", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-human-key"], blurb: "The next ring. More coin, more curios." }),
  racialNode({ id: "race-human-hands", name: "Steady Hands", kind: "passive", sector: "holy", race: "human", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-human-key"], blurb: "The next ring. Blows land a little truer." }),
  racialNode({ id: "race-human-skill", name: "Jack Trade", kind: "active", sector: "holy", race: "human", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-human-key"], blurb: "After Adaptability. A practical strike that staggers." }),

  racialNode({ id: "race-elf-wind", name: "Windkin", kind: "passive", sector: "air", race: "elf", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Light step and a kinship with air. Steel bites a slight frame." }),
  racialNode({ id: "race-elf-step", name: "Light Step", kind: "passive", sector: "air", race: "elf", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "Harder to pin, quicker on the road." }),
  racialNode({ id: "race-elf-key", name: "Gale Oath", kind: "key", sector: "air", race: "elf", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-elf-wind", "race-elf-step"], blurb: "Keystone of the windkin. Shots and stride sharpen." }),
  racialNode({ id: "race-elf-light", name: "Unpinned", kind: "passive", sector: "air", race: "elf", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-elf-key"], blurb: "The next ring. Blows slide off a turning body." }),
  racialNode({ id: "race-elf-eye", name: "Far Eye", kind: "passive", sector: "air", race: "elf", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-elf-key"], blurb: "The next ring. Thrown and shot steel bites." }),
  racialNode({ id: "race-elf-skill", name: "Wind Cut", kind: "active", sector: "air", race: "elf", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-elf-key"], blurb: "After Gale Oath. A cutting gust." }),

  racialNode({ id: "race-dwarf-hide", name: "Stone Resilience", kind: "passive", sector: "fire", race: "dwarf", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Dwarven hide shrugs poison and heat. Short legs slow the chase." }),
  racialNode({ id: "race-dwarf-root", name: "Deep Root", kind: "passive", sector: "fire", race: "dwarf", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "Another layer of stone under the skin." }),
  racialNode({ id: "race-dwarf-key", name: "Mountain Oath", kind: "key", sector: "fire", race: "dwarf", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-dwarf-hide", "race-dwarf-root"], blurb: "Keystone of the mountain. Life and armor thicken." }),
  racialNode({ id: "race-dwarf-deep", name: "Kiln Blood", kind: "passive", sector: "fire", race: "dwarf", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-dwarf-key"], blurb: "The next ring. More life behind the beard." }),
  racialNode({ id: "race-dwarf-mark", name: "Forge Blow", kind: "passive", sector: "fire", race: "dwarf", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-dwarf-key"], blurb: "The next ring. Hammers hit harder." }),
  racialNode({ id: "race-dwarf-skill", name: "Shield Ram", kind: "active", sector: "fire", race: "dwarf", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-dwarf-key"], blurb: "After Mountain Oath. A short ram that stuns." }),

  racialNode({ id: "race-gnome-mind", name: "Tinker Mind", kind: "passive", sector: "air", race: "gnome", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Quick wit feeds the ward-spark. Soft bodies fear open steel." }),
  racialNode({ id: "race-gnome-spark", name: "Bright Spark", kind: "passive", sector: "air", race: "gnome", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "Spells tick a little hotter." }),
  racialNode({ id: "race-gnome-key", name: "Clockwork Oath", kind: "key", sector: "air", race: "gnome", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-gnome-mind", "race-gnome-spark"], blurb: "Keystone of the tinker. Energy returns and skills wake faster." }),
  racialNode({ id: "race-gnome-deep", name: "Fine Gears", kind: "passive", sector: "air", race: "gnome", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-gnome-key"], blurb: "The next ring. Skills recharge a little faster." }),
  racialNode({ id: "race-gnome-mark", name: "Lucky Nut", kind: "passive", sector: "air", race: "gnome", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-gnome-key"], blurb: "The next ring. A better chance to critical." }),
  racialNode({ id: "race-gnome-skill", name: "Gadget Bolt", kind: "active", sector: "air", race: "gnome", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-gnome-key"], blurb: "After Clockwork Oath. A sprung bolt of ward-light." }),

  racialNode({ id: "race-hobbit-foot", name: "Lucky Footing", kind: "passive", sector: "poison", race: "hobbit", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Hard to pin down, harder to poison." }),
  racialNode({ id: "race-hobbit-step", name: "Quiet Feet", kind: "passive", sector: "poison", race: "hobbit", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "Another step out of the way." }),
  racialNode({ id: "race-hobbit-key", name: "Hearth Luck", kind: "key", sector: "poison", race: "hobbit", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-hobbit-foot", "race-hobbit-step"], blurb: "Keystone of the hearth. Crits and coin." }),
  racialNode({ id: "race-hobbit-deep", name: "Second Breakfast", kind: "passive", sector: "poison", race: "hobbit", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-hobbit-key"], blurb: "The next ring. A fuller life." }),
  racialNode({ id: "race-hobbit-mark", name: "Garden Path", kind: "passive", sector: "poison", race: "hobbit", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-hobbit-key"], blurb: "The next ring. A quicker walk home." }),
  racialNode({ id: "race-hobbit-skill", name: "Sling Stone", kind: "active", sector: "poison", race: "hobbit", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-hobbit-key"], blurb: "After Hearth Luck. A stone from the pocket." }),

  racialNode({ id: "race-insectoid-chitin", name: "Chitin", kind: "passive", sector: "poison", race: "insectoid", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "The shell shrugs venom and cuts. Flame cracks it, and gear plates barely thicken it." }),
  racialNode({ id: "race-insectoid-plate", name: "Layered Shell", kind: "passive", sector: "poison", race: "insectoid", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "Another grown plate." }),
  racialNode({ id: "race-insectoid-key", name: "Hive Oath", kind: "key", sector: "poison", race: "insectoid", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-insectoid-chitin", "race-insectoid-plate"], blurb: "Keystone of the hive. Mandibles hit harder." }),
  racialNode({ id: "race-insectoid-deep", name: "Skitter", kind: "passive", sector: "poison", race: "insectoid", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-insectoid-key"], blurb: "The next ring. Arms cycle faster." }),
  racialNode({ id: "race-insectoid-mark", name: "Joint Bite", kind: "passive", sector: "poison", race: "insectoid", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-insectoid-key"], blurb: "The next ring. A sharper chance to critical." }),
  racialNode({ id: "race-insectoid-skill", name: "Mandible Flurry", kind: "active", sector: "poison", race: "insectoid", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-insectoid-key"], blurb: "After Hive Oath. Two bites in one motion." }),

  racialNode({ id: "race-minotaur-gore", name: "Bull Hide", kind: "passive", sector: "bleed", race: "minotaur", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Thick life and a harder gore. Slow to turn into the wind." }),
  racialNode({ id: "race-minotaur-bulk", name: "Heavy Shoulder", kind: "passive", sector: "bleed", race: "minotaur", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "More weight behind each blow." }),
  racialNode({ id: "race-minotaur-key", name: "Labyrinth Oath", kind: "key", sector: "bleed", race: "minotaur", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-minotaur-gore", "race-minotaur-bulk"], blurb: "Keystone of the maze. Life and melee swell." }),
  racialNode({ id: "race-minotaur-deep", name: "Horn Plate", kind: "passive", sector: "bleed", race: "minotaur", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-minotaur-key"], blurb: "The next ring. Hide thickens." }),
  racialNode({ id: "race-minotaur-mark", name: "Charge Pace", kind: "passive", sector: "bleed", race: "minotaur", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-minotaur-key"], blurb: "The next ring. The charge comes sooner." }),
  racialNode({ id: "race-minotaur-skill", name: "Gore", kind: "active", sector: "bleed", race: "minotaur", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-minotaur-key"], blurb: "After Labyrinth Oath. A rushing horn." }),

  racialNode({ id: "race-golem-stone", name: "Living Stone", kind: "passive", sector: "holy", race: "golem", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Sturdier life and armor. Skills wake slowly in clay. Cuts and venom slide off; water unbinds the seal." }),
  racialNode({ id: "race-golem-plate", name: "Ward Clay", kind: "passive", sector: "holy", race: "golem", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "Another fired layer." }),
  racialNode({ id: "race-golem-key", name: "Seal Oath", kind: "key", sector: "holy", race: "golem", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-golem-stone", "race-golem-plate"], blurb: "Keystone of the seal. Blows turn aside and armor holds." }),
  racialNode({ id: "race-golem-deep", name: "Core Life", kind: "passive", sector: "holy", race: "golem", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-golem-key"], blurb: "The next ring. The core holds more life." }),
  racialNode({ id: "race-golem-mark", name: "Stone Fist", kind: "passive", sector: "holy", race: "golem", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-golem-key"], blurb: "The next ring. Fists hit harder." }),
  racialNode({ id: "race-golem-skill", name: "Quake", kind: "active", sector: "holy", race: "golem", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-golem-key"], blurb: "After Seal Oath. The ground jumps." }),

  racialNode({ id: "race-lizard-blood", name: "Cold Blood", kind: "passive", sector: "water", race: "lizard", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Life knits faster and scales turn venom. Frost and tide bite the cold-blooded." }),
  racialNode({ id: "race-lizard-scale", name: "Shed Scale", kind: "passive", sector: "water", race: "lizard", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "Regeneration climbs a little further." }),
  racialNode({ id: "race-lizard-key", name: "Swamp Oath", kind: "key", sector: "water", race: "lizard", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-lizard-blood", "race-lizard-scale"], blurb: "Keystone of the swamp. Life and mending deepen." }),
  racialNode({ id: "race-lizard-deep", name: "Ridge Scale", kind: "passive", sector: "water", race: "lizard", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-lizard-key"], blurb: "The next ring. Ridges thicken." }),
  racialNode({ id: "race-lizard-mark", name: "Tail Weight", kind: "passive", sector: "water", race: "lizard", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-lizard-key"], blurb: "The next ring. The tail adds to the blow." }),
  racialNode({ id: "race-lizard-skill", name: "Tail Lash", kind: "active", sector: "water", race: "lizard", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-lizard-key"], blurb: "After Swamp Oath. The tail comes around." }),

  racialNode({ id: "race-undead-hunger", name: "Grave Hunger", kind: "passive", sector: "unholy", race: "undead", offset: -14, radius: 0.26, ring: 1, maxRank: 1, blurb: "Siphon life from blows. Dark slides off dead flesh. Sacred light bites, and mending is slow." }),
  racialNode({ id: "race-undead-siphon", name: "Deeper Hunger", kind: "passive", sector: "unholy", race: "undead", offset: 14, radius: 0.42, ring: 1, maxRank: 1, blurb: "A little more life from each wound you open." }),
  racialNode({ id: "race-undead-key", name: "Barrow Oath", kind: "key", sector: "unholy", race: "undead", offset: 0, radius: 0.72, ring: 4, maxRank: 1, requires: ["race-undead-hunger", "race-undead-siphon"], blurb: "Keystone of the barrow. Blows and the siphon both deepen." }),
  racialNode({ id: "race-undead-deep", name: "Grave Verse", kind: "passive", sector: "unholy", race: "undead", offset: -12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-undead-key"], blurb: "The next ring. Spells draw on the grave." }),
  racialNode({ id: "race-undead-mark", name: "Cold Crit", kind: "passive", sector: "unholy", race: "undead", offset: 12, radius: 0.86, ring: 5, maxRank: 1, requires: ["race-undead-key"], blurb: "The next ring. Dead nerves still find a critical." }),
  racialNode({ id: "race-undead-skill", name: "Grave Bite", kind: "active", sector: "unholy", race: "undead", offset: 0, radius: 1.14, ring: 7, maxRank: 1, requires: ["race-undead-key"], blurb: "After Barrow Oath. A bite that remembers hunger." }),
];

export function allSkillNodes(): SkillNode[] {
  return [...SKILLS, ...RACIAL_SKILLS];
}

export function skillsForRace(race: RaceId | null | undefined): SkillNode[] {
  return [...SKILLS, ...RACIAL_SKILLS.filter((skill) => skill.race === race)];
}

byId = new Map(allSkillNodes().map((skill) => [skill.id, skill]));

/**
 * Earlier tree nodes that feed a small bonus into this skill.
 * Each non-hub skill lists 1–4 feeders that sit earlier on its branch.
 * Per-rank bonuses stay small so investing early nodes still matters late.
 */
export interface SynergyLink {
  from: string;
  /** Extra damage / aura / heal power per feeder rank. */
  powerPerRank?: number;
  /** Cooldown cut per feeder rank (actives). */
  cdrPerRank?: number;
}

export const SKILL_SYNERGIES: Record<string, SynergyLink[]> = {
  // Holy
  "braced-guard": [{ from: "iron-oath", powerPerRank: 0.02 }],
  "stone-skin": [{ from: "iron-oath", powerPerRank: 0.02 }],
  oathbound: [
    { from: "braced-guard", powerPerRank: 0.02 },
    { from: "stone-skin", powerPerRank: 0.02 },
  ],
  bastion: [
    { from: "oathbound", powerPerRank: 0.03 },
    { from: "braced-guard", powerPerRank: 0.015 },
    { from: "stone-skin", powerPerRank: 0.015 },
  ],
  "iron-blood": [
    { from: "bastion", powerPerRank: 0.025 },
    { from: "stone-skin", powerPerRank: 0.02 },
  ],
  "shield-bash": [
    { from: "bastion", powerPerRank: 0.03 },
    { from: "braced-guard", powerPerRank: 0.02 },
  ],
  "bulwark-aura": [
    { from: "bastion", powerPerRank: 0.025 },
    { from: "stone-skin", powerPerRank: 0.02 },
  ],
  aegis: [
    { from: "shield-bash", powerPerRank: 0.025 },
    { from: "iron-blood", powerPerRank: 0.03 },
    { from: "bastion", powerPerRank: 0.02 },
  ],
  citadel: [
    { from: "bastion", powerPerRank: 0.04 },
    { from: "oathbound", powerPerRank: 0.03 },
    { from: "iron-blood", powerPerRank: 0.02 },
  ],

  // Bleed
  "heavy-blow": [{ from: "blood-oath", powerPerRank: 0.035 }],
  cleave: [
    { from: "blood-oath", powerPerRank: 0.03 },
  ],
  bloodmarked: [
    { from: "heavy-blow", powerPerRank: 0.025 },
    { from: "cleave", powerPerRank: 0.025 },
  ],
  ravager: [
    { from: "bloodmarked", powerPerRank: 0.03 },
    { from: "heavy-blow", powerPerRank: 0.02 },
    { from: "cleave", powerPerRank: 0.015 },
  ],
  "wrath-speed": [
    { from: "ravager", powerPerRank: 0.025 },
    { from: "blood-oath", powerPerRank: 0.015 },
  ],
  "ruin-strike": [
    { from: "ravager", powerPerRank: 0.03 },
    { from: "heavy-blow", powerPerRank: 0.025 },
  ],
  breaker: [
    { from: "ruin-strike", powerPerRank: 0.03 },
    { from: "cleave", powerPerRank: 0.025 },
    { from: "wrath-speed", powerPerRank: 0.02 },
  ],
  sundering: [
    { from: "ravager", powerPerRank: 0.04 },
    { from: "bloodmarked", powerPerRank: 0.03 },
    { from: "ruin-strike", powerPerRank: 0.02 },
  ],

  // Air
  "fleet-step": [{ from: "keen-edge", powerPerRank: 0.02 }],
  lunge: [{ from: "keen-edge", powerPerRank: 0.035 }],
  windmark: [
    { from: "fleet-step", powerPerRank: 0.025 },
    { from: "lunge", powerPerRank: 0.025 },
  ],
  marksman: [
    { from: "windmark", powerPerRank: 0.03 },
    { from: "lunge", powerPerRank: 0.02 },
    { from: "keen-edge", powerPerRank: 0.015 },
  ],
  "knife-fan": [
    { from: "marksman", powerPerRank: 0.03 },
    { from: "lunge", powerPerRank: 0.02 },
  ],
  slip: [
    { from: "marksman", powerPerRank: 0.025 },
    { from: "fleet-step", powerPerRank: 0.025 },
  ],
  "keen-eye": [
    { from: "marksman", powerPerRank: 0.025 },
    { from: "keen-edge", powerPerRank: 0.015 },
  ],
  "piercing-throw": [
    { from: "marksman", powerPerRank: 0.03 },
    { from: "knife-fan", powerPerRank: 0.02 },
  ],
  "ash-rain": [
    { from: "piercing-throw", powerPerRank: 0.03 },
    { from: "knife-fan", powerPerRank: 0.025 },
    { from: "marksman", powerPerRank: 0.015 },
  ],
  deadeye: [
    { from: "marksman", powerPerRank: 0.04 },
    { from: "windmark", powerPerRank: 0.03 },
    { from: "piercing-throw", powerPerRank: 0.02 },
  ],

  // Poison
  "toxin-coat": [{ from: "open-vein", powerPerRank: 0.025 }],
  venomark: [
    { from: "toxin-coat", powerPerRank: 0.03 },
    { from: "open-vein", powerPerRank: 0.02 },
  ],
  cutpurse: [
    { from: "venomark", powerPerRank: 0.03 },
    { from: "toxin-coat", powerPerRank: 0.02 },
  ],
  "deep-cut": [
    { from: "cutpurse", powerPerRank: 0.025 },
    { from: "open-vein", powerPerRank: 0.02 },
  ],
  "tendon-cut": [
    { from: "cutpurse", powerPerRank: 0.03 },
    { from: "toxin-coat", powerPerRank: 0.02 },
  ],
  "veiled-strike": [
    { from: "tendon-cut", powerPerRank: 0.03 },
    { from: "deep-cut", powerPerRank: 0.025 },
    { from: "cutpurse", powerPerRank: 0.015 },
  ],
  hemorrhage: [
    { from: "cutpurse", powerPerRank: 0.04 },
    { from: "venomark", powerPerRank: 0.03 },
    { from: "deep-cut", powerPerRank: 0.02 },
  ],

  // Fire
  kindling: [{ from: "ember-flow", powerPerRank: 0.025 }],
  ashmark: [
    { from: "kindling", powerPerRank: 0.03 },
    { from: "ember-flow", powerPerRank: 0.02 },
  ],
  pyre: [
    { from: "ashmark", powerPerRank: 0.03 },
    { from: "kindling", powerPerRank: 0.02 },
  ],
  "cinder-lance": [
    { from: "pyre", powerPerRank: 0.03 },
    { from: "kindling", powerPerRank: 0.02 },
  ],
  "ash-plume": [
    { from: "pyre", powerPerRank: 0.025 },
    { from: "ember-flow", powerPerRank: 0.015 },
  ],
  conflagration: [
    { from: "cinder-lance", powerPerRank: 0.03 },
    { from: "ash-plume", powerPerRank: 0.025 },
    { from: "pyre", powerPerRank: 0.015 },
  ],
  inferno: [
    { from: "pyre", powerPerRank: 0.04 },
    { from: "ashmark", powerPerRank: 0.03 },
    { from: "cinder-lance", powerPerRank: 0.02 },
  ],

  // Water
  spark: [{ from: "reservoir", powerPerRank: 0.035 }],
  mend: [{ from: "reservoir", powerPerRank: 0.03 }],
  tidemark: [
    { from: "spark", powerPerRank: 0.025 },
    { from: "mend", powerPerRank: 0.025 },
  ],
  tide: [
    { from: "tidemark", powerPerRank: 0.03 },
    { from: "reservoir", powerPerRank: 0.015 },
  ],
  "frost-ring": [
    { from: "tide", powerPerRank: 0.03 },
    { from: "spark", powerPerRank: 0.02 },
  ],
  undertow: [
    { from: "tide", powerPerRank: 0.025 },
    { from: "reservoir", powerPerRank: 0.015 },
  ],
  "glacier-bolt": [
    { from: "tide", powerPerRank: 0.03 },
    { from: "spark", powerPerRank: 0.02 },
  ],
  maelstrom: [
    { from: "glacier-bolt", powerPerRank: 0.03 },
    { from: "undertow", powerPerRank: 0.025 },
    { from: "tide", powerPerRank: 0.015 },
  ],
  deluge: [
    { from: "tide", powerPerRank: 0.04 },
    { from: "tidemark", powerPerRank: 0.03 },
    { from: "maelstrom", powerPerRank: 0.02 },
  ],

  // Unholy
  vespers: [{ from: "first-rite", powerPerRank: 0.025 }],
  darkmark: [
    { from: "vespers", powerPerRank: 0.03 },
    { from: "first-rite", powerPerRank: 0.02 },
  ],
  cantor: [
    { from: "darkmark", powerPerRank: 0.03 },
    { from: "first-rite", powerPerRank: 0.02 },
  ],
  breath: [
    { from: "cantor", powerPerRank: 0.025 },
    { from: "vespers", powerPerRank: 0.02 },
  ],
  "ward-chant": [
    { from: "cantor", powerPerRank: 0.03 },
    { from: "breath", powerPerRank: 0.02 },
  ],
  litany: [
    { from: "ward-chant", powerPerRank: 0.03 },
    { from: "breath", powerPerRank: 0.025 },
    { from: "cantor", powerPerRank: 0.02 },
  ],
  benediction: [
    { from: "cantor", powerPerRank: 0.04 },
    { from: "darkmark", powerPerRank: 0.03 },
    { from: "litany", powerPerRank: 0.02 },
  ],
};

/** Sum of synergy power from invested feeder ranks (0 = no bonus). */
export function synergyPower(id: string, ranks: Record<string, number>): number {
  const links = SKILL_SYNERGIES[id];
  if (!links?.length) return 0;
  let total = 0;
  for (const link of links) {
    const feeder = ranks[link.from] ?? 0;
    if (feeder <= 0) continue;
    total += feeder * (link.powerPerRank ?? 0);
  }
  return total;
}

/** Synergy cooldown multiplier (≤ 1). */
export function synergyCdMul(id: string, ranks: Record<string, number>): number {
  const links = SKILL_SYNERGIES[id];
  if (!links?.length) return 1;
  let cut = 0;
  for (const link of links) {
    const feeder = ranks[link.from] ?? 0;
    if (feeder <= 0) continue;
    cut += feeder * (link.cdrPerRank ?? 0.004);
  }
  return Math.max(0.82, 1 - cut);
}

export function synergiesFor(id: string): SynergyLink[] {
  return SKILL_SYNERGIES[id] ?? [];
}

export function passiveContribution(id: string, rank: number, ranks: Record<string, number> = {}): Partial<Mods> {
  const per = PASSIVE_PER_RANK[id];
  if (!per || rank <= 0) return {};
  const syn = 1 + synergyPower(id, ranks);
  const out: Partial<Mods> = {};
  for (const key of Object.keys(per) as (keyof Mods)[]) {
    const value = per[key];
    if (typeof value === "number") out[key] = value * rank * syn;
  }
  return out;
}

/** Base cast DPS before rank/gear cooldown modifiers: (mult × shots) / cooldown. */
export function activeBaseDps(spec: ActiveSpec): number | null {
  if (spec.kind === "aura" || spec.kind === "buff" || spec.kind === "channel") return null;
  if (spec.mult <= 0 || spec.cooldown <= 0) return null;
  return (spec.mult * Math.max(1, spec.shots)) / spec.cooldown;
}

export function scaledActive(id: string, rank: number, ranks: Record<string, number> = {}): ActiveSpec | null {
  const spec = ACTIVES[id];
  if (!spec || rank <= 0) return null;
  const steps = rank - 1;
  // Damage climbs with ranks; cooldown trim stays mild so base DPS balance still holds.
  const cdScale = Math.max(0.7, 1 - 0.015 * steps);
  const syn = 1 + synergyPower(id, ranks);
  const cdSyn = synergyCdMul(id, ranks);
  return {
    ...spec,
    mult: spec.mult * (1 + 0.12 * steps) * syn,
    cooldown: spec.cooldown * cdScale * cdSyn,
    energyCost: spec.energyCost,
    healFrac: spec.healFrac * (1 + 0.1 * steps) * syn,
    burn: spec.burn * (1 + 0.12 * steps) * syn,
    shieldFrac: spec.shieldFrac * (1 + 0.08 * steps) * syn,
    aura: scaleAura(spec.aura, rank, syn),
  };
}

function scaleAura(aura: Partial<Mods>, rank: number, syn = 1): Partial<Mods> {
  const out: Partial<Mods> = {};
  for (const key of Object.keys(aura) as (keyof Mods)[]) {
    const value = aura[key];
    if (typeof value === "number") out[key] = value * (1 + 0.12 * (rank - 1)) * syn;
  }
  return out;
}

const MOD_LABEL: Partial<Record<keyof Mods, (value: number) => string>> = {
  lifePct: (value) => `${signedPct(value)} life`,
  chargeMax: (value) => `${signedPct(value)} charge capacity`,
  armorPct: (value) => `${signedPct(value)} armor`,
  gearArmorPct: (value) => `${signedPct(value)} armor from gear`,
  meleeMult: (value) => `${signedPct(value)} melee damage`,
  spellMult: (value) => `${signedPct(value)} spell damage`,
  attackSpeed: (value) => `${signedPct(value)} attack speed`,
  moveSpeed: (value) => `${signedPct(value)} move speed`,
  crit: (value) => `${signedPct(value)} critical chance`,
  attackRatingPct: (value) => `${signedPct(value)} attack rating`,
  lifeRegenPct: (value) => `${signedPct(value)} life regen`,
  energyRegenPct: (value) => `${signedPct(value)} energy regen`,
  lifeSteal: (value) => `${signedPct(value)} life stolen on hit`,
  cdr: (value) => `${signedPct(value)} skill recharge`,
  damageReduction: (value) => `${Math.round(value * 100)}% less damage taken`,
  bleedChance: (value) => `${Math.round(value * 100)}% bleed chance`,
  goldFind: (value) => `${signedPct(value)} gold found`,
  magicFind: (value) => `${signedPct(value)} magic find`,
  projectileMult: (value) => `${signedPct(value)} projectile damage`,
  evasion: (value) => `${signedPct(value)} evasion`,
  vendorPrice: (value) => `${signedPct(value)} vendor prices`,
  vendorQuality: (value) => `${signedPct(value)} vendor quality`,
};

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}`;
}

function signedPct(value: number): string {
  const pct = Math.round(value * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export function formatMods(mods: Partial<Mods>): string {
  const parts: string[] = [];
  for (const key of Object.keys(mods) as (keyof Mods)[]) {
    const value = mods[key];
    const label = MOD_LABEL[key];
    if (typeof value === "number" && value !== 0 && label) parts.push(label(value));
  }
  return parts.join(", ");
}

export function describeSkill(id: string, rank: number, ranks: Record<string, number> = {}): string {
  const skill = skillById(id);
  if (!skill) return "";
  const shown = Math.max(1, rank);
  const passiveLike =
    skill.kind === "passive" || skill.kind === "key" || (skill.kind === "capstone" && !ACTIVES[id]);
  if (passiveLike) {
    const text = formatMods(passiveContribution(id, shown, ranks));
    const tail = rank > 0 ? text : `${text} at rank 1`;
    const syn = describeSynergies(id, ranks);
    const seal = skill.kind === "key" || skill.racial ? " Costs a keystone point." : "";
    return `${skill.blurb}${seal} ${tail}.${syn}`;
  }
  const spec = scaledActive(id, shown, ranks);
  if (!spec) return skill.blurb;
  const typeName = DAMAGE_PAIR_LABEL[skill.sector].primary;
  const bits = [skill.blurb];
  if (spec.kind === "aura") {
    bits.push(
      `While toggled: ${formatMods(spec.aura)}. Drains ${spec.energyPerSec.toFixed(1)} charge energy each second. Fills only from normal attacks.`,
    );
  } else if (spec.kind === "channel") {
    bits.push(
      `Channel ${spec.channelTime.toFixed(1)}s. Restores ${Math.round(spec.healFrac * 100)}% life${
        id === "litany" ? " and feeds skill charges" : ""
      }. Needs a full charge well; fills only from normal attacks.`,
    );
  } else if (spec.kind === "buff") {
    if (spec.shieldFrac > 0) bits.push(`Grants a shield of ${Math.round(spec.shieldFrac * 100)}% life for ${spec.buffTime.toFixed(0)}s.`);
    if (spec.invuln > 0) bits.push(`Cannot be hit for ${spec.invuln.toFixed(2)}s.`);
    bits.push("Spends one stored charge. Charges build from normal attacks.");
  } else {
    bits.push(
      `${Math.round(spec.mult * 100)}% ${typeName} damage (after gear), scaled by charge pace and max charges. Spends one stored charge.`,
    );
    if (spec.stun) bits.push(`Stuns for ${spec.stun.toFixed(1)}s.`);
    if (spec.slow) bits.push("Slows.");
    if (spec.burn) bits.push("Burns.");
    if (spec.dash) bits.push("Dashes along your facing.");
  }
  if (rank === 0 && skill.maxRank > 1) bits.push("Ranks raise power and shrink the charge well.");
  bits.push(describeSynergies(id, ranks).trim());
  return bits.filter(Boolean).join(" ");
}

function describeSynergies(id: string, ranks: Record<string, number>): string {
  const links = synergiesFor(id);
  if (!links.length) return "";
  const parts = links.map((link) => {
    const feeder = skillById(link.from);
    const have = ranks[link.from] ?? 0;
    const pct = Math.round((link.powerPerRank ?? 0) * 100);
    return `${feeder?.name ?? link.from} (+${pct}%/rank${have ? `, ${have}` : ""})`;
  });
  return ` Synergies: ${parts.join("; ")}.`;
}
