import { grantXp } from "./character";
import { HERO_ATTACK_DUR, HERO_ATTACK_IMPACT } from "../render/heroes";
import {
  ARENA,
  STAT_POINTS_PER_LEVEL,
  clamp,
  emptyMods,
  type Character,
  type DamagePair,
  type Derived,
  type EnemyKind,
  type Mods,
} from "./types";
import { derive, gearNumber, hitChance, mitigate, rollRange } from "./formulas";
import { rollGem, rollItem, starterBlade, tryAddItem } from "./items";
import { mulberry32 } from "./rng";
import { ACTIVES, passiveContribution, scaledActive, skillById, type ActiveSpec } from "./skills";
import { MONSTER_ARCH, damageTakenMul, monsterAttackPair, monsterOf } from "./monsters";
import { raceCdr, raceDamageTakenMul } from "./races";
import {
  DESPAWN,
  LEASH,
  SIGHT,
  SPAWN_IN,
  levelToughness,
  packKinds,
  placeAt,
  roadStart,
  worldPacks,
  type PackSpot,
} from "./world";

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  defense: number;
  armor: number;
  damage: number;
  speed: number;
  range: number;
  radius: number;
  cd: number;
  maxCd: number;
  telegraph: number;
  stun: number;
  slow: number;
  dot: { dps: number; t: number } | null;
  xp: number;
  gold: number;
  flash: number;
  level: number;
  homeX: number;
  homeY: number;
  anchorX: number;
  anchorY: number;
  pack: string;
  sight: number;
  aggro: boolean;
  elite: boolean;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  damage: number;
  fromPlayer: boolean;
  color: string;
  hit: number[];
  pierce: boolean;
  burn: number;
  bleed: boolean;
  style: "spark" | "fire" | "knife" | "arrow";
  /** Damage pair for resist/weak — never used for immunities. */
  pair: DamagePair;
}

export type BurstKind = "slash" | "cleave" | "bleed" | "fire" | "frost" | "arcane" | "heal" | "ward" | "dash";

export interface Burst {
  x: number;
  y: number;
  facing: number;
  t: number;
  life: number;
  kind: BurstKind;
  color: string;
  radius: number;
}

export interface Drop {
  id: number;
  x: number;
  y: number;
  gold: number;
  itemUid: string | null;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

export interface Intent {
  moveX: number;
  moveY: number;
  aimId: number | null;
  dest: { x: number; y: number } | null;
  attack: boolean;
  skills: [boolean, boolean, boolean];
  lootId: number | null;
}

export interface TickResult {
  playerHit: boolean;
  enemyHit: boolean;
  killed: number;
  leveled: number;
  died: boolean;
  waveStarted: number;
  townReady: boolean;
  portalInterrupted: boolean;
  eliteAggro: boolean;
  uniqueFind: boolean;
  maxCritDealt: boolean;
  maxCritTaken: boolean;
}

interface Buff {
  t: number;
  invuln: number;
  move: number;
  critAdd: number;
}

interface PlayerBody {
  x: number;
  y: number;
  facing: number;
  hp: number;
  energy: number;
  attackCd: number;
  skillCd: [number, number, number];
  channel: { slot: number; t: number; total: number; healFrac: number; restoreMana: boolean } | null;
  portal: { t: number; total: number } | null;
  auras: [boolean, boolean, boolean];
  buffs: Buff[];
  shield: number;
  iFrame: number;
  stun: number;
  aimId: number | null;
  dest: { x: number; y: number } | null;
  swing: number;
  /** Full length of the current swing window (for impact timing). */
  swingTotal: number;
  /** Melee blow waiting for the weapon to reach the strike pose. */
  pendingMelee: {
    enemyId: number;
    damage: number;
    burn: number;
    frost: number;
    frostDur: number;
  } | null;
}

const ARCH = MONSTER_ARCH;

export interface Snapshot {
  character: Character;
  wave: number;
  hp: number;
  energy: number;
  x: number;
  y: number;
  starterGiven: boolean;
  cleared?: string[];
}

export function emptyIntent(): Intent {
  return {
    moveX: 0,
    moveY: 0,
    aimId: null,
    dest: null,
    attack: false,
    skills: [false, false, false],
    lootId: null,
  };
}

/** Ramp from a soft start to full power across the first ten waves. */
export function earlyEase(wave: number, start: number, fullAt = 10): number {
  if (wave >= fullAt) return 1;
  if (wave <= 1) return start;
  return start + (1 - start) * ((wave - 1) / (fullAt - 1));
}

export function makeEnemy(kind: EnemyKind, wave: number, x: number, y: number, id: number): Enemy {
  const arch = ARCH[kind];
  const hpEase = earlyEase(wave, 0.75);
  const dmgEase = earlyEase(wave, 0.4);
  const defEase = earlyEase(wave, 0.7);
  const hpScale = (1 + (wave - 1) * 0.16) * hpEase;
  const dmgScale = (1 + (wave - 1) * 0.1) * dmgEase;
  const hp = Math.round(arch.hp * hpScale);
  return {
    id,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    defense: Math.round(arch.def * (1 + (wave - 1) * 0.08) * defEase),
    armor: arch.armor * (1 + (wave - 1) * 0.1) * defEase,
    damage: arch.dmg * dmgScale,
    speed: arch.speed,
    range: arch.range,
    radius: arch.r,
    cd: 0.4 + (id % 5) * 0.08,
    maxCd: arch.cd,
    telegraph: 0,
    stun: 0,
    slow: 0,
    dot: null,
    xp: Math.round(arch.xp * (1 + (wave - 1) * 0.08)),
    gold: arch.gold + Math.floor((wave - 1) / 2),
    flash: 0,
    level: wave,
    homeX: x,
    homeY: y,
    anchorX: x,
    anchorY: y,
    pack: `solo-${id}`,
    sight: SIGHT[kind],
    aggro: false,
    elite: false,
  };
}

export class Sim {
  character: Character;
  player: PlayerBody;
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  drops: Drop[] = [];
  bursts: Burst[] = [];
  itemStore = new Map<string, ReturnType<typeof starterBlade>>();
  floats: FloatText[] = [];
  wave = 1;
  phase: "title" | "play" | "dead" | "between" = "title";
  mods: Mods = emptyMods();
  derived: Derived;
  banner = "";
  bannerT = 0;
  between = 0;
  killedTotal = 0;
  placeLabel = "Level 1 · Threshold";
  private cleared = new Set<string>();
  private spawned = new Set<string>();
  private roadNoted = false;
  private rng: () => number;
  private nextEnemy = 1;
  private nextDrop = 1;
  private nextUid = 1;
  private starterGiven = false;
  private hurtThisTick = false;

