import { grantXp } from "./character";
import {
  ARENA,
  STAT_POINTS_PER_LEVEL,
  clamp,
  emptyMods,
  type Character,
  type Derived,
  type EnemyKind,
  type Mods,
} from "./types";
import { derive, gearNumber, hitChance, mitigate, rollRange } from "./formulas";
import { rollGem, rollItem, starterBlade, tryAddItem } from "./items";
import { mulberry32 } from "./rng";
import { passiveContribution, scaledActive, skillById, type ActiveSpec } from "./skills";

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
  mana: number;
  attackCd: number;
  skillCd: [number, number, number];
  channel: { slot: number; t: number; total: number; healFrac: number; restoreMana: boolean } | null;
  auras: [boolean, boolean, boolean];
  buffs: Buff[];
  shield: number;
  iFrame: number;
  aimId: number | null;
  dest: { x: number; y: number } | null;
  swing: number;
}

const ARCH: Record<
  EnemyKind,
  { hp: number; dmg: number; def: number; armor: number; speed: number; range: number; cd: number; r: number; xp: number; gold: number }
> = {
  hound: { hp: 28, dmg: 7, def: 12, armor: 2, speed: 96, range: 46, cd: 0.95, r: 16, xp: 14, gold: 3 },
  sentinel: { hp: 64, dmg: 10, def: 24, armor: 16, speed: 58, range: 52, cd: 1.2, r: 20, xp: 24, gold: 6 },
  archer: { hp: 34, dmg: 8, def: 14, armor: 4, speed: 70, range: 270, cd: 1.75, r: 15, xp: 18, gold: 5 },
  brute: { hp: 220, dmg: 18, def: 32, armor: 22, speed: 48, range: 78, cd: 2.4, r: 34, xp: 90, gold: 24 },
};

export interface Snapshot {
  character: Character;
  wave: number;
  hp: number;
  mana: number;
  x: number;
  y: number;
  starterGiven: boolean;
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

export function wavePlan(wave: number): EnemyKind[] {
  const count = Math.min(9, 3 + Math.floor(wave * 0.65));
  const kinds: EnemyKind[] = [];
  for (let i = 0; i < count; i++) {
    if (wave >= 4 && i % 5 === 4) kinds.push("archer");
    else if (wave >= 3 && i % 4 === 3) kinds.push("sentinel");
    else kinds.push("hound");
  }
  if (wave % 5 === 0) kinds.push("brute");
  return kinds;
}

export function makeEnemy(kind: EnemyKind, wave: number, x: number, y: number, id: number): Enemy {
  const arch = ARCH[kind];
  const ease = wave <= 5 ? 0.8 + (wave - 1) * 0.04 : 1;
  const hpScale = (1 + (wave - 1) * 0.16) * ease;
  const dmgScale = (1 + (wave - 1) * 0.1) * ease;
  const hp = Math.round(arch.hp * hpScale);
  return {
    id,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    defense: Math.round(arch.def * (1 + (wave - 1) * 0.08) * ease),
    armor: arch.armor * (1 + (wave - 1) * 0.1) * ease,
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
      x: ARENA.width / 2,
      y: ARENA.height / 2,
      facing: -Math.PI / 2,
      hp: 1,
      mana: 1,
      attackCd: 0,
      skillCd: [0, 0, 0],
      channel: null,
      auras: [false, false, false],
      buffs: [],
      shield: 0,
      iFrame: 0,
      aimId: null,
      dest: null,
      swing: 0,
    };
    this.recompute();
    this.player.hp = this.derived.life;
    this.player.mana = this.derived.mana;
  }

