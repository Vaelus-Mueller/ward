import type { EnemyKind } from "./types";
import { MONSTER_ARCH } from "./monsters";

export const PACK_GAP = 560;
export const ROAD_X = 1800;
/** Base half-width of the walkable corridor (borders sit here). */
export const PATH_HALF = 148;
/** Occasional clearing half-width — mild open pockets, not plazas. */
export const PATH_OPEN_HALF = 210;
export const LEASH = 500;
export const SPAWN_IN = 750;
export const DESPAWN = 1200;
const MOVE = 172;
const TARGET_SECONDS = 8 * 60;
const LEVEL_SEAM = 180;

/** Gentle deterministic wander so the road is not a straight ruler. */
export function roadXAt(y: number): number {
  return ROAD_X + Math.sin(y * 0.00112) * 88 + Math.sin(y * 0.00255 + 1.3) * 36;
}

function pathCell(y: number): number {
  return Math.floor(y / 400);
}

function pathHash(cell: number): number {
  let h = (cell * 1103515245 + 12345) >>> 0;
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  return h >>> 0;
}

/** Corridor half-width at y — usually PATH_HALF, sometimes a soft bulge or open pocket. */
export function pathHalfAt(y: number): number {
  const h = pathHash(pathCell(y));
  if (h % 8 === 0) return PATH_OPEN_HALF;
  if (h % 5 === 0) return PATH_HALF + 28;
  return PATH_HALF;
}

export function pathBoundsAt(y: number): { minX: number; maxX: number; cx: number; half: number } {
  const cx = roadXAt(y);
  const half = pathHalfAt(y);
  return { minX: cx - half, maxX: cx + half, cx, half };
}

export const SIGHT: Record<EnemyKind, number> = Object.fromEntries(
  (Object.keys(MONSTER_ARCH) as EnemyKind[]).map((kind) => [kind, MONSTER_ARCH[kind].sight]),
) as Record<EnemyKind, number>;

interface LevelSpec {
  id: number;
  name: string;
  packs: number;
  size: number;
  offshoot?: { name: string; side: -1 | 1; packs: number; size: number; archers: boolean };
}

const LEVELS: LevelSpec[] = [
  { id: 1, name: "Threshold", packs: 8, size: 5 },
  { id: 2, name: "Ash Court", packs: 8, size: 6 },
  { id: 3, name: "Hound Run", packs: 8, size: 7, offshoot: { name: "Bone Pit", side: -1, packs: 2, size: 6, archers: false } },
  { id: 4, name: "Sentinel Stair", packs: 8, size: 8 },
  { id: 5, name: "Broken Gate", packs: 8, size: 10 },
  { id: 6, name: "Reed Marsh", packs: 9, size: 12, offshoot: { name: "Archer Ledge", side: 1, packs: 2, size: 8, archers: true } },
  { id: 7, name: "Cairn Walk", packs: 9, size: 13 },
  { id: 8, name: "Mail Yard", packs: 10, size: 15, offshoot: { name: "Dust Well", side: -1, packs: 2, size: 10, archers: false } },
  { id: 9, name: "Brute Hollow", packs: 10, size: 16 },
  { id: 10, name: "Tenth Ward", packs: 11, size: 18 },
];

export interface PackSpot {
  id: string;
  level: number;
  name: string;
  branch: boolean;
  x: number;
  y: number;
  size: number;
  boss: boolean;
  archers: boolean;
}

export function expectedDps(level: number): number {
  const swing = 5.5 + (level - 1) * 6.2;
  const uptime = 0.42 + Math.min(0.4, (level - 1) * 0.045);
  return swing * uptime;
}

export function houndHp(level: number): number {
  const ease = level <= 5 ? 0.8 + (level - 1) * 0.04 : 1;
  const hpScale = (1 + (level - 1) * 0.16) * ease;
  return Math.round(28 * hpScale);
}

export function toughnessFor(level: number, packs: number, size: number): number {
  const walk = (packs - 1) * PACK_GAP / MOVE;
  const fight = Math.max(60, TARGET_SECONDS - walk);
  return (fight / (packs * size) * expectedDps(level)) / houndHp(level);
}

export function walkSeconds(level: number): number {
  const spec = LEVELS[level - 1]!;
  return (spec.packs - 1) * PACK_GAP / MOVE;
}

export function mainPathMinutes(level: number): number {
  const spec = LEVELS[level - 1]!;
  const hp = houndHp(level) * toughnessFor(level, spec.packs, spec.size);
  const fight = (spec.packs * spec.size * hp) / expectedDps(level);
  return (fight + walkSeconds(level)) / 60;
}

export function levelName(level: number): string {
  return LEVELS[level - 1]?.name ?? "Threshold";
}

