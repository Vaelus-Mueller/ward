import { describe, expect, it } from "vitest";
import { canSpendSkill, createCharacter, grantXp, retrain, slotSkill, spendSkill, spendStat } from "./character";
import { derive, hitChance, mitigate, xpToNext } from "./formulas";
import { liveItem, rollSocketCount, socketCap } from "./itemstats";
import { equipItem, isSignatureAffix, starterBlade, tryAddItem, uniqueRoster } from "./items";
import { deserialize, serialize } from "./save";
import { ACTIVES, PASSIVE_PER_RANK, SKILLS } from "./skills";
import { emptyIntent, makeEnemy, Sim, wavePlan } from "./sim";
import { STAT_POINTS_PER_LEVEL } from "./types";

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

  it("turns endurance into life and strength into melee damage", () => {
    const plain = createCharacter();
    const hearty = createCharacter();
    hearty.unspentStats = 3;
    spendStat(hearty, "endurance");
    spendStat(hearty, "endurance");
    spendStat(hearty, "endurance");
    expect(derive(hearty).life).toBe(derive(plain).life + 12);
    const strong = createCharacter();
    strong.unspentStats = 5;
    for (let i = 0; i < 5; i++) spendStat(strong, "strength");
    expect(derive(strong).meleeMax).toBeGreaterThan(derive(plain).meleeMax);
    expect(derive(strong).armor).toBeGreaterThan(derive(plain).armor);
  });

  it("heals one health each second per level, plus one for every ten endurance", () => {
    const hero = createCharacter();
    expect(derive(hero).lifeRegen).toBeCloseTo(2);
    hero.level = 8;
    hero.unspentStats = 20;
    for (let i = 0; i < 20; i++) spendStat(hero, "endurance");
    expect(derive(hero).lifeRegen).toBeCloseTo(11);
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
      if (skill.kind === "passive") expect(PASSIVE_PER_RANK[skill.id]).toBeTruthy();
      else expect(ACTIVES[skill.id]).toBeTruthy();
    }
  });

  it("opens the inner path at level 2 and gates specializations", () => {
    const hero = createCharacter();
    expect(canSpendSkill(hero, "iron-oath").ok).toBe(false);
    grantXp(hero, xpToNext(1));
    expect(spendSkill(hero, "iron-oath")).toBe(true);
    expect(canSpendSkill(hero, "heavy-blow").ok).toBe(false);
    hero.unspentSkills = 1;
    expect(spendSkill(hero, "heavy-blow")).toBe(true);
    expect(slotSkill(hero, "iron-oath", 0)).toMatch(/always on/i);
    expect(slotSkill(hero, "heavy-blow", 0)).toBeNull();
    expect(hero.slotted[0]).toBe("heavy-blow");

    hero.level = 6;
    hero.unspentSkills = 6;
    hero.skillRanks = { "iron-oath": 1, "braced-guard": 3 };
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
    spendStat(hero, "wisdom");
    spendSkill(hero, "first-rite");
    expect(retrain(hero)).toBe(true);
    expect(hero.spent.wisdom).toBe(0);
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
  });
});

describe("the ward", () => {
  it("sends a champion every fifth wave", () => {
    expect(wavePlan(5)).toContain("brute");
    expect(wavePlan(1)).not.toContain("brute");
    expect(makeEnemy("hound", 4, 0, 0, 1).maxHp).toBeGreaterThan(makeEnemy("hound", 1, 0, 0, 2).maxHp);
    expect(makeEnemy("hound", 1, 0, 0, 1).maxHp).toBeLessThan(28);
    expect(makeEnemy("hound", 1, 0, 0, 1).damage).toBeLessThan(7);
    expect(makeEnemy("hound", 6, 0, 0, 3).maxHp).toBe(Math.round(28 * (1 + 5 * 0.16)));
  });

  it("swings on its own when standing in weapon range", () => {
    const sim = new Sim(createCharacter(), 1);
    sim.begin();
    const hound = makeEnemy("hound", 1, sim.player.x + 36, sim.player.y, 50);
    sim.enemies = [hound];
    const before = hound.hp;
    for (let i = 0; i < 40; i++) sim.update(emptyIntent(), 0.1);
    expect(sim.killedTotal > 0 || hound.hp < before).toBe(true);
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

  it("keeps an old armor piece as a chest with a newer tier", () => {
    const hero = createCharacter();
    const file = {
      version: 1 as const,
      character: hero,
      wave: 2,
      hp: 20,
      mana: 10,
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
});
