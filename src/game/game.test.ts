import { describe, expect, it } from "vitest";
import { canSpendSkill, createCharacter, grantXp, retrain, slotSkill, spendSkill, spendStat } from "./character";
import { attributes, derive, hitChance, mitigate, xpToNext } from "./formulas";
import { liveItem, rollSocketCount, socketCap } from "./itemstats";
import { addMaterial, equipChoices, equipItem, isSignatureAffix, materialCount, rollGem, rollItem, rollRarity, rolledAffixAmount, salvageCount, salvageItem, socketGem, starterBlade, tryAddItem, uniqueRoster, upgradeItem } from "./items";
import { RACES, raceArmorPct, raceAttrs, raceGearArmorMul, raceInnateArmor, raceWeaponSlots } from "./races";
import { deserialize, nameSlot, readSlots, serialize, writeSave, writeSlot } from "./save";
import { ACTIVES, PASSIVE_PER_RANK, SECTORS, SKILL_DPS_TARGET, SKILL_SYNERGIES, activeBaseDps, scaledActive, skillById, SKILLS, synergyPower } from "./skills";
import { emptyIntent, makeEnemy, Sim } from "./sim";
import { mainPathMinutes, toughnessFor, walkSeconds, worldPacks } from "./world";
import { BASE_ATTR, STAT_POINTS_PER_LEVEL, type Attr } from "./types";
import {
  RESIST_FLOOR,
  WEAK_CEILING,
  WAVE1_KINDS,
  assertCombatBans,
  creatureTypesCovered,
  damageTakenMul,
  monsterOf,
} from "./monsters";
import { weaponProfile } from "./weapons";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => data.set(key, value),
  };
}

describe("levels and attributes", () => {
  it("grants five attribute points and one skill point per level", () => {
    const hero = createCharacter();
    expect(hero.unspentStats).toBe(0);
    expect(hero.unspentSkills).toBe(0);
    const gained = grantXp(hero, xpToNext(1));
    expect(gained.levels).toBe(1);
    expect(gained.paragons).toBe(0);
    expect(hero.level).toBe(2);
    expect(hero.unspentStats).toBe(STAT_POINTS_PER_LEVEL);
    expect(hero.unspentSkills).toBe(1);
  });

  it("stops at level 100, then gives one attribute point per paragon and a skill point every five", () => {
    const hero = createCharacter();
    hero.level = 100;
    const first = grantXp(hero, xpToNext(100));
    expect(first.levels).toBe(0);
    expect(first.paragons).toBe(1);
    expect(hero.paragon).toBe(1);
    expect(hero.unspentStats).toBe(1);
    expect(hero.unspentSkills).toBe(0);
    hero.paragon = 4;
    hero.unspentStats = 0;
    hero.xp = 0;
    const fifth = grantXp(hero, xpToNext(104));
    expect(fifth.paragons).toBe(1);
    expect(hero.paragon).toBe(5);
    expect(hero.unspentStats).toBe(1);
    expect(hero.unspentSkills).toBe(1);
    hero.paragon = 200;
    hero.xp = 0;
    const stopped = grantXp(hero, 1_000_000);
    expect(stopped.paragons).toBe(0);
    expect(hero.paragon).toBe(200);
  });

  it("turns stamina into life and strength into melee damage", () => {
    const plain = createCharacter();
    const hearty = createCharacter();
    hearty.unspentStats = 3;
    spendStat(hearty, "stamina");
    spendStat(hearty, "stamina");
    spendStat(hearty, "stamina");
    expect(derive(hearty).life).toBe(derive(plain).life + 3);
    expect(derive(hearty).armor).toBeGreaterThan(derive(plain).armor);
    const strong = createCharacter();
    strong.unspentStats = 5;
    for (let i = 0; i < 5; i++) spendStat(strong, "strength");
    expect(derive(strong).meleeMax).toBeGreaterThan(derive(plain).meleeMax);
  });

  it("keeps a channel through movement and ordinary hits, and drops it on a slam", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    sim.player.channel = { slot: 0, t: 2, total: 2, healFrac: 0.2, restoreEnergy: false };
    const walking = emptyIntent();
    walking.moveX = 1;
    sim.update(walking, 0.1);
    expect(sim.player.channel).not.toBeNull();
    const hound = makeEnemy("hound", 1, sim.player.x + 30, sim.player.y, 70);
    hound.cd = 0;
    sim.enemies = [hound];
    sim.player.channel = { slot: 0, t: 2, total: 2, healFrac: 0.2, restoreEnergy: false };
    sim.update(emptyIntent(), 0.05);
    expect(sim.player.channel).not.toBeNull();
    const brute = makeEnemy("brute", 1, sim.player.x + 40, sim.player.y, 71);
    brute.telegraph = 0.01;
    brute.cd = 0;
    sim.enemies = [brute];
    sim.player.hp = sim.derived.life;
    sim.derived.evasion = 0;
    sim.update(emptyIntent(), 0.05);
    expect(sim.player.channel).toBeNull();
    expect(Math.hypot(sim.player.x - brute.x, sim.player.y - brute.y)).toBeGreaterThan(40);
  });

  it("places a unique 1-rank capstone on ring 7 of each cone", () => {
    const caps = SKILLS.filter((skill) => skill.kind === "capstone");
    expect(caps.length).toBe(7);
    for (const skill of caps) {
      expect(skill.ring).toBe(7);
      expect(skill.maxRank).toBe(1);
      expect(skill.requires.length + skill.requiresAny.length).toBeGreaterThan(0);
    }
  });

  it("keeps prerequisites strictly forward on the wheel", () => {
    for (const skill of SKILLS) {
      for (const req of [...skill.requires, ...skill.requiresAny]) {
        const feeder = skillById(req)!;
        expect(feeder.radius).toBeLessThan(skill.radius);
      }
    }
  });

  it("spreads the wheel across seven damage-pair cones", () => {
    const sectors = new Set(SKILLS.map((skill) => skill.sector));
    expect(sectors.size).toBe(7);
    expect(Object.keys(SECTORS).sort()).toEqual(["air", "bleed", "fire", "holy", "poison", "unholy", "water"].sort());
  });

  it("heals one health each second per level, plus one for every ten stamina", () => {
    const hero = createCharacter();
    // Human starts with +2 stamina → 12 total, so regen is 1 + 1.2.
    expect(derive(hero).lifeRegen).toBeCloseTo(2.2);
    hero.level = 8;
    hero.unspentStats = 20;
    for (let i = 0; i < 20; i++) spendStat(hero, "stamina");
    expect(derive(hero).lifeRegen).toBeCloseTo(11.2);
  });

  it("reduces damage with armor, with a hard floor", () => {
    const open = mitigate(100, 0, 5);
    const mid = mitigate(100, 80, 5);
    const plated = mitigate(100, 800, 5);
    expect(open).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(plated);
    expect(plated).toBeGreaterThan(25);
  });

  it("raises hit chance with attack rating", () => {
    expect(hitChance(100, 20)).toBeGreaterThan(hitChance(20, 100));
  });
});