  constructor(character: Character, seed = 1) {
    this.character = character;
    this.rng = mulberry32(seed);
    this.derived = derive(character);
    this.player = {
      x: roadStart().x,
      y: roadStart().y,
      facing: -Math.PI / 2,
      hp: 1,
      energy: 1,
      attackCd: 0,
      skillCd: [0, 0, 0],
      channel: null,
      portal: null,
      auras: [false, false, false],
      buffs: [],
      shield: 0,
      iFrame: 0,
      stun: 0,
      aimId: null,
      dest: null,
      swing: 0,
      swingTotal: 0,
      pendingMelee: null,
    };
    this.recompute();
    this.player.hp = this.derived.life;
    this.player.energy = this.derived.energy;
  }

  recompute(): void {
    const mods = emptyMods();
    for (const [id, rank] of Object.entries(this.character.skillRanks)) {
      if (!rank) continue;
      const skill = skillById(id);
      if (skill && (skill.kind === "passive" || skill.kind === "key" || (skill.kind === "capstone" && !ACTIVES[id]))) {
        const extra = passiveContribution(id, rank, this.character.skillRanks);
        for (const key of Object.keys(extra) as (keyof Mods)[]) {
          const value = extra[key];
          if (typeof value === "number") mods[key] += value;
        }
      }
    }
    for (let i = 0; i < 3; i++) {
      if (!this.player.auras[i]) continue;
      const id = this.character.slotted[i];
      if (!id) continue;
      const spec = scaledActive(id, this.character.skillRanks[id] ?? 0, this.character.skillRanks);
      if (spec?.kind !== "aura") continue;
      for (const key of Object.keys(spec.aura) as (keyof Mods)[]) {
        const value = spec.aura[key];
        if (typeof value === "number") mods[key] += value;
      }
    }
    this.mods = mods;
    this.derived = derive(this.character, mods);
    this.player.hp = Math.min(this.player.hp, this.derived.life);
    this.player.energy = Math.min(this.player.energy, this.derived.energy);
  }

  begin(): void {
    this.phase = "play";
    this.recompute();
    this.player.hp = this.derived.life;
    this.player.energy = this.derived.energy;
    this.trackPlace();
    this.refreshPacks();
  }

  retry(): void {
    const loss = Math.floor(this.character.gold * 0.15);
    this.character.gold -= loss;
    this.player.channel = null;
    this.player.portal = null;
    this.player.buffs = [];
    this.player.shield = 0;
    this.player.iFrame = 0;
    this.player.stun = 0;
    this.shots = [];
    this.recompute();
    this.player.hp = this.derived.life;
    this.player.energy = this.derived.energy;
    this.phase = "play";
    this.enemies = [];
    this.spawned.clear();
    this.refreshPacks();
    if (loss > 0) this.float(this.player.x, this.player.y - 30, `-${loss} gold`, "#e7c39a");
  }

  toSnapshot(): Snapshot {
    return {
      character: this.character,
      wave: this.wave,
      hp: this.player.hp,
      energy: this.player.energy,
      x: this.player.x,
      y: this.player.y,
      starterGiven: this.starterGiven,
      cleared: [...this.cleared],
    };
  }

  applySnapshot(data: Snapshot): void {
    this.character = data.character;
    this.wave = Math.max(1, data.wave);
    this.starterGiven = data.starterGiven;
    this.recompute();
    this.player.hp = clamp(data.hp, 1, this.derived.life);
    this.player.energy = clamp(
      Number((data as Snapshot & { mana?: number }).energy ?? (data as Snapshot & { mana?: number }).mana ?? 0),
      0,
      this.derived.energy,
    );
    this.player.x = data.x;
    this.player.y = data.y;
    this.phase = "title";
    this.enemies = [];
    this.shots = [];
    this.cleared = new Set(Array.isArray(data.cleared) ? data.cleared : []);
    this.spawned.clear();
  }

  rest(dt: number): void {
    this.recompute();
    this.player.hp = Math.min(this.derived.life, this.player.hp + this.derived.lifeRegen * dt);
    this.player.energy = Math.min(this.derived.energy, this.player.energy + this.derived.energyRegen * dt);
  }

  update(intent: Intent, dt: number): TickResult {
    const result: TickResult = {
      playerHit: false,
      enemyHit: false,
      killed: 0,
      leveled: 0,
      died: false,
      waveStarted: 0,
      townReady: false,
      portalInterrupted: false,
      eliteAggro: false,
      uniqueFind: false,
      maxCritDealt: false,
      maxCritTaken: false,
    };
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.decayFloats(dt);
    if (this.phase === "title" || this.phase === "dead") return result;
    this.bursts = this.bursts.filter((burst) => {
      burst.t -= dt;
      return burst.t > 0;
    });

    if (this.phase === "between") this.phase = "play";

    this.hurtThisTick = false;
    this.tickTimers(dt);
    this.resolvePendingMelee(result);
    this.applyIntent(intent, dt);
    if (this.player.portal) {
      const stick = Math.hypot(intent.moveX, intent.moveY);
      const busy =
        stick > 0.18 ||
        intent.attack ||
        intent.skills.some(Boolean) ||
        intent.dest !== null ||
        intent.aimId !== null ||
        this.hurtThisTick ||
        this.player.stun > 0;
      if (busy) {
        this.breakPortal();
        result.portalInterrupted = true;
        this.float(this.player.x, this.player.y - 28, "Portal broken", "#9a8f9e");
      }
    }
    for (const edge of [0, 1, 2] as const) {
      if (intent.skills[edge]) this.trySkill(edge, result);
    }
    const stick = Math.hypot(intent.moveX, intent.moveY);
    const handsBusy = intent.skills.some(Boolean);
    const idle =
      stick <= 0.18 &&
      this.player.dest === null &&
      this.player.aimId === null &&
      !intent.attack &&
      !handsBusy;
    if (idle || intent.attack || this.player.aimId !== null) this.tryBasicAttack(result, idle);
    this.tickChannel(dt);
    this.tickPortal(dt, result);
    this.tickAuras(dt);
    this.tickEnemies(dt, result);
    this.tickShots(dt, result);
    this.resolveDeaths(result);
    this.separateEnemies();
    this.clampBodies();
    if (intent.lootId !== null) this.takeDrop(intent.lootId);
    this.collectGold();
    if (this.player.stun > 0) this.breakChannel();
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.phase = "dead";
      result.died = true;
    }
    this.refreshPacks();
    this.trackPlace();
    return result;
  }