  recompute(): void {
    const mods = emptyMods();
    for (const [id, rank] of Object.entries(this.character.skillRanks)) {
      if (!rank) continue;
      const skill = skillById(id);
      if (skill?.kind === "passive") {
        const extra = passiveContribution(id, rank);
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
      const spec = scaledActive(id, this.character.skillRanks[id] ?? 0);
      if (spec?.kind !== "aura") continue;
      for (const key of Object.keys(spec.aura) as (keyof Mods)[]) {
        const value = spec.aura[key];
        if (typeof value === "number") mods[key] += value;
      }
    }
    this.mods = mods;
    this.derived = derive(this.character, mods);
    this.player.hp = Math.min(this.player.hp, this.derived.life);
    this.player.mana = Math.min(this.player.mana, this.derived.mana);
  }

  begin(): void {
    this.phase = "play";
    this.recompute();
    this.player.hp = this.derived.life;
    this.player.mana = this.derived.mana;
    this.spawnWave();
  }

  retry(): void {
    const loss = Math.floor(this.character.gold * 0.15);
    this.character.gold -= loss;
    this.player.channel = null;
    this.player.buffs = [];
    this.player.shield = 0;
    this.player.iFrame = 0;
    this.shots = [];
    this.recompute();
    this.player.hp = this.derived.life;
    this.player.mana = this.derived.mana;
    this.phase = "play";
    this.spawnWave();
    if (loss > 0) this.float(this.player.x, this.player.y - 30, `-${loss} gold`, "#e7c39a");
  }

  toSnapshot(): Snapshot {
    return {
      character: this.character,
      wave: this.wave,
      hp: this.player.hp,
      mana: this.player.mana,
      x: this.player.x,
      y: this.player.y,
      starterGiven: this.starterGiven,
    };
  }

  applySnapshot(data: Snapshot): void {
    this.character = data.character;
    this.wave = Math.max(1, data.wave);
    this.starterGiven = data.starterGiven;
    this.recompute();
    this.player.hp = clamp(data.hp, 1, this.derived.life);
    this.player.mana = clamp(data.mana, 0, this.derived.mana);
    this.player.x = data.x;
    this.player.y = data.y;
    this.phase = "title";
    this.enemies = [];
    this.shots = [];
  }

  rest(dt: number): void {
    this.recompute();
    this.player.hp = Math.min(this.derived.life, this.player.hp + this.derived.lifeRegen * dt);
    this.player.mana = Math.min(this.derived.mana, this.player.mana + this.derived.manaRegen * dt);
  }

  update(intent: Intent, dt: number): TickResult {
    const result: TickResult = { playerHit: false, enemyHit: false, killed: 0, leveled: 0, died: false, waveStarted: 0 };
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.decayFloats(dt);
    if (this.phase === "title" || this.phase === "dead") return result;
    this.bursts = this.bursts.filter((burst) => {
      burst.t -= dt;
      return burst.t > 0;
    });

    if (this.phase === "between") {
      this.tickTimers(dt);
      this.applyIntent(intent, dt);
      if (intent.lootId !== null) this.takeDrop(intent.lootId);
      this.collectGold();
      this.clampBodies();
      this.between -= dt;
      const nextWave = this.wave + 1;
      if (nextWave % 10 === 0 && this.between > 0) {
        const seconds = Math.max(1, Math.ceil(this.between));
        this.banner = `Wave ${nextWave} in ${seconds}. The gate is open.`;
        this.bannerT = this.between;
      }
      if (this.between <= 0) {
        this.wave += 1;
        this.phase = "play";
        this.spawnWave();
        if (this.wave % 10 === 0) {
          this.banner = "";
          this.bannerT = 0;
        }
        result.waveStarted = this.wave;
      }
      return result;
    }

    this.hurtThisTick = false;
    this.tickTimers(dt);
    this.applyIntent(intent, dt);
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
    this.tickAuras(dt);
    this.tickEnemies(dt, result);
    this.tickShots(dt, result);
    this.resolveDeaths(result);
    this.separateEnemies();
    this.clampBodies();
    if (intent.lootId !== null) this.takeDrop(intent.lootId);
    this.collectGold();
    if (this.hurtThisTick) this.breakChannel();
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.phase = "dead";
      result.died = true;
    }
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
    for (let i = 0; i < 3; i++) p.skillCd[i] = Math.max(0, p.skillCd[i]! - dt);
    p.buffs = p.buffs.filter((buff) => {
      buff.t -= dt;
      return buff.t > 0;
    });
    p.hp = Math.min(this.derived.life, p.hp + this.derived.lifeRegen * dt);
    p.mana = Math.min(this.derived.mana, p.mana + this.derived.manaRegen * dt);
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
    const stick = Math.hypot(intent.moveX, intent.moveY);
    let vx = 0;
    let vy = 0;
    if (stick > 0.18) {
      p.dest = null;
      p.aimId = null;
      vx = intent.moveX / stick;
      vy = intent.moveY / stick;
      if (stick > 0.55 && p.channel) this.breakChannel();
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
    if (p.attackCd > 0 || p.channel) return;
    const style = this.derived.weaponStyle;
    const range = this.derived.weaponRange;
    const target = this.nearestEnemy(range, style === "melee" && !anyFacing);
    if (!target && style === "melee") return;
    if (!target && style !== "melee" && p.aimId === null) return;
    if (target) p.facing = Math.atan2(target.y - p.y, target.x - p.x);
    p.attackCd = this.derived.attackPeriod;
    p.swing = 0.16;
    if (style === "melee") {
      this.burst("slash", "#e7c39a", 1);
      if (target) this.hitEnemy(target, this.rollWeapon(), false, 0, result);
    } else {
      const damage = style === "focus" ? this.rollSpell(1) : this.rollWeapon();
      this.fire(p.facing, 0, 1, damage, style === "focus" ? "#c9b6ff" : "#f0e2c4", 0, false, range, style === "focus" ? "spark" : "arrow");
      this.burst(style === "focus" ? "arcane" : "slash", style === "focus" ? "#c9b6ff" : "#f0e2c4", 0.7);
    }
  }

  private trySkill(index: 0 | 1 | 2, result: TickResult): void {
    const id = this.character.slotted[index];
    if (!id) return;
    const rank = this.character.skillRanks[id] ?? 0;
    const spec = scaledActive(id, rank);
    if (!spec) return;
    if (spec.kind === "aura") {
      this.player.auras[index] = !this.player.auras[index];
      if (this.player.auras[index] && this.player.mana <= 1) {
        this.player.auras[index] = false;
        this.float(this.player.x, this.player.y - 28, "No mana", "#9ebed0");
        return;
      }
      this.recompute();
      this.burst("ward", spec.color, 1.1);
      return;
    }
    if (this.player.skillCd[index] > 0) return;
    if (this.player.mana < spec.mana) {
      this.float(this.player.x, this.player.y - 28, "No mana", "#9ebed0");
      return;
    }
    this.player.mana -= spec.mana;
    const cdr = clamp(this.mods.cdr + gearNumber(this.character, "cdr"), 0, 0.4);
    this.player.skillCd[index] = spec.cooldown * (1 - cdr);
    this.breakChannel();
    this.player.swing = 0.18;
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
    this.cast(spec, result);
  }

  private cast(spec: ActiveSpec, result: TickResult): void {
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
          this.hitEnemy(enemy, this.rollScaled(spec), spec.bleed > 0, spec.burn, result, spec.stun, spec.slow, spec.slowDur, critAdd);
        }
      }
      return;
    }
    if (spec.kind === "melee" || spec.kind === "arc") {
      const arc = spec.kind === "melee" ? 0.7 : spec.arc;
      let hits = 0;
      for (const enemy of this.enemies) {
        if (!this.inArc(enemy, spec.range, arc)) continue;
        this.hitEnemy(enemy, this.rollScaled(spec), spec.bleed > 0, spec.burn, result, spec.stun, spec.slow, spec.slowDur);
        hits += 1;
      }
      if (hits === 0 && spec.kind === "melee") {
        const target = this.nearestEnemy(spec.range, false);
        if (target) this.hitEnemy(target, this.rollScaled(spec), spec.bleed > 0, spec.burn, result, spec.stun, spec.slow, spec.slowDur);
      }
      return;
    }
    if (spec.kind === "nova") {
      for (const enemy of this.enemies) {
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= spec.range) {
          this.hitEnemy(enemy, this.rollScaled(spec), false, spec.burn, result, spec.stun, spec.slow, spec.slowDur);
        }
      }
      return;
    }
    if (spec.kind === "projectile") {
      const damage = this.rollScaled(spec) * (spec.scaling === "melee" ? 1 + this.mods.projectileMult : 1);
      const style = spec.burn > 0 ? "fire" : spec.scaling === "spell" ? "spark" : "knife";
      this.fire(p.facing, spec.shots, spec.shots, damage, spec.color, spec.burn, spec.radial, spec.range, style);
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
      });
    }
  }

  private tickChannel(dt: number): void {
    const channel = this.player.channel;
    if (!channel) return;
    const rate = channel.healFrac / channel.total;
    this.player.hp = Math.min(this.derived.life, this.player.hp + this.derived.life * rate * dt);
    if (channel.restoreMana) {
      this.player.mana = Math.min(this.derived.mana, this.player.mana + this.derived.mana * 0.18 * dt);
    }
    channel.t -= dt;
    if (channel.t <= 0) this.player.channel = null;
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
      const spec = scaledActive(id, this.character.skillRanks[id] ?? 0);
      if (!spec || spec.kind !== "aura") {
        this.player.auras[i] = false;
        continue;
      }
      drain += spec.manaPerSec;
    }
    if (drain <= 0) return;
    this.player.mana -= drain * dt;
    if (this.player.mana <= 0) {
      this.player.mana = 0;
      this.player.auras = [false, false, false];
      this.recompute();
      this.float(this.player.x, this.player.y - 24, "Aura fades", "#9ebed0");
    }
  }

  private tickEnemies(dt: number, result: TickResult): void {
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
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const slowMul = enemy.slow > 0 ? 0.55 : 1;
      if (enemy.kind === "brute" && enemy.telegraph > 0) {
        enemy.telegraph -= dt;
        if (enemy.telegraph <= 0) {
          if (dist < enemy.radius + 62) this.hurtPlayer(enemy.damage * 1.35, enemy.level, enemy, result);
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
      if (enemy.kind === "brute") {
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
        });
        enemy.cd = enemy.maxCd;
        continue;
      }
      this.hurtPlayer(enemy.damage, enemy.level, enemy, result);
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
          this.hurtPlayer(shot.damage, this.wave, null, result);
          shot.life = 0;
        }
        continue;
      }
      for (const enemy of this.enemies) {
        if (shot.hit.includes(enemy.id)) continue;
        if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) <= enemy.radius + shot.radius) {
          this.hitEnemy(enemy, shot.damage, shot.bleed, shot.burn, result);
          shot.hit.push(enemy.id);
          if (!shot.pierce) shot.life = 0;
          break;
        }
      }
    }
    this.shots = this.shots.filter((shot) => shot.life > 0);
  }

  private hurtPlayer(amount: number, sourceLevel: number, attacker: Enemy | null, result: TickResult): void {
    if (this.iframeLeft() > 0) return;
    if (this.rng() < this.derived.evasion) {
      this.float(this.player.x, this.player.y - 20, "evade", "#c8d5cf");
      return;
    }
    let damage = mitigate(amount, this.derived.armor, sourceLevel, this.derived.damageReduction);
    if (this.player.shield > 0) {
      const absorbed = Math.min(this.player.shield, damage);
      this.player.shield -= absorbed;
      damage -= absorbed;
    }
    if (damage <= 0) return;
    this.player.hp -= damage;
    this.hurtThisTick = true;
    result.playerHit = true;
    this.float(this.player.x, this.player.y - 22, `${Math.round(damage)}`, "#e15a4a");
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
  ): void {
    if (this.rng() > hitChance(this.derived.attackRating, enemy.defense)) {
      this.float(enemy.x, enemy.y - 18, "miss", "#b7b1a8");
      return;
    }
    let damage = raw;
    const critChance = clamp(this.derived.crit + critAdd + this.player.buffs.reduce((sum, buff) => sum + buff.critAdd, 0), 0, 0.85);
    let crit = false;
    if (this.rng() < critChance) {
      damage *= 1.65;
      crit = true;
    }
    damage = mitigate(damage, enemy.armor, this.character.level, 0);
    enemy.hp -= damage;
    enemy.flash = 0.12;
    result.enemyHit = true;
    const tint = burn > 0 ? "#ff8a3d" : forceBleed ? "#e15b4c" : slow > 0 ? "#8ec8ff" : stun > 0 ? "#ffe0a0" : crit ? "#ffd27a" : "#f4efe6";
    this.float(enemy.x, enemy.y - enemy.radius - 8, `${Math.round(damage)}`, tint);
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
        this.placeItem(enemy.x + 18, enemy.y, starterBlade(`item-${this.nextUid++}`));
      } else if (this.rng() < 0.22) {
        this.placeItem(enemy.x + 16, enemy.y + 10, rollItem(this.rng, this.wave, `item-${this.nextUid++}`, this.character.level));
      }
      if (this.rng() < 0.06) {
        this.placeItem(enemy.x - 14, enemy.y + 8, rollGem(this.rng, `gem-${this.nextUid++}`));
      }
      const ranks = gain.levels + gain.paragons;
      if (ranks > 0) {
        this.recompute();
        this.player.hp = Math.min(this.derived.life, this.player.hp + this.derived.life * 0.28 * ranks);
        this.player.mana = Math.min(this.derived.mana, this.player.mana + this.derived.mana * 0.28 * ranks);
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
    this.enemies = living;
    if (this.enemies.length === 0 && this.phase === "play") {
      this.phase = "between";
      const nextWave = this.wave + 1;
      const gate = nextWave % 10 === 0;
      this.between = gate ? 10 : 2.2;
      this.banner = gate
        ? `Wave ${nextWave} in 10. The gate is open.`
        : this.wave % 5 === 0
          ? "The champion falls."
          : "The ward is quiet… more are coming.";
      this.bannerT = this.between;
    }
  }

  private placeItem(x: number, y: number, item: ReturnType<typeof starterBlade>): void {
    this.itemStore.set(item.uid, item);
    this.drops.push({ id: this.nextDrop++, x, y, gold: 0, itemUid: item.uid });
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

  private spawnWave(): void {
    this.enemies = [];
    this.shots = [];
    const plan = wavePlan(this.wave);
    plan.forEach((kind, index) => {
      const angle = (index / plan.length) * Math.PI * 2 + this.rng() * 0.15;
      const x = clamp(ARENA.width / 2 + Math.cos(angle) * ARENA.width * 0.36, ARENA.margin, ARENA.width - ARENA.margin);
      const y = clamp(ARENA.height / 2 + Math.sin(angle) * ARENA.height * 0.34, ARENA.margin, ARENA.height - ARENA.margin);
      this.enemies.push(makeEnemy(kind, this.wave, x, y, this.nextEnemy++));
    });
    this.banner = this.wave % 5 === 0 ? `Wave ${this.wave} — a champion enters` : `Wave ${this.wave}`;
    this.bannerT = 2.4;
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