describe("skill wheel", () => {
  it("keeps every node wired to a real effect", () => {
    const ids = SKILLS.map((skill) => skill.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const skill of SKILLS) {
      for (const req of [...skill.requires, ...skill.requiresAny]) {
        expect(ids).toContain(req);
      }
      const passive = PASSIVE_PER_RANK[skill.id];
      const active = ACTIVES[skill.id];
      expect(passive || active, skill.id).toBeTruthy();
    }
  });

  it("opens the inner path at level 1 and gates keys by prerequisites only", () => {
    const hero = createCharacter();
    hero.unspentSkills = 3;
    expect(canSpendSkill(hero, "iron-oath").ok).toBe(true);
    expect(spendSkill(hero, "iron-oath")).toBe(true);
    grantXp(hero, xpToNext(1));
    hero.unspentSkills = Math.max(hero.unspentSkills, 2);
    expect(spendSkill(hero, "braced-guard")).toBe(true);
    expect(slotSkill(hero, "iron-oath", 0)).toMatch(/always on/i);

    hero.level = 6;
    hero.unspentSkills = 2;
    expect(spendSkill(hero, "bastion")).toBe(true);
    const fresh = createCharacter();
    fresh.level = 6;
    fresh.unspentSkills = 5;
    fresh.skillRanks = { "iron-oath": 1 };
    expect(canSpendSkill(fresh, "bastion").ok).toBe(false);
  });

  it("refunds the build on retrain and keeps the first one free", () => {
    const hero = createCharacter();
    hero.level = 3;
    hero.unspentStats = 10;
    hero.unspentSkills = 2;
    spendStat(hero, "spirit");
    spendSkill(hero, "first-rite");
    expect(retrain(hero)).toBe(true);
    expect(hero.spent.spirit).toBe(0);
    expect(hero.skillRanks["first-rite"]).toBeUndefined();
    expect(hero.unspentStats).toBe(10);
    expect(hero.unspentSkills).toBe(2);
    expect(hero.gold).toBe(0);
  });
});