function buildPacks(): PackSpot[] {
  const packs: PackSpot[] = [];
  let y = 56000;
  for (const level of LEVELS) {
    const startY = y;
    for (let i = 0; i < level.packs; i++) {
      const last = i === level.packs - 1;
      const lateBoss = level.id === 10 && i >= level.packs - 2;
      // Mild lateral jitter on top of the road curve — keeps packs from lining up like a ruler.
      const sway = ((pathHash(level.id * 17 + i) % 100) / 100 - 0.5) * 36;
      packs.push({
        id: `${level.id}-${i}`,
        level: level.id,
        name: level.name,
        branch: false,
        x: roadXAt(y) + sway,
        y,
        size: level.size,
        boss: (level.id === 5 && last) || lateBoss,
        archers: false,
      });
      y -= PACK_GAP;
    }
    const side = level.offshoot;
    if (side) {
      const mouth = startY - PACK_GAP * Math.floor(level.packs / 2);
      const mouthBound = pathBoundsAt(mouth);
      let x = mouthBound.cx + side.side * (mouthBound.half + 90);
      for (let i = 0; i < side.packs; i++) {
        packs.push({
          id: `${level.id}-side-${i}`,
          level: level.id,
          name: side.name,
          branch: true,
          x,
          y: mouth + ((pathHash(level.id * 31 + i) % 100) / 100 - 0.5) * 50,
          size: side.size,
          boss: false,
          archers: side.archers,
        });
        x += side.side * (PACK_GAP * 0.85);
      }
    }
    y -= LEVEL_SEAM;
  }
  return packs;
}

let cached: PackSpot[] | null = null;

export function worldPacks(): PackSpot[] {
  if (!cached) cached = buildPacks();
  return cached;
}

export function roadStart(): { x: number; y: number } {
  const first = worldPacks().find((pack) => !pack.branch)!;
  const y = first.y + 340;
  return { x: roadXAt(y), y };
}

export function roadSpine(): { x: number; fromY: number; toY: number } {
  const mains = worldPacks().filter((pack) => !pack.branch);
  return { x: ROAD_X, fromY: mains[0]!.y, toY: mains[mains.length - 1]!.y };
}

export function placeAt(x: number, y: number): { level: number; name: string } {
  let bestMain = worldPacks()[0]!;
  let bestMainD = Infinity;
  let best = worldPacks()[0]!;
  let bestD = Infinity;
  for (const pack of worldPacks()) {
    const dist = Math.hypot(pack.x - x, pack.y - y);
    if (dist < bestD) {
      best = pack;
      bestD = dist;
    }
    if (!pack.branch && dist < bestMainD) {
      bestMain = pack;
      bestMainD = dist;
    }
  }
  if (best.branch && bestD + 80 < bestMainD) return { level: best.level, name: best.name };
  return { level: bestMain.level, name: bestMain.name };
}

export function packKinds(pack: PackSpot): EnemyKind[] {
  const kinds: EnemyKind[] = [];
  // Wave-1 roster mix by depth — keep KayKit undead as the spine, sprinkle archetypes.
  const deep: EnemyKind[] = [
    "wolf",
    "wolfF",
    "spider",
    "slime",
    "imp",
    "assassin",
    "slayer",
    "sprig",
    "gargoyle",
    "wisp",
    "cultist",
    "flicker",
    "lurker",
    "lumen",
    "legionnaire",
    "wyvern",
    "drake",
    "packrat",
    "giantrat",
  ];
  for (let i = 0; i < pack.size; i++) {
    if (pack.archers) {
      kinds.push(i % 5 === 0 ? "cultist" : i % 3 === 0 ? "wisp" : "archer");
    } else if (pack.level <= 2) {
      kinds.push(
        i % 5 === 0
          ? "rat"
          : i % 4 === 0
            ? "wolf"
            : i % 8 === 3
              ? "wolfF"
              : i % 3 === 0
                ? "roofrat"
                : i % 2 === 0
                  ? "skeleton"
                  : i % 7 === 0
                    ? "zombie"
                    : "hound",
      );
    } else if (pack.level <= 4) {
      kinds.push(
        i % 6 === 0
          ? "packrat"
          : i % 5 === 0
            ? "spider"
            : i % 4 === 3
              ? "sentinel"
              : i % 7 === 0
                ? "imp"
                : i % 3 === 1
                  ? "rat"
                  : i % 5 === 2
                    ? "zombieF"
                    : i % 2 === 0
                      ? "skeleton"
                      : i % 8 === 1
                        ? "zombie"
                        : "hound",
      );
    } else if (pack.level <= 6) {
      kinds.push(i % 5 === 4 ? "archer" : i % 3 === 2 ? "sentinel" : deep[i % deep.length]!);
    } else {
      kinds.push(i % 6 === 5 ? "gargoyle" : i % 4 === 0 ? deep[(i + pack.level) % deep.length]! : i % 3 === 2 ? "sentinel" : "hound");
    }
  }
  if (pack.boss) {
    // Max campaign level is 10 — escalate through giant → hatchling → archfiend → true dragon → wyrm.
    kinds[kinds.length - 1] =
      pack.level >= 10
        ? "wyrm"
        : pack.level >= 9
          ? "dragon"
          : pack.level >= 8
            ? "archdemon"
            : pack.level >= 7
              ? "whelp"
              : pack.level >= 6
                ? "hillock"
                : pack.level >= 5
                  ? "direrat"
                  : "brute";
  }
  return kinds;
}

export function levelToughness(pack: PackSpot): number {
  const spec = LEVELS[pack.level - 1]!;
  return toughnessFor(pack.level, spec.packs, spec.size);
}