  nearestItemDrop(): Drop | null {
    let best: Drop | null = null;
    let bestDist = 110;
    for (const drop of this.drops) {
      if (!drop.itemUid) continue;
      const dist = Math.hypot(drop.x - this.player.x, drop.y - this.player.y);
      if (dist < bestDist) {
        best = drop;
        bestDist = dist;
      }
    }
    return best;
  }

  enemyAt(x: number, y: number): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = 26;
    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - x, enemy.y - y) - enemy.radius;
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }
    return best;
  }

  private tickTimers(dt: number): void {
    const p = this.player;
    p.attackCd = Math.max(0, p.attackCd - dt);
    p.swing = Math.max(0, p.swing - dt);
    p.iFrame = Math.max(0, p.iFrame - dt);
    p.stun = Math.max(0, p.stun - dt);
    for (let i = 0; i < 3; i++) p.skillCd[i] = Math.max(0, p.skillCd[i]! - dt);
    p.buffs = p.buffs.filter((buff) => {
      buff.t -= dt;
      return buff.t > 0;
    });
    p.hp = Math.min(this.derived.life, p.hp + this.derived.lifeRegen * dt);
    p.energy = Math.min(this.derived.energy, p.energy + this.derived.energyRegen * dt);
    for (const enemy of this.enemies) enemy.flash = Math.max(0, enemy.flash - dt);
  }

  private moveBonus(): number {
    return this.player.buffs.reduce((sum, buff) => sum + buff.move, 0);
  }

  private iframeLeft(): number {
    return Math.max(this.player.iFrame, ...this.player.buffs.map((buff) => (buff.invuln > 0 ? buff.t : 0)), 0);
  }

  private applyIntent(intent: Intent, dt: number): void {
    const p = this.player;
    if (intent.dest) {
      p.dest = intent.dest;
      p.aimId = null;
    }
    if (intent.aimId !== null) {
      p.aimId = intent.aimId;
      p.dest = null;
    }
    // Town portal is a standing cast — movement is held until it finishes or breaks.
    if (p.portal) return;
    const stick = Math.hypot(intent.moveX, intent.moveY);
    let vx = 0;
    let vy = 0;
    if (p.stun > 0) {
      p.dest = null;
    } else if (stick > 0.18) {
      p.dest = null;
      p.aimId = null;
      vx = intent.moveX / stick;
      vy = intent.moveY / stick;
    } else if (p.aimId !== null) {
      const enemy = this.enemies.find((entry) => entry.id === p.aimId);
      if (!enemy) p.aimId = null;
      else {
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        p.facing = Math.atan2(dy, dx);
      }
    } else if (p.dest) {
      const dx = p.dest.x - p.x;
      const dy = p.dest.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) p.dest = null;
      else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }
    if (vx !== 0 || vy !== 0) {
      const channelMul = p.channel ? 0.42 : 1;
      const speed = this.derived.moveSpeed * (1 + this.moveBonus()) * channelMul * dt;
      p.x += vx * speed;
      p.y += vy * speed;
      if (stick > 0.18 || p.aimId === null) p.facing = Math.atan2(vy, vx);
    }
  }

  private tryBasicAttack(result: TickResult, anyFacing = false): void {
    const p = this.player;
    if (p.attackCd > 0 || p.channel || p.portal || p.pendingMelee || p.swing > 0) return;
    const style = this.derived.weaponStyle;
    const range = this.derived.weaponRange;
    const ranged = style === "bow" || style === "thrown" || style === "handbow";
    const target = this.nearestEnemy(range, style === "melee" && !anyFacing);
    if (!target && style === "melee") return;
    if (!target && style !== "melee" && p.aimId === null) return;
    if (target) p.facing = Math.atan2(target.y - p.y, target.x - p.x);
    p.attackCd = this.derived.attackPeriod;
    const burn = gearNumber(this.character, "burn");
    const frost = gearNumber(this.character, "frost");
    const lightning = gearNumber(this.character, "lightning");
    if (style === "melee") {
      // Commit the swing; damage lands when the blade reaches the impact pose.
      p.swingTotal = HERO_ATTACK_DUR;
      p.swing = HERO_ATTACK_DUR;
      this.burst("slash", burn > 0 ? "#ff8a3d" : "#e7c39a", 1);
      if (target) {
        p.pendingMelee = {
          enemyId: target.id,
          damage: this.rollWeapon() + lightning,
          burn,
          frost,
          frostDur: frost > 0 ? 1.4 : 0,
        };
      }
    } else if (style === "focus") {
      p.swingTotal = 0.32;
      p.swing = 0.32;
      const damage = this.rollSpell(1) + lightning;
      this.fire(p.facing, 0, 1, damage, "#c9b6ff", burn, false, range, "spark");
      this.burst("arcane", "#c9b6ff", 0.7);
    } else if (ranged) {
      p.swingTotal = 0.36;
      p.swing = 0.36;
      const damage = this.rollWeapon() + lightning;
      const color = style === "thrown" ? "#d8c4a0" : "#f0e2c4";
      this.fire(p.facing, 0, 1, damage, color, burn, false, range, style === "thrown" ? "knife" : "arrow");
      this.burst("slash", color, 0.7);
    }
  }

  private resolvePendingMelee(result: TickResult): void {
    const p = this.player;
    const pending = p.pendingMelee;
    if (!pending || p.swingTotal <= 0) return;
    const impactLeft = p.swingTotal * (1 - HERO_ATTACK_IMPACT);
    if (p.swing > impactLeft) return;
    p.pendingMelee = null;
    const enemy = this.enemies.find((entry) => entry.id === pending.enemyId);
    if (!enemy || enemy.hp <= 0) return;
    const reach = this.derived.weaponRange + 48;
    if (Math.hypot(enemy.x - p.x, enemy.y - p.y) > reach) return;
    p.facing = Math.atan2(enemy.y - p.y, enemy.x - p.x);
    this.hitEnemy(enemy, pending.damage, false, pending.burn, result, 0, pending.frost, pending.frostDur, 0, "bleed");
  }

  private trySkill(index: 0 | 1 | 2, result: TickResult): void {
    const id = this.character.slotted[index];
    if (!id) return;
    const rank = this.character.skillRanks[id] ?? 0;
    const spec = scaledActive(id, rank, this.character.skillRanks);
    if (!spec) return;
    if (spec.kind === "aura") {
      this.player.auras[index] = !this.player.auras[index];
      if (this.player.auras[index] && this.player.energy <= 1) {
        this.player.auras[index] = false;
        this.float(this.player.x, this.player.y - 28, "No energy", "#9ebed0");
        return;
      }
      this.recompute();
      this.burst("ward", spec.color, 1.1);
      return;
    }
    if (this.player.skillCd[index] > 0) return;
    if (this.player.energy < spec.energyCost) {
      this.float(this.player.x, this.player.y - 28, "No energy", "#9ebed0");
      return;
    }
    this.player.energy -= spec.energyCost;
    // Racial cdr may be negative (golem), so allow a modest slow band below zero.
    const cdr = clamp(this.mods.cdr + gearNumber(this.character, "cdr") + raceCdr(this.character.race), -0.35, 0.4);
    this.player.skillCd[index] = spec.cooldown * (1 - cdr);
    this.breakChannel();
    this.player.swingTotal = Math.max(0.28, Math.min(0.55, spec.cooldown * 0.08 + 0.28));
    this.player.swing = this.player.swingTotal;
    this.castFx(spec);
    if (spec.kind === "channel") {
      this.breakChannel();
      this.player.channel = {
        slot: index,
        t: spec.channelTime,
        total: spec.channelTime,
        healFrac: spec.healFrac,
        restoreMana: id === "litany",
      };
      return;
    }
    const pair = skillById(id)?.sector ?? "bleed";
    this.cast(spec, result, pair);
  }

  private cast(spec: ActiveSpec, result: TickResult, pair: DamagePair = "bleed"): void {
    const p = this.player;
    const critAdd = spec.kind === "dash" && spec.bleed ? 0.45 : 0;
    if (spec.kind === "buff") {
      if (spec.shieldFrac > 0) p.shield = Math.max(p.shield, this.derived.life * spec.shieldFrac);
      p.buffs.push({
        t: Math.max(spec.buffTime, spec.invuln),
        invuln: spec.invuln,
        move: spec.moveBuff,
        critAdd: 0,
      });
      if (spec.invuln > 0) p.iFrame = Math.max(p.iFrame, spec.invuln);
      return;
    }
    if (spec.kind === "dash") {
      p.x += Math.cos(p.facing) * spec.dash;
      p.y += Math.sin(p.facing) * spec.dash;
      for (const enemy of this.enemies) {
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= spec.range) {
          this.hitEnemy(enemy, this.rollScaled(spec), spec.bleed > 0, spec.burn, result, spec.stun, spec.slow, spec.slowDur, critAdd, pair);
        }
      }
      return;
    }
    if (spec.kind === "melee" || spec.kind === "arc") {
      const arc = spec.kind === "melee" ? 0.7 : spec.arc;
      let hits = 0;
      for (const enemy of this.enemies) {
        if (!this.inArc(enemy, spec.range, arc)) continue;
        this.hitEnemy(enemy, this.rollScaled(spec), spec.bleed > 0, spec.burn, result, spec.stun, spec.slow, spec.slowDur, 0, pair);
        hits += 1;
      }
      if (hits === 0 && spec.kind === "melee") {
        const target = this.nearestEnemy(spec.range, false);
        if (target) this.hitEnemy(target, this.rollScaled(spec), spec.bleed > 0, spec.burn, result, spec.stun, spec.slow, spec.slowDur, 0, pair);
      }
      return;
    }
    if (spec.kind === "nova") {
      for (const enemy of this.enemies) {
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= spec.range) {
          this.hitEnemy(enemy, this.rollScaled(spec), false, spec.burn, result, spec.stun, spec.slow, spec.slowDur, 0, pair);
        }
      }
      return;
    }
    if (spec.kind === "projectile") {
      const damage = this.rollScaled(spec) * (spec.scaling === "melee" ? 1 + this.mods.projectileMult : 1);
      const style = spec.burn > 0 ? "fire" : spec.scaling === "spell" ? "spark" : "knife";
      this.fire(p.facing, spec.shots, spec.shots, damage, spec.color, spec.burn, spec.radial, spec.range, style, pair);
    }
  }

  private castFx(spec: ActiveSpec): void {
    if (spec.kind === "buff") {
      this.burst(spec.shieldFrac > 0 ? "ward" : "dash", spec.color, 1.15);
      return;
    }
    if (spec.kind === "dash") {
      this.burst("dash", spec.color, 1.45);
      if (spec.bleed > 0) this.burst("bleed", "#e15b4c", 0.95);
      return;
    }
    if (spec.kind === "channel") {
      this.burst("heal", spec.color, 1);
      return;
    }
    if (spec.kind === "nova") {
      const kind = spec.burn > 0 ? "fire" : spec.slow > 0 ? "frost" : "arcane";
      this.burst(kind, spec.color, spec.range / 90);
      return;
    }
    if (spec.kind === "melee" || spec.kind === "arc") {
      const kind = spec.bleed > 0 ? "bleed" : spec.slow > 0 ? "frost" : spec.kind === "arc" ? "cleave" : spec.stun > 0 ? "ward" : "slash";
      this.burst(kind, spec.color, spec.kind === "arc" ? 1.3 : 1.05);
    }
  }

  private burst(kind: BurstKind, color: string, radius = 1): void {
    this.bursts.push({
      x: this.player.x,
      y: this.player.y,
      facing: this.player.facing,
      t: 0.46,
      life: 0.46,
      kind,
      color,
      radius,
    });
  }

  private fire(
    facing: number,
    _shotIndex: number,
    count: number,
    damage: number,
    color: string,
    burn: number,
    radial: boolean,
    speed: number,
    style: Shot["style"],
    pair: DamagePair = "bleed",
  ): void {
    const p = this.player;
    for (let i = 0; i < count; i++) {
      const angle = radial ? (i / count) * Math.PI * 2 : facing + (i - (count - 1) / 2) * 0.22;
      const velocity = Math.max(280, speed);
      this.shots.push({
        x: p.x + Math.cos(angle) * 18,
        y: p.y + Math.sin(angle) * 18,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        radius: 5,
        life: 1.15,
        damage,
        fromPlayer: true,
        color,
        hit: [],
        pierce: count === 1 && speed >= 400,
        burn,
        bleed: false,
        style,
        pair,
      });
    }
  }

  private tickChannel(dt: number): void {
    const channel = this.player.channel;
    if (!channel) return;
    const rate = channel.healFrac / channel.total;
    this.player.hp = Math.min(this.derived.life, this.player.hp + this.derived.life * rate * dt);
    if (channel.restoreMana) {
      this.player.energy = Math.min(this.derived.energy, this.player.energy + this.derived.energy * 0.18 * dt);
    }
    channel.t -= dt;
    if (channel.t <= 0) this.player.channel = null;
  }

  /** Begin a 3s interruptible town portal cast. */
  startPortal(): string | null {
    if (this.phase !== "play") return "The gate will not open here.";
    if (this.player.stun > 0) return "You cannot open a portal while stunned.";
    if (this.player.portal) return null;
    this.breakChannel();
    this.player.dest = null;
    this.player.aimId = null;
    this.player.portal = { t: 3, total: 3 };
    this.float(this.player.x, this.player.y - 30, "Opening portal…", "#c9a56a");
    this.burst("ward", "#7a1c24", 1.2);
    return null;
  }

  portalProgress(): number {
    const portal = this.player.portal;
    if (!portal) return 0;
    return 1 - portal.t / portal.total;
  }

  private tickPortal(dt: number, result: TickResult): void {
    const portal = this.player.portal;
    if (!portal) return;
    portal.t -= dt;
    if (portal.t > 0) return;
    this.player.portal = null;
    result.townReady = true;
    this.burst("ward", "#e0c078", 1.4);
    this.float(this.player.x, this.player.y - 32, "Ashgate", "#e0c078");
  }

  private breakPortal(): void {
    this.player.portal = null;
  }

  private breakChannel(): void {
    this.player.channel = null;
  }

  private tickAuras(dt: number): void {
    let drain = 0;
    for (let i = 0; i < 3; i++) {
      if (!this.player.auras[i]) continue;
      const id = this.character.slotted[i];
      if (!id) {
        this.player.auras[i] = false;
        continue;
      }
      const spec = scaledActive(id, this.character.skillRanks[id] ?? 0, this.character.skillRanks);
      if (!spec || spec.kind !== "aura") {
        this.player.auras[i] = false;
        continue;
      }
      drain += spec.energyPerSec;
    }
    if (drain <= 0) return;
    this.player.energy -= drain * dt;
    if (this.player.energy <= 0) {
      this.player.energy = 0;
      this.player.auras = [false, false, false];
      this.recompute();
      this.float(this.player.x, this.player.y - 24, "Aura fades", "#9ebed0");
    }
  }

  private tickEnemies(dt: number, result: TickResult): void {
    this.refreshAggro(result);
    for (const enemy of this.enemies) {
      enemy.cd = Math.max(0, enemy.cd - dt);
      enemy.stun = Math.max(0, enemy.stun - dt);
      enemy.slow = Math.max(0, enemy.slow - dt);
      if (enemy.dot) {
        enemy.hp -= enemy.dot.dps * dt;
        enemy.dot.t -= dt;
        if (enemy.dot.t <= 0) enemy.dot = null;
      }
      if (enemy.hp <= 0 || enemy.stun > 0) continue;
      if (!enemy.aggro) {
        enemy.telegraph = 0;
        const hx = enemy.homeX - enemy.x;
        const hy = enemy.homeY - enemy.y;
        const home = Math.hypot(hx, hy);
        if (home > 10) {
          const step = Math.min(enemy.speed * (enemy.slow > 0 ? 0.55 : 1) * dt, home);
          enemy.x += (hx / home) * step;
          enemy.y += (hy / home) * step;
        }
        continue;
      }
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const slowMul = enemy.slow > 0 ? 0.55 : 1;
      if ((enemy.kind === "brute" || enemy.kind === "hillock" || enemy.kind === "whelp") && enemy.telegraph > 0) {
        enemy.telegraph -= dt;
        if (enemy.telegraph <= 0) {
          if (dist < enemy.radius + 62) {
            this.hurtPlayer(enemy.damage * 1.35, enemy.level, enemy, result, {
              knockback: true,
              stun: 0.6,
              pair: monsterAttackPair(enemy.kind),
            });
          }
          enemy.cd = enemy.maxCd;
        }
        continue;
      }
      if (dist > enemy.range) {
        const step = enemy.speed * slowMul * dt;
        enemy.x += (dx / dist) * step;
        enemy.y += (dy / dist) * step;
        continue;
      }
      if (enemy.cd > 0) continue;
      if (enemy.kind === "brute" || enemy.kind === "hillock" || enemy.kind === "whelp") {
        enemy.telegraph = 0.85;
        continue;
      }
      if (enemy.kind === "archer") {
        const angle = Math.atan2(dy, dx);
        const speed = 240;
        this.shots.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 5,
          life: 1.4,
          damage: enemy.damage,
          fromPlayer: false,
          color: "#e7c39a",
          hit: [],
          pierce: false,
          burn: 0,
          bleed: false,
          style: "arrow",
          pair: "bleed",
        });
        enemy.cd = enemy.maxCd;
        continue;
      }
      if (enemy.kind === "cultist" || enemy.kind === "wisp") {
        const angle = Math.atan2(dy, dx);
        const speed = enemy.kind === "wisp" ? 200 : 230;
        this.shots.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 5,
          life: 1.3,
          damage: enemy.damage,
          fromPlayer: false,
          color: enemy.kind === "wisp" ? "#ffb060" : "#a894e6",
          hit: [],
          pierce: false,
          burn: enemy.kind === "wisp" ? 2 : 0,
          bleed: false,
          style: "spark",
          pair: enemy.kind === "wisp" ? "fire" : "unholy",
        });
        enemy.cd = enemy.maxCd;
        continue;
      }
      this.hurtPlayer(enemy.damage, enemy.level, enemy, result, { pair: monsterAttackPair(enemy.kind) });
      enemy.cd = enemy.maxCd;
    }
  }

  private tickShots(dt: number, result: TickResult): void {
    for (const shot of this.shots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (!shot.fromPlayer) {
        if (Math.hypot(shot.x - this.player.x, shot.y - this.player.y) < shot.radius + 16) {
          this.hurtPlayer(shot.damage, this.wave, null, result, { pair: shot.pair });
          shot.life = 0;
        }
        continue;
      }
      for (const enemy of this.enemies) {
        if (shot.hit.includes(enemy.id)) continue;
        if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) <= enemy.radius + shot.radius) {
          this.hitEnemy(enemy, shot.damage, shot.bleed, shot.burn, result, 0, 0, 0, 0, shot.pair);
          shot.hit.push(enemy.id);
          if (!shot.pierce) shot.life = 0;
          break;
        }
      }
    }
    this.shots = this.shots.filter((shot) => shot.life > 0);
  }

  private hurtPlayer(
    amount: number,
    sourceLevel: number,
    attacker: Enemy | null,
    result: TickResult,
    blow: { knockback?: boolean; stun?: number; pair?: DamagePair } = {},
  ): void {
    // Dodge / i-frames and shield absorb resolve as defense layers.
    // They must never clear swing / attackCd — committed attacks stay committed.
    if (this.iframeLeft() > 0) {
      this.float(this.player.x, this.player.y - 20, "dodge", "#c8d5cf");
      return;
    }
    if (this.rng() < this.derived.evasion) {
      this.float(this.player.x, this.player.y - 20, "evade", "#c8d5cf");
      return;
    }
    let damage = amount;
    let crit = false;
    // Elites and brutes can land crushing criticals; ordinary foes rarely.
    const critChance = attacker?.elite || attacker?.kind === "brute" || attacker?.kind === "whelp" || attacker?.kind === "hillock" ? 0.18 : 0.06;
    if (this.rng() < critChance) {
      damage *= 1.65;
      crit = true;
    }
    const maxHit = crit; // enemy damage is flat; a crit is their max-damage critical
    const pair = blow.pair ?? (attacker ? monsterAttackPair(attacker.kind) : "bleed");
    damage *= raceDamageTakenMul(this.character.race, pair);
    damage = mitigate(damage, this.derived.armor, sourceLevel, this.derived.damageReduction);
    if (this.player.shield > 0) {
      const absorbed = Math.min(this.player.shield, damage);
      this.player.shield -= absorbed;
      damage -= absorbed;
      if (absorbed > 0) this.float(this.player.x, this.player.y - 18, "block", "#e7c39a");
      // Full shield absorb: no HP loss, do not interrupt swing/attack animation.
      if (damage <= 0) return;
    }
    if (damage <= 0) return;
    this.player.hp -= damage;
    this.hurtThisTick = true;
    result.playerHit = true;
    if (maxHit) result.maxCritTaken = true;
    this.float(this.player.x, this.player.y - 22, `${Math.round(damage)}${maxHit ? "!" : ""}`, maxHit ? "#ff6a4a" : "#e15a4a");
    if (this.player.portal) {
      this.breakPortal();
      result.portalInterrupted = true;
      this.float(this.player.x, this.player.y - 34, "Portal broken", "#9a8f9e");
    }
    if (blow.stun && blow.stun > 0) this.player.stun = Math.max(this.player.stun, blow.stun);
    if (blow.knockback && attacker) {
      const dx = this.player.x - attacker.x;
      const dy = this.player.y - attacker.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.player.x += (dx / dist) * 78;
      this.player.y += (dy / dist) * 78;
      this.float(this.player.x, this.player.y - 28, "knocked back", "#e7c39a");
    }
    if ((blow.stun && blow.stun > 0) || blow.knockback) this.breakChannel();
    if (attacker && this.derived.thorns > 0) attacker.hp -= this.derived.thorns;
  }

  private hitEnemy(
    enemy: Enemy,
    raw: number,
    forceBleed: boolean,
    burn: number,
    result: TickResult,
    stun = 0,
    slow = 0,
    slowDur = 0,
    critAdd = 0,
    pair: DamagePair = "bleed",
  ): void {
    if (this.rng() > hitChance(this.derived.attackRating, enemy.defense)) {
      this.float(enemy.x, enemy.y - 18, "miss", "#b7b1a8");
      return;
    }
    let damage = raw;
    const preCrit = raw;
    const critChance = clamp(this.derived.crit + critAdd + this.player.buffs.reduce((sum, buff) => sum + buff.critAdd, 0), 0, 0.85);
    let crit = false;
    if (this.rng() < critChance) {
      damage *= 1.65;
      crit = true;
    }
    // Resist/weak only — clampDamageMul inside damageTakenMul enforces no immunities.
    damage *= damageTakenMul(monsterOf(enemy.kind), pair);
    damage = mitigate(damage, enemy.armor, this.character.level, 0);
    enemy.hp -= damage;
    enemy.flash = 0.12;
    result.enemyHit = true;
    if (crit && (preCrit >= this.derived.meleeMax * 0.995 || preCrit >= this.derived.spellMax * 0.995)) {
      result.maxCritDealt = true;
    }
    const tint = burn > 0 ? "#ff8a3d" : forceBleed ? "#e15b4c" : slow > 0 ? "#8ec8ff" : stun > 0 ? "#ffe0a0" : crit ? "#ffd27a" : "#f4efe6";
    this.float(enemy.x, enemy.y - enemy.radius - 8, `${Math.round(damage)}${result.maxCritDealt ? "!" : ""}`, tint);
    if (this.derived.lifeSteal > 0 && damage > 0) {
      const heal = damage * this.derived.lifeSteal;
      this.player.hp = Math.min(this.derived.life, this.player.hp + heal);
    }
    if (forceBleed || this.rng() < this.derived.bleedChance) {
      const dps = 2 + this.derived.meleeMax * 0.12;
      enemy.dot = { dps: Math.max(enemy.dot?.dps ?? 0, dps), t: 3 };
    }
    if (burn > 0) {
      enemy.dot = { dps: (enemy.dot?.dps ?? 0) + burn, t: Math.max(enemy.dot?.t ?? 0, 3) };
    }
    if (stun > 0) {
      enemy.stun = Math.max(enemy.stun, stun);
      enemy.telegraph = 0;
    }
    if (slow > 0) enemy.slow = Math.max(enemy.slow, slowDur);
    this.hasteFromHit();
  }

  private hasteFromHit(): void {
    for (let i = 0; i < 3; i++) {
      if (this.player.skillCd[i]! > 0) this.player.skillCd[i] = Math.max(0, this.player.skillCd[i]! - 0.16);
    }
    // Basic and skill hits charge skill energy.
    this.player.energy = Math.min(this.derived.energy, this.player.energy + this.derived.energyOnHit);
  }

  private resolveDeaths(result: TickResult): void {
    const living: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) {
        living.push(enemy);
        continue;
      }
      result.killed += 1;
      this.killedTotal += 1;
      const levelBefore = this.character.level;
      const gain = grantXp(this.character, enemy.xp);
      const gold = Math.max(1, Math.round(enemy.gold * (1 + this.mods.goldFind)));
      this.drops.push({ id: this.nextDrop++, x: enemy.x, y: enemy.y, gold, itemUid: null });
      if (!this.starterGiven) {
        this.starterGiven = true;
        this.placeItem(enemy.x + 18, enemy.y, starterBlade(`item-${this.nextUid++}`), result);
      } else if (this.rng() < 0.22) {
        this.placeItem(enemy.x + 16, enemy.y + 10, rollItem(this.rng, this.wave, `item-${this.nextUid++}`, this.character.level), result);
      }
      if (this.rng() < 0.06) {
        this.placeItem(enemy.x - 14, enemy.y + 8, rollGem(this.rng, `gem-${this.nextUid++}`), result);
      }
      const ranks = gain.levels + gain.paragons;
      if (ranks > 0) {
        this.recompute();
        this.player.hp = Math.min(this.derived.life, this.player.hp + this.derived.life * 0.28 * ranks);
        this.player.energy = Math.min(this.derived.energy, this.player.energy + this.derived.energy * 0.28 * ranks);
        if (gain.paragons > 0) {
          const skills = Math.floor(this.character.paragon / 5) - Math.floor((this.character.paragon - gain.paragons) / 5);
          const skillLine = skills > 0 ? `  ·  +${skills} skill point${skills > 1 ? "s" : ""}` : "";
          this.banner = `Paragon ${this.character.paragon}  ·  +${gain.paragons} attribute point${gain.paragons > 1 ? "s" : ""}${skillLine}`;
        } else {
          this.banner = `Level ${this.character.level}  ·  +${STAT_POINTS_PER_LEVEL * gain.levels} attribute points  ·  +${gain.levels} skill point${gain.levels > 1 ? "s" : ""}`;
        }
        if (levelBefore <= 20 && this.character.level > 20 && gain.paragons === 0) {
          this.banner = `Level ${this.character.level}  ·  The stones split. Magma takes the ward.`;
        }
        this.bannerT = 4.5;
        result.leveled += ranks;
      }
    }
    const before = this.enemies;
    this.enemies = living;
    this.markCleared(before, living);
    if (!this.roadNoted && this.roadClear()) {
      this.roadNoted = true;
      this.banner = "The tenth ward falls quiet.";
      this.bannerT = 4.5;
    }
  }

  private placeItem(x: number, y: number, item: ReturnType<typeof starterBlade>, result?: TickResult): void {
    this.itemStore.set(item.uid, item);
    this.drops.push({ id: this.nextDrop++, x, y, gold: 0, itemUid: item.uid });
    if (item.uniqueId && result) result.uniqueFind = true;
  }

  private collectGold(): void {
    const kept: Drop[] = [];
    for (const drop of this.drops) {
      if (drop.gold > 0 && Math.hypot(drop.x - this.player.x, drop.y - this.player.y) < 42) {
        this.character.gold += drop.gold;
        this.float(drop.x, drop.y, `+${drop.gold}`, "#e4c37a");
        continue;
      }
      kept.push(drop);
    }
    this.drops = kept;
  }

  private takeDrop(id: number): void {
    const drop = this.drops.find((entry) => entry.id === id);
    if (!drop?.itemUid) return;
    if (Math.hypot(drop.x - this.player.x, drop.y - this.player.y) > 120) return;
    const item = this.itemStore.get(drop.itemUid);
    if (!item) return;
    if (!tryAddItem(this.character, item)) {
      this.float(this.player.x, this.player.y - 26, "Pack is full", "#e7c39a");
      return;
    }
    this.itemStore.delete(item.uid);
    this.drops = this.drops.filter((entry) => entry.id !== id);
    this.float(this.player.x, this.player.y - 26, item.name, item.uniqueId ? "#d4b15a" : rarityColor(item.rarity));
  }

  private refreshAggro(result?: TickResult): void {
    const wasAggro = new Set<string>();
    for (const enemy of this.enemies) {
      if (enemy.aggro) wasAggro.add(enemy.pack);
    }
    const seen = new Set<string>();
    for (const enemy of this.enemies) {
      if (Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y) <= enemy.sight) seen.add(enemy.pack);
    }
    const leashed = new Set<string>();
    for (const enemy of this.enemies) {
      if (Math.hypot(this.player.x - enemy.anchorX, this.player.y - enemy.anchorY) > LEASH) leashed.add(enemy.pack);
    }
    for (const enemy of this.enemies) enemy.aggro = seen.has(enemy.pack) && !leashed.has(enemy.pack);
    if (result) {
      for (const enemy of this.enemies) {
        if (enemy.elite && enemy.aggro && !wasAggro.has(enemy.pack)) {
          result.eliteAggro = true;
          break;
        }
      }
    }
  }

  private markCleared(before: Enemy[], living: Enemy[]): void {
    const alive = new Set(living.map((enemy) => enemy.pack));
    for (const enemy of before) {
      if (!alive.has(enemy.pack) && this.spawned.has(enemy.pack)) this.cleared.add(enemy.pack);
    }
  }

  private roadClear(): boolean {
    return worldPacks().filter((pack) => !pack.branch).every((pack) => this.cleared.has(pack.id));
  }

  private trackPlace(): void {
    const place = placeAt(this.player.x, this.player.y);
    this.wave = place.level;
    const label = `Level ${place.level} · ${place.name}`;
    if (label === this.placeLabel) return;
    this.placeLabel = label;
    if (this.bannerT <= 0) {
      this.banner = place.name;
      this.bannerT = 2.2;
    }
  }

  private refreshPacks(): void {
    const keep: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (this.cleared.has(enemy.pack)) continue;
      const dist = Math.hypot(enemy.anchorX - this.player.x, enemy.anchorY - this.player.y);
      if (dist > DESPAWN) continue;
      keep.push(enemy);
    }
    this.enemies = keep;
    this.spawned = new Set(keep.map((enemy) => enemy.pack));
    for (const pack of worldPacks()) {
      if (this.cleared.has(pack.id) || this.spawned.has(pack.id)) continue;
      if (Math.hypot(pack.x - this.player.x, pack.y - this.player.y) > SPAWN_IN) continue;
      this.spawnPack(pack);
      this.spawned.add(pack.id);
    }
  }

  private spawnPack(pack: PackSpot): void {
    const tough = levelToughness(pack);
    const kinds = packKinds(pack);
    kinds.forEach((kind, index) => {
      const angle = (index / kinds.length) * Math.PI * 2;
      const radius = 28 + kinds.length * 2.2;
      const x = pack.x + Math.cos(angle) * radius;
      const y = pack.y + Math.sin(angle) * radius;
      const enemy = makeEnemy(kind, pack.level, x, y, this.nextEnemy++);
      enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * tough));
      enemy.hp = enemy.maxHp;
      enemy.homeX = x;
      enemy.homeY = y;
      enemy.anchorX = pack.x;
      enemy.anchorY = pack.y;
      enemy.pack = pack.id;
      enemy.sight = SIGHT[kind];
      enemy.aggro = false;
      enemy.elite = pack.boss && (kind === "brute" || index === kinds.length - 1);
      this.enemies.push(enemy);
    });
  }

  private nearestEnemy(range: number, preferFront: boolean): Enemy | null {
    let best: Enemy | null = null;
    let bestScore = range;
    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist > range) continue;
      const front = preferFront && !this.inArc(enemy, range, 1.2) ? 30 : 0;
      const score = dist + front;
      if (score < bestScore) {
        best = enemy;
        bestScore = score;
      }
    }
    return best;
  }

  private inArc(enemy: Enemy, range: number, arc: number): boolean {
    const dx = enemy.x - this.player.x;
    const dy = enemy.y - this.player.y;
    if (Math.hypot(dx, dy) > range) return false;
    const angle = Math.atan2(dy, dx);
    const delta = Math.atan2(Math.sin(angle - this.player.facing), Math.cos(angle - this.player.facing));
    return Math.abs(delta) <= arc / 2;
  }

  private rollWeapon(): number {
    return rollRange(this.derived.meleeMin, this.derived.meleeMax, this.rng);
  }

  private rollSpell(mult: number): number {
    return rollRange(this.derived.spellMin, this.derived.spellMax, this.rng) * mult;
  }

  private rollScaled(spec: ActiveSpec): number {
    if (spec.scaling === "spell") return this.rollSpell(spec.mult);
    return this.rollWeapon() * spec.mult;
  }

  private separateEnemies(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i]!;
        const b = this.enemies[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const need = a.radius + b.radius + 4;
        if (dist < need) {
          const push = (need - dist) / 2;
          a.x -= (dx / dist) * push;
          a.y -= (dy / dist) * push;
          b.x += (dx / dist) * push;
          b.y += (dy / dist) * push;
        }
      }
    }
  }

  private clampBodies(): void {
    const box = (body: { x: number; y: number; radius?: number }) => {
      const pad = (body.radius ?? 18) + 8;
      body.x = clamp(body.x, ARENA.margin + pad * 0, ARENA.width - ARENA.margin);
      body.y = clamp(body.y, ARENA.margin, ARENA.height - ARENA.margin);
    };
    box(this.player);
    for (const enemy of this.enemies) box(enemy);
  }

  private decayFloats(dt: number): void {
    for (const entry of this.floats) entry.t -= dt;
    this.floats = this.floats.filter((entry) => entry.t > 0).slice(-24);
  }

  private float(x: number, y: number, text: string, color: string): void {
    this.floats.push({ x, y, text, color, t: 0.75 });
  }
}

function rarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    grey: "#8a8680",
    white: "#f4efe6",
    green: "#7dce7a",
    blue: "#7eb6ff",
    purple: "#c58bff",
    orange: "#f0a04a",
    yellow: "#f0d54a",
    gold: "#d4a017",
    red: "#e15b4c",
    rainbow: "#ffe27a",
    rare: "#f0d56c",
    magic: "#8eb6ff",
  };
  return colors[rarity] ?? "#f4efe6";
}