describe("gear and saving", () => {
  it("refuses a weapon the attributes cannot hold", () => {
    const hero = createCharacter();
    const blade = starterBlade("heavy");
    blade.reqStr = 40;
    expect(tryAddItem(hero, blade)).toBe(true);
    expect(equipItem(hero, blade.uid)).toMatch(/requirement/i);
    const worn = starterBlade("worn");
    expect(tryAddItem(hero, worn)).toBe(true);
    expect(equipItem(hero, worn.uid)).toBeNull();
    expect(derive(hero).meleeMax).toBeGreaterThan(derive(createCharacter()).meleeMax);
  });

  it("round-trips a save", () => {
    const hero = createCharacter();
    grantXp(hero, 80);
    const sim = new Sim(hero, 3);
    sim.player.x = 400;
    sim.wave = 4;
    const restored = deserialize(serialize(sim.toSnapshot()));
    expect(restored).not.toBeNull();
    expect(restored?.character.level).toBe(hero.level);
    expect(restored?.wave).toBe(4);
    expect(restored?.character.name).toBe("Exile");
  });

  it("applies each race’s attribute deltas on top of base", () => {
    const attrs: Attr[] = ["strength", "agility", "stamina", "luck", "spirit"];
    expect(RACES).toHaveLength(8);
    for (const race of RACES) {
      const hero = createCharacter("Exile", race.id);
      const totals = attributes(hero);
      const mods = raceAttrs(race.id);
      for (const attr of attrs) {
        expect(totals[attr]).toBe(BASE_ATTR + mods[attr]);
      }
    }
    const human = attributes(createCharacter("Exile", "human"));
    expect(human.strength).toBe(BASE_ATTR + 2);
    expect(human.agility).toBe(BASE_ATTR - 1);
    expect(human.stamina).toBe(BASE_ATTR + 2);
    expect(human.spirit).toBe(BASE_ATTR - 1);
  });

  it("migrates missing race to human and round-trips a chosen race", () => {
    const elf = createCharacter("Thorn", "elf");
    const sim = new Sim(elf, 1);
    sim.wave = 2;
    const restored = deserialize(serialize(sim.toSnapshot()));
    expect(restored?.character.race).toBe("elf");
    expect(restored?.character.name).toBe("Thorn");
    const bare = JSON.parse(serialize(sim.toSnapshot())) as Record<string, unknown>;
    const character = bare.character as Record<string, unknown>;
    delete character.race;
    const migrated = deserialize(JSON.stringify(bare));
    expect(migrated?.character.race).toBe("human");
    character.race = "dragon";
    const bad = deserialize(JSON.stringify(bare));
    expect(bad?.character.race).toBe("human");
  });

  it("dual wields a second one-hand blade at half damage and keeps off-hand attributes", () => {
    const hero = createCharacter("Ash", "human");
    hero.spent.strength = 20;
    const main = starterBlade("main");
    const off = starterBlade("off");
    off.damageMin = 10;
    off.damageMax = 10;
    off.affixes = [{ key: "strength", value: 5, label: "+5 Strength" }];
    expect(tryAddItem(hero, main)).toBe(true);
    expect(equipItem(hero, main.uid)).toBeNull();
    expect(tryAddItem(hero, off)).toBe(true);
    expect(equipItem(hero, off.uid)).toBeNull();
    expect(hero.equipment.offhand?.uid).toBe("off");
    const withOff = derive(hero);
    const offPiece = hero.equipment.offhand;
    hero.equipment.offhand = null;
    const without = derive(hero);
    hero.equipment.offhand = offPiece;
    expect(withOff.strength).toBe(without.strength + 5);
    expect(withOff.meleeMax).toBeGreaterThan(without.meleeMax);
  });

  it("lets minotaurs Bull Grip a two-hander with an off-hand", () => {
    const bull = createCharacter("Horn", "minotaur");
    bull.spent.strength = 30;
    const two = starterBlade("maul");
    two.name = "Oak Maul";
    two.hands = 2;
    two.damageMin = 12;
    two.damageMax = 18;
    const off = starterBlade("side");
    expect(tryAddItem(bull, two)).toBe(true);
    expect(equipItem(bull, two.uid)).toBeNull();
    expect(tryAddItem(bull, off)).toBe(true);
    expect(equipItem(bull, off.uid)).toBeNull();
    expect(bull.equipment.weapon?.hands).toBe(2);
    expect(bull.equipment.offhand?.uid).toBe("side");
    const human = createCharacter("Soft", "human");
    human.spent.strength = 30;
    expect(tryAddItem(human, { ...two, uid: "maul2" })).toBe(true);
    expect(equipItem(human, "maul2")).toBeNull();
    expect(tryAddItem(human, { ...off, uid: "side2" })).toBe(true);
    const blocked = equipItem(human, "side2");
    expect(blocked).toMatch(/two-handed|Bull Grip|off-hand/i);
    expect(human.equipment.weapon?.uid).toBe("maul2");
  });

  it("flags elite aggro and unique finds for voice cues", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    const elite = makeEnemy("brute", 5, sim.player.x + 40, sim.player.y, 99);
    elite.elite = true;
    elite.pack = "boss-pack";
    elite.anchorX = elite.x;
    elite.anchorY = elite.y;
    elite.sight = 200;
    elite.aggro = false;
    sim.enemies = [elite];
    const result = sim.update(emptyIntent(), 0.2);
    expect(elite.aggro).toBe(true);
    expect(result.eliteAggro).toBe(true);
  });

  it("keeps three named slots and folds the old save into the first", () => {
    const storage = memoryStorage();
    const hero = createCharacter();
    hero.level = 6;
    const sim = new Sim(hero, 1);
    sim.wave = 8;
    writeSave(storage, sim.toSnapshot());
    const migrated = readSlots(storage);
    expect(migrated).toHaveLength(3);
    expect(migrated[0]?.save?.character.level).toBe(6);
    expect(migrated[0]?.save?.wave).toBe(8);
    expect(migrated[1]?.save).toBeNull();
    expect(migrated[2]?.save).toBeNull();
    nameSlot(storage, 1, "  Ash  ");
    const named = createCharacter("Mara");
    const next = new Sim(named, 2);
    next.wave = 3;
    writeSlot(storage, 2, next.toSnapshot());
    const slots = readSlots(storage);
    expect(slots[1]?.name).toBe("Ash");
    expect(slots[1]?.save).toBeNull();
    expect(slots[2]?.name).toBe("Mara");
    expect(slots[2]?.save?.wave).toBe(3);
    expect(slots[0]?.save?.character.level).toBe(6);
  });
});

describe("the ward", () => {
  it("lays a road of ten levels, each a few minutes on the main path", () => {
    const packs = worldPacks();
    const mains = packs.filter((pack) => !pack.branch);
    expect(new Set(mains.map((pack) => pack.level)).size).toBe(10);
    expect(packs.some((pack) => pack.branch)).toBe(true);
    for (const pack of packs) {
      expect(pack.size).toBeGreaterThanOrEqual(5);
      expect(pack.size).toBeLessThanOrEqual(20);
    }
    for (let level = 1; level <= 10; level++) {
      const spec = mains.filter((pack) => pack.level === level);
      expect(spec.length).toBeGreaterThanOrEqual(6);
      expect(mainPathMinutes(level)).toBeGreaterThanOrEqual(5);
      expect(mainPathMinutes(level)).toBeLessThanOrEqual(10);
      expect(walkSeconds(level)).toBeLessThan(90);
      expect(toughnessFor(level, spec.length, spec[0]!.size)).toBeLessThan(4);
    }
    expect(mains.filter((pack) => pack.level === 5 && pack.boss)).toHaveLength(1);
    expect(mains.filter((pack) => pack.level === 10 && pack.boss).length).toBeGreaterThan(0);
    const order = [...new Set(mains.map((pack) => pack.y))];
    const sorted = [...order].sort((a, b) => b - a);
    expect(order).toEqual(sorted);
  });

  it("aggros a pack in sight and drops it when you leave", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    // Stay clear of road packs — plant a lone scout outside starting sight.
    sim.player.x = 200;
    sim.player.y = 200;
    const enemy = makeEnemy("hound", 1, 900, 900, 40);
    enemy.pack = "scout-pack";
    enemy.homeX = 900;
    enemy.homeY = 900;
    enemy.anchorX = 900;
    enemy.anchorY = 900;
    sim.enemies = [enemy];
    expect(enemy.aggro).toBe(false);
    const homeX = enemy.x;
    const homeY = enemy.y;
    sim.update(emptyIntent(), 1);
    expect(enemy.aggro).toBe(false);
    expect(Math.hypot(enemy.x - homeX, enemy.y - homeY)).toBeLessThan(40);
    sim.player.x = enemy.x + enemy.sight - 20;
    sim.player.y = enemy.y;
    sim.update(emptyIntent(), 0.4);
    expect(enemy.aggro).toBe(true);
    const pulled = enemy.x;
    sim.update(emptyIntent(), 0.8);
    expect(Math.abs(enemy.x - pulled)).toBeGreaterThan(5);
    sim.player.x = enemy.anchorX;
    sim.player.y = enemy.anchorY + 900;
    sim.update(emptyIntent(), 0.3);
    expect(enemy.aggro).toBe(false);
  });

  it("regenerates in town without filling life", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    sim.player.hp = 10;
    sim.rest(1);
    expect(sim.player.hp).toBeCloseTo(10 + sim.derived.lifeRegen);
    expect(sim.player.hp).toBeLessThan(sim.derived.life);
  });

  it("casts an interruptible three-second town portal", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    expect(sim.startPortal()).toBeNull();
    expect(sim.player.portal?.total).toBe(3);
    const mid = sim.update(emptyIntent(), 1);
    expect(mid.townReady).toBe(false);
    expect(sim.player.portal).not.toBeNull();
    const move = emptyIntent();
    move.moveX = 1;
    const broken = sim.update(move, 0.1);
    expect(broken.portalInterrupted).toBe(true);
    expect(sim.player.portal).toBeNull();
    expect(sim.startPortal()).toBeNull();
    const done = sim.update(emptyIntent(), 3.1);
    expect(done.townReady).toBe(true);
    expect(sim.player.portal).toBeNull();
  });

  it("scales hounds as the road goes on", () => {
    expect(makeEnemy("hound", 4, 0, 0, 1).maxHp).toBeGreaterThan(makeEnemy("hound", 1, 0, 0, 2).maxHp);
    expect(makeEnemy("hound", 1, 0, 0, 1).maxHp).toBeLessThan(28);
    expect(makeEnemy("hound", 1, 0, 0, 1).damage).toBeLessThan(7);
    expect(makeEnemy("hound", 6, 0, 0, 3).maxHp).toBe(Math.round(28 * (1 + 5 * 0.16)));
  });

  it("rolls attributes at half the previous value", () => {
    expect(rolledAffixAmount("strength", 3, 2)).toBe(3);
    expect(rolledAffixAmount("spirit", 3, 1.5)).toBe(2);
    expect(rolledAffixAmount("life", 14, 2)).toBe(28);
  });

  it("swings on its own when standing in weapon range", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    const hound = makeEnemy("hound", 1, sim.player.x + 36, sim.player.y, 50);
    sim.enemies = [hound];
    const before = hound.hp;
    let marked = false;
    for (let i = 0; i < 40; i++) {
      sim.update(emptyIntent(), 0.1);
      if (sim.bursts.some((burst) => burst.kind === "slash")) marked = true;
    }
    expect(sim.killedTotal > 0 || hound.hp < before).toBe(true);
    expect(marked).toBe(true);
  });

  it("does not swing while you are moving or the foe is out of reach", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    const near = makeEnemy("hound", 1, sim.player.x + 36, sim.player.y, 51);
    sim.enemies = [near];
    const before = near.hp;
    for (let i = 0; i < 8; i++) {
      const intent = emptyIntent();
      intent.moveX = 1;
      sim.update(intent, 0.05);
    }
    expect(near.hp).toBe(before);
    const far = new Sim(createCharacter(), 2);
    far.begin();
    const out = makeEnemy("hound", 1, far.player.x + 500, far.player.y, 52);
    far.enemies = [out];
    const farHp = out.hp;
    for (let i = 0; i < 20; i++) far.update(emptyIntent(), 0.1);
    expect(out.hp).toBe(farHp);
    expect(far.killedTotal).toBe(0);
  });

  it("gives ethereal gear ten percent more damage or defence", () => {
    const blade = starterBlade("ghost");
    blade.ethereal = true;
    blade.damageMin = 10;
    blade.damageMax = 20;
    const live = liveItem(blade, 1);
    expect(live.damageMin).toBe(11);
    expect(live.damageMax).toBe(22);
    const coat = starterBlade("coat");
    coat.slot = "chest";
    coat.armorType = "cloth";
    coat.ethereal = true;
    coat.damageMin = 0;
    coat.damageMax = 0;
    coat.armor = 10;
    expect(liveItem(coat, 1).armor).toBe(11);
  });

  it("scales rainbow gear to the current level, then applies ethereal", () => {
    const blade = starterBlade("rainbow");
    blade.rarity = "rainbow";
    blade.bornLevel = 10;
    blade.ethereal = true;
    blade.damageMin = 10;
    blade.damageMax = 10;
    expect(liveItem(blade, 20).damageMin).toBe(22);
  });

  it("rolls gem sockets the Diablo 2 way, and only on weapons, helms, and chests", () => {
    expect(socketCap("ring", null, "melee", 50)).toBe(0);
    expect(socketCap("belt", "plate", "melee", 50)).toBe(0);
    expect(socketCap("gloves", "leather", "melee", 50)).toBe(0);
    expect(socketCap("boots", "mail", "melee", 50)).toBe(0);
    expect(socketCap("neck", null, "melee", 50)).toBe(0);
    expect(socketCap("chest", "plate", "melee", 10)).toBe(3);
    expect(socketCap("chest", "plate", "melee", 50)).toBe(4);
    expect(socketCap("head", "cloth", "melee", 50)).toBe(1);
    expect(rollSocketCount(() => 0, "white", 3)).toBe(0);
    expect(rollSocketCount(() => 0.99, "white", 3)).toBe(3);
    expect(rollSocketCount(() => 0, "purple", 4)).toBe(0);
    expect(rollSocketCount(() => 0, "orange", 4)).toBe(0);
    expect(rollSocketCount(() => 0, "red", 4)).toBe(0);
  });

  it("gives each gold unique four affixes, with one or two that never roll on other gear", () => {
    const roster = uniqueRoster();
    expect(roster.length).toBeGreaterThan(0);
    for (const unique of roster) {
      expect(unique.affixes).toHaveLength(4);
      const signatures = unique.affixes.filter((affix) => isSignatureAffix(affix.key));
      expect(signatures.length === 1 || signatures.length === 2).toBe(true);
    }
    const hero = createCharacter();
    hero.equipment.chest = {
      ...starterBlade("hauberk"),
      slot: "chest",
      rarity: "gold",
      uniqueId: "ward-hauberk",
      armorType: "mail",
      armor: 30,
      damageMin: 0,
      damageMax: 0,
      affixes: uniqueRoster().find((entry) => entry.id === "ward-hauberk")!.affixes,
    };
    expect(derive(hero).thorns).toBe(5);
    expect(derive(hero).damageReduction).toBeCloseTo(0.06);
  });

  it("caps ranked skills at 20 and keeps the per-rank scaling", () => {
    for (const skill of SKILLS) {
      if (skill.kind === "capstone") expect(skill.maxRank).toBe(1);
      else expect(skill.maxRank).toBe(20);
    }
    const base = ACTIVES["heavy-blow"]!;
    expect(scaledActive("heavy-blow", 20)?.mult).toBeCloseTo(base.mult * (1 + 0.12 * 19));
    // Cooldown is a DPS pacing constant only — ranks cut energy cost, not time.
    expect(scaledActive("heavy-blow", 20)!.cooldown).toBe(base.cooldown);
    expect(scaledActive("heavy-blow", 20)!.energyCost).toBeLessThan(base.energyCost);
  });

  it("balances damaging actives to the same base DPS before cooldown modifiers", () => {
    for (const [id, spec] of Object.entries(ACTIVES)) {
      const dps = activeBaseDps(spec);
      if (dps === null) continue;
      expect(dps, id).toBeCloseTo(SKILL_DPS_TARGET, 2);
    }
  });

  it("gives one life per endurance and five life per level, and energy from spirit", () => {
    const hero = createCharacter();
    hero.level = 4;
    hero.spent.stamina = 10;
    hero.spent.spirit = 20;
    const stats = derive(hero);
    // Human: +2 stamina, −1 spirit on top of base 10.
    expect(stats.life).toBe(4 * 5 + (10 + 10 + 2));
    // 24 + level*0.5 + spirit*0.4
    const spirit = 10 + 20 - 1;
    expect(stats.energy).toBe(Math.round(24 + 4 * 0.5 + spirit * 0.4));
  });

  it("raises a piece by one item level and spends that many materials", () => {
    const hero = createCharacter();
    const blade = starterBlade("up");
    blade.ilvl = 8;
    blade.damageMin = 8;
    blade.damageMax = 16;
    hero.equipment.weapon = blade;
    expect(upgradeItem(hero, blade.uid)).toContain("Cloth Weave");
    expect(upgradeItem(hero, blade.uid)).toContain("Weapon Steel");
    for (const id of ["weave", "hide", "rings", "plate", "steel"] as const) addMaterial(hero, id, 8);
    expect(upgradeItem(hero, blade.uid)).toBeNull();
    expect(blade.ilvl).toBe(9);
    expect(blade.damageMin).toBe(9);
    expect(blade.damageMax).toBe(18);
    expect(materialCount(hero, "steel")).toBe(0);
    const coat = starterBlade("coat");
    coat.slot = "chest";
    coat.armorType = "cloth";
    coat.damageMin = 0;
    coat.damageMax = 0;
    coat.armor = 10;
    coat.ilvl = 4;
    hero.inventory.push(coat);
    addMaterial(hero, "weave", 4);
    expect(upgradeItem(hero, coat.uid)).toBeNull();
    expect(coat.ilvl).toBe(5);
    expect(coat.armor).toBe(13);
    const band = starterBlade("band");
    band.slot = "ring";
    band.armorType = null;
    band.damageMin = 0;
    band.damageMax = 0;
    band.armor = 0;
    band.ilvl = 4;
    band.affixes = [{ key: "strength", value: 4, label: "+4 Strength" }];
    hero.equipment.ring1 = band;
    for (const id of ["weave", "hide", "rings", "plate", "steel", "dust"] as const) addMaterial(hero, id, 4);
    expect(upgradeItem(hero, band.uid)).toBeNull();
    expect(band.ilvl).toBe(5);
    expect(band.affixes[0]?.value).toBe(5);
    expect(materialCount(hero, "dust")).toBe(0);
    const stud = starterBlade("stud");
    stud.slot = "earring";
    stud.damageMin = 0;
    stud.damageMax = 0;
    stud.armor = 0;
    stud.ilvl = 2;
    hero.equipment.ear1 = stud;
    const short = upgradeItem(hero, stud.uid) ?? "";
    expect(short).toContain("2 Cloth Weave");
    expect(short).toContain("2 Jewel Dust");
  });

  it("stacks gems in their own pouch", () => {
    const hero = createCharacter();
    expect(tryAddItem(hero, rollGem(() => 0, "a"))).toBe(true);
    expect(tryAddItem(hero, rollGem(() => 0, "b"))).toBe(true);
    expect(hero.inventory).toHaveLength(0);
    expect(hero.gems).toEqual([{ kind: "ruby", quality: 1, count: 2 }]);
    const blade = starterBlade("socket");
    blade.sockets = 1;
    blade.gems = [null];
    hero.equipment.weapon = blade;
    expect(socketGem(hero, blade.uid, "ruby", 1)).toBeNull();
    expect(hero.gems[0]?.count).toBe(1);
    expect(blade.gems[0]).toEqual({ kind: "ruby", quality: 1 });
  });

  it("breaks an item into materials from its level and rarity", () => {
    const hero = createCharacter();
    const coat = starterBlade("scrap");
    coat.slot = "chest";
    coat.armorType = "mail";
    coat.rarity = "blue";
    coat.ilvl = 8;
    coat.damageMin = 0;
    coat.damageMax = 0;
    hero.inventory = [coat];
    expect(salvageCount(coat)).toBe(4);
    expect(salvageItem(hero, coat.uid)).toBeNull();
    expect(hero.inventory).toHaveLength(0);
    expect(materialCount(hero, "rings")).toBe(4);
  });

  it("keeps an old armor piece as a chest with a newer tier", () => {
    const hero = createCharacter();
    const file = {
      version: 1 as const,
      character: hero,
      wave: 2,
      hp: 20,
      energy: 10,
      x: 10,
      y: 10,
      starterGiven: true,
    };
    const raw = JSON.parse(serialize(file)) as { character: { equipment: Record<string, unknown> } };
    raw.character.equipment = {
      weapon: null,
      armor: { ...starterBlade("old"), slot: "armor", rarity: "rare", name: "Cairn Mail" },
      trinket: null,
    };
    const restored = deserialize(JSON.stringify(raw));
    expect(restored?.character.equipment.chest?.rarity).toBe("purple");
    expect(restored?.character.equipment.chest?.armorType).toBe("mail");
    expect(restored?.character.equipment.chest?.ethereal).toBe(false);
  });

  it("hurts an enemy held in melee range", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    const hound = makeEnemy("hound", 1, sim.player.x + 36, sim.player.y, 50);
    sim.enemies = [hound];
    const before = hound.hp;
    for (let i = 0; i < 50; i++) {
      const intent = emptyIntent();
      intent.attack = true;
      sim.update(intent, 0.1);
    }
    expect(sim.killedTotal > 0 || hound.hp < before).toBe(true);
  });

  it("gives each non-hub skill 1–4 earlier synergies that boost the result", () => {
    const hubs = new Set(SKILLS.filter((skill) => skill.hub).map((skill) => skill.id));
    for (const skill of SKILLS) {
      if (hubs.has(skill.id)) {
        expect(SKILL_SYNERGIES[skill.id] ?? []).toHaveLength(0);
        continue;
      }
      const links = SKILL_SYNERGIES[skill.id] ?? [];
      expect(links.length, skill.id).toBeGreaterThanOrEqual(1);
      expect(links.length, skill.id).toBeLessThanOrEqual(4);
      for (const link of links) {
        const feeder = skillById(link.from);
        expect(feeder, `${skill.id}←${link.from}`).toBeTruthy();
        expect(feeder!.radius).toBeLessThanOrEqual(skill.radius + 0.001);
      }
    }
    const bare = scaledActive("breaker", 5)!;
    const fed = scaledActive("breaker", 5, { "ruin-strike": 10, cleave: 10, "wrath-speed": 5, "heavy-blow": 10 })!;
    expect(fed.mult).toBeGreaterThan(bare.mult);
    expect(synergyPower("breaker", { "ruin-strike": 10, cleave: 10 })).toBeGreaterThan(0);
  });

  it("charges skill energy when attacks land", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    sim.player.energy = 0;
    const hound = makeEnemy("hound", 1, sim.player.x + 30, sim.player.y, 40);
    sim.enemies = [hound];
    const intent = emptyIntent();
    intent.attack = true;
    for (let i = 0; i < 20; i++) sim.update(intent, 0.1);
    expect(sim.player.energy).toBeGreaterThan(0);
  });

  it("does not refill energy from timed regen", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    sim.player.energy = 0;
    expect(sim.derived.energyRegen).toBe(0);
    sim.update(emptyIntent(), 2);
    expect(sim.player.energy).toBe(0);
    sim.rest(2);
    expect(sim.player.energy).toBe(0);
  });

  it("fills skillBank from basic hits and applies Luck gold/magic find", () => {
    const lucky = createCharacter();
    lucky.unspentStats = 20;
    for (let i = 0; i < 20; i++) spendStat(lucky, "luck");
    lucky.unspentSkills = 2;
    lucky.level = 2;
    expect(spendSkill(lucky, "blood-oath")).toBe(true);
    expect(spendSkill(lucky, "heavy-blow")).toBe(true);
    expect(slotSkill(lucky, "heavy-blow", 0)).toBeNull();
    const d = derive(lucky);
    expect(d.goldFind).toBeGreaterThan(0.2);
    expect(d.magicFind).toBeGreaterThan(0.15);

    const sim = new Sim(lucky, 1);
    sim.begin();
    sim.player.skillBank = [0, 0, 0];
    const hound = makeEnemy("hound", 1, sim.player.x + 30, sim.player.y, 40);
    sim.enemies = [hound];
    const intent = emptyIntent();
    intent.attack = true;
    for (let i = 0; i < 30; i++) sim.update(intent, 0.1);
    expect(sim.player.skillBank[0]!).toBeGreaterThan(0);

    // Magic find shifts rarity weights — high MF should not crash and should still roll.
    let blueOrBetter = 0;
    for (let i = 0; i < 80; i++) {
      const rarity = rollRarity(() => (i % 10) / 10, 12, d.magicFind);
      if (rarity !== "grey" && rarity !== "white") blueOrBetter++;
    }
    expect(blueOrBetter).toBeGreaterThan(0);
    const drop = rollItem(() => 0.5, 8, "mf-test", 8, d.magicFind);
    expect(drop).toBeTruthy();
  });

  it("offers choose-slot equip for rings and dual hands", () => {
    const hero = createCharacter();
    const ring = starterBlade("ring");
    ring.slot = "ring";
    ring.damageMin = 0;
    ring.damageMax = 0;
    ring.armor = 0;
    ring.affixes = [];
    const choices = equipChoices(hero, ring);
    expect(choices.map((c) => c.slot).sort()).toEqual(["ring1", "ring2"]);

    const blade = starterBlade("hand");
    blade.hands = 1;
    const hands = equipChoices(hero, blade);
    expect(hands.some((c) => c.slot === "weapon")).toBe(true);
    expect(hands.some((c) => c.slot === "offhand")).toBe(true);
  });

  it("gives weapon types distinct speed and reach", () => {
    const dagger = weaponProfile("dagger", 1);
    const maul = weaponProfile("mace", 2);
    expect(dagger.speed).toBeGreaterThan(maul.speed);
    expect(maul.reach).toBeGreaterThan(dagger.reach);
    const blade = starterBlade("typed");
    blade.weaponType = "dagger";
    blade.speed = dagger.speed;
    blade.swing = dagger.swing;
    blade.rangeBonus = 0;
    const hero = createCharacter();
    hero.equipment.weapon = blade;
    expect(derive(hero).weaponSwing).toBeCloseTo(dagger.swing);
  });

  it("lets insectoids wield four weapons with percent armor and thin gear plating", () => {
    expect(raceWeaponSlots("insectoid")).toBe(4);
    expect(raceInnateArmor("insectoid")).toBe(0);
    expect(raceArmorPct("insectoid")).toBeCloseTo(0.9);
    expect(raceGearArmorMul("insectoid")).toBeCloseTo(0.15);
    const bug = createCharacter("Chitin", "insectoid");
    const bare = derive(bug).armor;
    expect(bare).toBeGreaterThan(derive(createCharacter()).armor);
    const plate = starterBlade("shell");
    plate.slot = "chest";
    plate.armorType = "plate";
    plate.damageMin = 0;
    plate.damageMax = 0;
    plate.armor = 100;
    plate.affixes = [];
    bug.equipment.chest = plate;
    // Gear armor is thinned by gearArmorMul, then the whole pool takes racial armorPct.
    expect(derive(bug).armor).toBeCloseTo(bare + 15 * (1 + raceArmorPct("insectoid")), 0);
    const a = starterBlade("a");
    const b = starterBlade("b");
    const c = starterBlade("c");
    const d = starterBlade("d");
    for (const blade of [a, b, c, d]) {
      blade.hands = 1;
      blade.damageMin = 10;
      blade.damageMax = 10;
    }
    bug.equipment.weapon = a;
    bug.equipment.offhand = b;
    bug.equipment.weapon3 = c;
    bug.equipment.weapon4 = d;
    const fists = createCharacter("Fists", "insectoid");
    expect(derive(bug).meleeMax).toBeGreaterThan(derive(fists).meleeMax);
  });
});

describe("monster roster combat rules", () => {
  it("covers every SRD-style creature type in wave 1 without immunities, rez, or summons", () => {
    const covered = new Set(creatureTypesCovered());
    for (const type of [
      "aberration",
      "beast",
      "celestial",
      "construct",
      "dragon",
      "elemental",
      "fey",
      "fiend",
      "giant",
      "humanoid",
      "monstrosity",
      "ooze",
      "plant",
      "undead",
    ] as const) {
      expect(covered.has(type)).toBe(true);
    }
    for (const kind of WAVE1_KINDS) {
      const def = monsterOf(kind);
      expect(def.canResurrect).toBe(false);
      expect(def.canSummon).toBe(false);
      assertCombatBans(def);
      for (const pair of Object.keys(SECTORS) as (keyof typeof SECTORS)[]) {
        expect(damageTakenMul(def, pair)).toBeGreaterThanOrEqual(RESIST_FLOOR);
        expect(damageTakenMul(def, pair)).toBeLessThanOrEqual(WEAK_CEILING);
      }
    }
  });

  it("applies resist and weak multipliers instead of zeroing damage", () => {
    const slime = makeEnemy("slime", 1, 0, 0, 1);
    const before = slime.hp;
    // Holy is weak on slime (1.2); fire is stronger (1.55) — both deal damage.
    expect(damageTakenMul(monsterOf("slime"), "fire")).toBeGreaterThan(1);
    expect(damageTakenMul(monsterOf("slime"), "bleed")).toBeLessThan(1);
    expect(damageTakenMul(monsterOf("slime"), "bleed")).toBeGreaterThanOrEqual(RESIST_FLOOR);
    expect(before).toBeGreaterThan(0);
  });

  it("keeps swing committed through dodge and shield absorb", () => {
    const sim = new Sim(createCharacter());
    sim.phase = "play";
    sim.player.swing = 0.2;
    sim.player.attackCd = 0.4;
    sim.player.iFrame = 0.5;
    const intent = emptyIntent();
    sim.update(intent, 0.05);
    expect(sim.player.swing).toBeGreaterThan(0);
    expect(sim.player.attackCd).toBeGreaterThan(0);

    sim.player.iFrame = 0;
    sim.player.shield = 500;
    sim.player.swing = 0.18;
    const foe = makeEnemy("hound", 1, sim.player.x + 20, sim.player.y, 9);
    sim.enemies = [foe];
    // Force a hit path by standing in melee; hurtPlayer should block via shield without clearing swing.
    for (let i = 0; i < 5; i++) {
      sim.player.swing = 0.18;
      sim.update(emptyIntent(), 0.05);
    }
    expect(sim.player.swing).toBeGreaterThan(0);
  });
});
