import { classTitle, refundStat, retrain, retrainCost, slotSkill, spendSkill, spendStat, canSpendSkill } from "./game/character";
import { derive, requirementText, xpGoal } from "./game/formulas";
import { canUpgrade, equipItem, gemStackName, itemSummary, materialCount, materialFor, salvageCount, salvageItem, salvageMarked, socketGem, unequipItem, upgradeBill, upgradeItem } from "./game/items";
import { liveItem } from "./game/itemstats";
import { describeSkill, SECTORS, SKILLS, scaledActive, skillById } from "./game/skills";
import { appendSkillIcon } from "./game/skillIcons";
import { readSlots } from "./game/save";
import { RACES, raceById, raceName, type RaceId } from "./game/races";
import { buyPrice, buyStockItem, gambleBlurb, gambleCost, gambleItem, merchantStock, sellItem, sellPrice, TOWN_NAME, VENDORS, type TownVendor } from "./game/town";
import { levelName } from "./game/world";
import type { Sim } from "./game/sim";
import { ATTRS, GEAR_SLOTS, MATERIAL_LABEL, MATERIAL_ORDER, MAX_LEVEL, PARAGON_CAP, RARITIES, RARITY_LABEL, type Attr, type GemKind, type Item, type SectorId, type SlotName } from "./game/types";
import { RacePreview } from "./render/racePreview";

export class Ui {
  treeFilter: SectorId | "all" = "all";
  selectedId: string | null = null;
  createRace: RaceId = "human";
  private createSlot = 0;
  private racePreview: RacePreview | null = null;
  private session: Record<Attr, number> = { strength: 0, agility: 0, stamina: 0, luck: 0, spirit: 0 };
  private treeKey = "";
  private packKey = "";
  private packTab: "gear" | "gems" = "gear";
  private tip: { slot: SlotName } | { uid: string } | { gem: GemKind; quality: number } | null = null;
  private townKey = "";
  private townVendor: TownVendor = "hub";
  private merchantGoods: Item[] = [];
  private merchantTag = "";
  private treeCenter = true;
  private fitOnPaint = true;
  private confirmSpend = false;
  private treeZoom = 1;
  private treePos = new Map<string, { x: number; y: number }>();
  private pointers = new Map<number, { x: number; y: number }>();
  private treeGesture: "none" | "pan" | "pinch" = "none";
  private panOrigin = { x: 0, y: 0, left: 0, top: 0 };
  private pinchStart = 1;
  private pinchZoom = 1;

  constructor(private actions: { changed: () => void; mutedLabel: () => string }) {
    this.bindStatic();
  }

  resting(): boolean {
    return this.open("town");
  }

  blocking(): boolean {
    const splash = document.getElementById("splash");
    if (splash && !splash.classList.contains("hidden") && !splash.classList.contains("fade-out")) return true;
    return ["title", "create", "sheet", "tree", "pack", "town", "dead", "privacy"].some((id) => this.open(id));
  }

  closeTop(): boolean {
    for (const id of ["privacy", "town", "pack", "tree", "sheet", "create"]) {
      if (this.open(id)) {
        if (id === "create") this.hideCreate();
        else this.hide(id);
        return true;
      }
    }
    return false;
  }

  showTitle(): void {
    this.racePreview?.stop();
    this.hide("create");
    this.show("title");
    const slots = readSlots(localStorage);
    slots.forEach((slot, index) => {
      const input = must(`slot-name-${index}`) as HTMLInputElement;
      if (document.activeElement !== input) input.value = slot.name;
      const occupied = slot.save !== null;
      const race = occupied ? raceName(slot.save?.character.race) : "";
      text(
        `slot-meta-${index}`,
        occupied ? `${race} · Level ${slot.save?.character.level} · ${levelName(slot.save?.wave ?? 1)}` : "Empty",
      );
      text(`slot-play-${index}`, occupied ? "Continue" : "New");
    });
  }

  hideTitle(): void {
    this.racePreview?.stop();
    this.hide("title");
    this.hide("create");
  }

  openCreate(slot: number, name: string): void {
    this.createSlot = slot;
    this.createRace = "human";
    this.hide("title");
    this.show("create");
    const input = must("create-name") as HTMLInputElement;
    input.value = name;
    this.ensureRacePreview();
    this.paintCreate();
    input.focus();
  }

  hideCreate(): void {
    this.racePreview?.stop();
    this.hide("create");
    this.showTitle();
  }

  createChoice(): { slot: number; name: string; race: RaceId } {
    return {
      slot: this.createSlot,
      name: (must("create-name") as HTMLInputElement).value,
      race: this.createRace,
    };
  }

  private ensureRacePreview(): void {
    if (this.racePreview) return;
    this.racePreview = new RacePreview(must("race-view") as HTMLCanvasElement);
  }

  private stepRace(delta: number): void {
    const index = RACES.findIndex((race) => race.id === this.createRace);
    const next = (index + delta + RACES.length) % RACES.length;
    this.createRace = RACES[next]!.id;
    this.paintCreate();
  }

  private paintCreate(): void {
    const race = raceById(this.createRace);
    const index = RACES.findIndex((entry) => entry.id === race.id);
    text("race-name", race.name);
    text("race-index", `${index + 1} / ${RACES.length}`);
    text("create-blurb", race.blurb);
    const passives = must("race-passives");
    passives.innerHTML = "";
    const good = document.createElement("div");
    good.className = "race-good";
    good.textContent = `Passives: ${race.bonuses.join(" · ")}`;
    const bad = document.createElement("div");
    bad.className = "race-bad";
    bad.textContent = `Drawbacks: ${race.penalties.join(" · ")}`;
    passives.append(good, bad);
    if (race.passive) {
      const special = document.createElement("div");
      special.className = "race-good";
      special.textContent = race.passive;
      passives.append(special);
    }
    this.racePreview?.show(race.id);
  }

  hideDead(): void {
    this.hide("dead");
  }

  showDead(): void {
    this.show("dead");
  }

  sync(sim: Sim): void {
    const c = sim.character;
    const derived = sim.derived;
    const rank = c.paragon > 0 ? `L${c.level}  P${c.paragon}` : `L${c.level}`;
    text("identity", `${c.name}  ·  ${raceName(c.race)}  ·  ${classTitle(c)}  ·  ${rank}`);
    text("wave-label", sim.placeLabel);
    text("gold", `${c.gold}`);
    const bar = must("xp-fill");
    const goal = xpGoal(c);
    bar.style.width = `${c.level >= MAX_LEVEL && c.paragon >= PARAGON_CAP ? 100 : Math.min(100, (c.xp / goal) * 100)}%`;
    text("hp-text", sim.player.shield > 0 ? `${Math.ceil(sim.player.hp)}+${Math.ceil(sim.player.shield)}` : `${Math.ceil(sim.player.hp)}`);
    text("hp-max", `${derived.life}`);
    const life = must("life-globe");
    life.style.setProperty("--fill", String(sim.player.hp / Math.max(1, derived.life)));
    must("btn-character").classList.toggle("attention", c.unspentStats > 0);
    must("btn-tree").classList.toggle("attention", c.unspentSkills > 0);
    const banner = must("banner");
    banner.classList.toggle("hidden", sim.bannerT <= 0 || sim.banner.length === 0);
    banner.textContent = sim.banner;
    const portal = must("portal-cast");
    const casting = !!sim.player.portal;
    portal.classList.toggle("hidden", !casting);
    if (casting) must("portal-fill").style.width = `${Math.round(sim.portalProgress() * 100)}%`;
    const near = sim.nearestItemDrop();
    const loot = must("loot");
    loot.classList.toggle("hidden", !near);
    if (near) loot.dataset.drop = String(near.id);

    for (let i = 0; i < 3; i++) {
      const button = must(`skill-${i}`);
      const id = c.slotted[i];
      const spec = id ? scaledActive(id, c.skillRanks[id] ?? 0, c.skillRanks) : null;
      const skill = id ? skillById(id) : undefined;
      const cost = spec && spec.kind !== "aura" ? spec.energyCost : spec?.energyPerSec ?? 0;
      const charged = !spec || spec.kind === "aura" || sim.player.energy >= (spec.energyCost || 0);
      button.textContent = skill ? skill.name : "Empty";
      button.title = skill && cost ? `${skill.name} · ${Math.round(cost)}${spec?.kind === "aura" ? "/s" : ""} energy` : skill?.name ?? "Empty";
      const max = spec ? Math.max(0.2, spec.cooldown) : 1;
      const ratio = spec && spec.kind !== "aura" ? Math.min(1, sim.player.skillCd[i]! / max) : 0;
      button.style.setProperty("--cd", String(ratio));
      button.classList.toggle("on", !!sim.player.auras[i]);
      button.classList.toggle("empty", !skill);
      button.classList.toggle("starved", !!skill && !charged && spec?.kind !== "aura");
      const fill = Math.min(1, sim.player.energy / Math.max(1, derived.energy));
      button.style.setProperty("--energy", String(fill));
    }

    if (this.open("sheet")) this.paintSheet(sim);
    if (this.open("tree")) {
      const key = `${this.treeFilter}:${this.selectedId}:${c.level}:${c.unspentSkills}:${JSON.stringify(c.skillRanks)}`;
      if (key !== this.treeKey) {
        this.treeKey = key;
        this.paintTree(sim);
      }
    }
    if (this.open("pack")) {
      const key = this.packSignature(sim);
      if (key !== this.packKey) {
        this.packKey = key;
        this.paintPack(sim);
      }
    }
    if (this.open("town")) {
      const key = this.townSignature(sim);
      if (key !== this.townKey) {
        this.townKey = key;
        this.paintTown(sim);
      }
    }
  }

  private bindStatic(): void {
    must("close-sheet").addEventListener("click", () => this.hide("sheet"));
    must("close-tree").addEventListener("click", () => this.hide("tree"));
    must("close-pack").addEventListener("click", () => {
      this.tip = null;
      this.hide("pack");
    });
    must("close-privacy").addEventListener("click", () => this.hide("privacy"));
    must("btn-character").addEventListener("click", () => this.openSheet());
    must("btn-tree").addEventListener("click", () => this.openTree());
    must("btn-pack").addEventListener("click", () => {
      this.show("pack");
    });
    must("btn-town").addEventListener("click", () => this.requestTown());
    must("close-town").addEventListener("click", () => this.leaveTown());
    must("pack-tab-gear").addEventListener("click", () => {
      this.packTab = "gear";
      this.packKey = "";
    });
    must("pack-tab-gems").addEventListener("click", () => {
      this.packTab = "gems";
      this.packKey = "";
    });
    for (const slot of GEAR_SLOTS) {
      must(`eq-${slot}`).addEventListener("click", (event) => {
        event.stopPropagation();
        this.tip = this.tip && "slot" in this.tip && this.tip.slot === slot ? null : { slot };
        this.packKey = "";
      });
    }
    must("pack").addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest(".gear-tip, .gear-slot, .item-name")) return;
      if (!this.tip) return;
      this.tip = null;
      this.packKey = "";
    });
    must("pack-list").addEventListener("scroll", () => this.placeTip(), { passive: true });
    must("open-privacy").addEventListener("click", () => this.show("privacy"));
    must("create-back").addEventListener("click", () => this.hideCreate());
    must("race-prev").addEventListener("click", () => this.stepRace(-1));
    must("race-next").addEventListener("click", () => this.stepRace(1));
    for (const id of Object.keys(SECTORS) as SectorId[]) {
      document.querySelector(`[data-filter="${id}"]`)?.addEventListener("click", () => {
        this.treeFilter = id;
        this.treeCenter = true;
        this.fitOnPaint = true;
        this.confirmSpend = false;
        this.treeKey = "";
      });
    }
    must("filter-all").addEventListener("click", () => {
      this.treeFilter = "all";
      this.treeCenter = true;
      this.fitOnPaint = true;
      this.confirmSpend = false;
      this.treeKey = "";
    });
    for (const attr of ATTRS) {
      document.querySelector(`.plus[data-attr="${attr}"]`)?.addEventListener("click", () => this.plus(attr));
      document.querySelector(`.minus[data-attr="${attr}"]`)?.addEventListener("click", () => this.minus(attr));
    }
    must("retrain").addEventListener("click", () => this.doRetrain());
    must("tree-invest").addEventListener("click", () => this.invest());
    must("tree-confirm-yes").addEventListener("click", () => this.confirmInvest());
    must("tree-cancel-spend").addEventListener("click", () => this.cancelInvest());
    must("tree-zoom-out").addEventListener("click", () => this.setTreeZoom(this.treeZoom / 1.25, this.scrollerCenter()));
    must("tree-zoom-in").addEventListener("click", () => this.setTreeZoom(this.treeZoom * 1.25, this.scrollerCenter()));
    must("tree-zoom-fit").addEventListener("click", () => this.fitTree());
    this.bindTreeGestures();
    for (let i = 0; i < 3; i++) {
      const index = i as 0 | 1 | 2;
      must(`assign-${i}`).addEventListener("click", () => this.assign(index));
    }
  }

  private openSheet(): void {
    this.session = { strength: 0, agility: 0, stamina: 0, luck: 0, spirit: 0 };
    this.show("sheet");
  }

  private openTree(): void {
    this.treeKey = "";
    this.treeCenter = true;
    this.fitOnPaint = true;
    this.confirmSpend = false;
    this.show("tree");
  }

  private plus(attr: Attr): void {
    const sim = current();
    if (!spendStat(sim.character, attr)) return;
    this.session[attr] += 1;
    sim.recompute();
    this.actions.changed();
  }

  private minus(attr: Attr): void {
    if (this.session[attr] <= 0) return;
    const sim = current();
    if (!refundStat(sim.character, attr)) return;
    this.session[attr] -= 1;
    sim.recompute();
    this.actions.changed();
  }

  private doRetrain(): void {
    const sim = current();
    const cost = retrainCost(sim.character);
    if (sim.character.gold < cost) return;
    if (!retrain(sim.character)) return;
    this.session = { strength: 0, agility: 0, stamina: 0, luck: 0, spirit: 0 };
    sim.player.auras = [false, false, false];
    sim.recompute();
    this.treeKey = "";
    this.actions.changed();
  }

  private invest(): void {
    if (!this.selectedId) return;
    const sim = current();
    if (!canSpendSkill(sim.character, this.selectedId).ok) return;
    this.confirmSpend = true;
    this.paintCard(sim);
  }

  private confirmInvest(): void {
    if (!this.selectedId || !this.confirmSpend) return;
    const sim = current();
    if (!spendSkill(sim.character, this.selectedId)) {
      this.confirmSpend = false;
      this.paintCard(sim);
      return;
    }
    this.confirmSpend = false;
    sim.recompute();
    this.treeKey = "";
    this.actions.changed();
  }

  private cancelInvest(): void {
    this.confirmSpend = false;
    this.paintCard(current());
  }

  private assign(index: 0 | 1 | 2): void {
    if (!this.selectedId) return;
    const sim = current();
    const error = slotSkill(sim.character, this.selectedId, index);
    text("tree-reason", error ?? `Assigned to slot ${index + 1}.`);
    if (!error) {
      sim.player.auras[index] = false;
      sim.recompute();
      this.actions.changed();
    }
  }

  private paintSheet(sim: Sim): void {
    const c = sim.character;
    const d = derive(c, sim.mods);
    text("sheet-title", c.name);
    text(
      "sheet-level",
      c.paragon > 0
        ? `${raceName(c.race)}  ·  ${classTitle(c)}  ·  Level ${c.level}  ·  Paragon ${c.paragon}`
        : `${raceName(c.race)}  ·  ${classTitle(c)}  ·  Level ${c.level}`,
    );
    text("unspent-stats", `${c.unspentStats}`);
    text("unspent-skills", `${c.unspentSkills}`);
    text("sheet-gold", c.gold.toLocaleString());
    const goal = xpGoal(c);
    text("sheet-xp", `${Math.floor(c.xp).toLocaleString()} / ${goal.toLocaleString()}`);
    const xpFill = document.getElementById("sheet-xp-fill");
    if (xpFill) {
      const full = c.level >= MAX_LEVEL && c.paragon >= PARAGON_CAP;
      xpFill.style.width = `${full ? 100 : Math.min(100, (c.xp / goal) * 100)}%`;
    }
    for (const attr of ATTRS) {
      text(`stat-${attr}`, `${Math.round(d[attr])}`);
      const minus = document.querySelector(`.minus[data-attr="${attr}"]`) as HTMLButtonElement;
      minus.disabled = this.session[attr] <= 0;
    }
    const meleeAvg = (d.meleeMin + d.meleeMax) / 2;
    const attackSpeed = 1 / Math.max(0.05, d.attackPeriod);
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    text("sum-dps", meleeAvg.toFixed(0));
    text("sum-res", `${Math.round(d.armor)}`);
    text("sum-reg", d.lifeRegen.toFixed(1));
    text("s-total", meleeAvg.toFixed(1));
    text("s-phys", `${d.meleeMin.toFixed(1)}–${d.meleeMax.toFixed(1)}`);
    text("s-dbonus", pct(sim.mods.meleeMult));
    text("s-sbonus", pct(sim.mods.spellMult));
    text("s-pskill", pct(sim.mods.meleeMult));
    text("s-aspeed", attackSpeed.toFixed(2));
    text("s-crit", pct(d.crit));
    text("s-thorns", `${Math.round(d.thorns)}`);
    text("s-hp", `${d.life}`);
    text("s-hregen", d.lifeRegen.toFixed(1));
    text("s-dr", pct(d.damageReduction));
    text("s-def", `${Math.round(d.armor)}`);
    text("s-mana", `${d.energy}`);
    text("s-dodge", pct(d.evasion));
    text("s-ecdr", pct(sim.mods.cdr));
    text("s-eregen", d.energyRegen.toFixed(1));
    text("s-ehit", d.energyOnHit.toFixed(1));
    text("s-gf", pct(d.goldFind));
    text("s-mf", pct(d.magicFind));
    text("s-ar", `${d.attackRating}`);
    text("s-move", `${Math.round(d.moveSpeed)}`);
    text("s-spell", `${d.spellMin.toFixed(1)}–${d.spellMax.toFixed(1)}`);
    const cost = retrainCost(c);
    const button = must("retrain") as HTMLButtonElement;
    button.textContent = cost === 0 ? "Retrain (free)" : `Retrain (${cost} gold)`;
    button.disabled = c.gold < cost;
    const gear = GEAR_SLOTS.map((slot) => c.equipment[slot])
      .filter((item) => item)
      .map((item) => item!.name)
      .join("  ·  ");
    text("sheet-gear", gear || "Fists and empty cloth.");
  }

  private paintTree(sim: Sim): void {
    const svg = must("tree-svg") as unknown as SVGSVGElement;
    const width = 1480;
    const height = 1480;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.replaceChildren();
    const cx = width / 2;
    const cy = height / 2;
    const reach = 640;
    const filter = this.treeFilter;
    const visible = SKILLS.filter((skill) => filter === "all" || skill.sector === filter);
    const pos = new Map<string, { x: number; y: number }>();
    this.treePos = pos;
    for (const skill of visible) {
      const angle = displayAngle(skill.angle, skill.sector, filter);
      const radius = spreadRadius(skill.radius);
      pos.set(skill.id, {
        x: cx + Math.cos(angle) * radius * reach,
        y: cy + Math.sin(angle) * radius * reach,
      });
    }
    if (filter === "all") {
      for (const sector of Object.values(SECTORS)) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const start = sector.angle - 1.02;
        const end = sector.angle + 1.02;
        const r = reach * 0.98;
        const large = 0;
        path.setAttribute(
          "d",
          `M ${cx} ${cy} L ${cx + Math.cos(start) * r} ${cy + Math.sin(start) * r} A ${r} ${r} 0 ${large} 1 ${cx + Math.cos(end) * r} ${cy + Math.sin(end) * r} Z`,
        );
        path.setAttribute("fill", sector.color);
        path.setAttribute("opacity", "0.08");
        svg.append(path);
      }
    }
    const line = (x1: number, y1: number, x2: number, y2: number, hot: boolean) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
      el.setAttribute("x1", String(x1));
      el.setAttribute("y1", String(y1));
      el.setAttribute("x2", String(x2));
      el.setAttribute("y2", String(y2));
      el.setAttribute("stroke", hot ? "#e7c39a" : "rgba(232,214,196,0.28)");
      el.setAttribute("stroke-width", hot ? "2" : "1.25");
      svg.append(el);
    };
    for (const skill of visible) {
      if (skill.hub) line(cx, cy, pos.get(skill.id)!.x, pos.get(skill.id)!.y, (sim.character.skillRanks[skill.id] ?? 0) > 0);
      for (const req of [...skill.requires, ...skill.requiresAny]) {
        const from = pos.get(req);
        const to = pos.get(skill.id);
        if (!from || !to) continue;
        line(from.x, from.y, to.x, to.y, (sim.character.skillRanks[req] ?? 0) > 0 && (sim.character.skillRanks[skill.id] ?? 0) > 0);
      }
    }
    const hub = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hub.setAttribute("cx", String(cx));
    hub.setAttribute("cy", String(cy));
    hub.setAttribute("r", "22");
    hub.setAttribute("fill", "#1a1612");
    hub.setAttribute("stroke", "#e7c39a");
    svg.append(hub);
    const hubText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    hubText.setAttribute("x", String(cx));
    hubText.setAttribute("y", String(cy + 4));
    hubText.setAttribute("text-anchor", "middle");
    hubText.setAttribute("fill", "#f0e2cf");
    hubText.setAttribute("font-size", "11");
    hubText.textContent = "You";
    svg.append(hubText);

    for (const skill of visible) {
      const rank = sim.character.skillRanks[skill.id] ?? 0;
      const gate = canSpendSkill(sim.character, skill.id);
      const at = pos.get(skill.id)!;
      const color = SECTORS[skill.sector].color;
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const r = filter === "all" ? 30 : 36;
      circle.setAttribute("cx", String(at.x));
      circle.setAttribute("cy", String(at.y));
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", rank > 0 ? color : "#221c17");
      circle.setAttribute("stroke", this.selectedId === skill.id ? "#f4efe6" : gate.ok ? "#e7c39a" : "rgba(232,214,196,0.35)");
      circle.setAttribute("stroke-width", this.selectedId === skill.id ? "3" : "1.5");
      svg.append(circle);
      appendSkillIcon(svg, skill.id, at.x, at.y - (rank > 0 ? 4 : 0), r * 1.15, rank > 0);
      if (rank > 0) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", String(at.x));
        label.setAttribute("y", String(at.y + r * 0.55));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "#1a120c");
        label.setAttribute("font-size", "12");
        label.setAttribute("font-weight", "700");
        label.style.pointerEvents = "none";
        label.textContent = String(rank);
        svg.append(label);
      } else if (gate.ok) {
        const plus = document.createElementNS("http://www.w3.org/2000/svg", "text");
        plus.setAttribute("x", String(at.x));
        plus.setAttribute("y", String(at.y + r * 0.55));
        plus.setAttribute("text-anchor", "middle");
        plus.setAttribute("fill", "#f0e2cf");
        plus.setAttribute("font-size", "13");
        plus.style.pointerEvents = "none";
        plus.textContent = "+";
        svg.append(plus);
      }
      const name = document.createElementNS("http://www.w3.org/2000/svg", "text");
      name.setAttribute("x", String(at.x));
      name.setAttribute("y", String(at.y + r + 18));
      name.setAttribute("text-anchor", "middle");
      name.setAttribute("fill", "#f0e2cf");
      name.setAttribute("font-size", "13");
      name.style.pointerEvents = "none";
      name.textContent = skill.name;
      svg.append(name);
    }
    this.paintCard(sim);
    this.applyTreeZoom();
    if (this.fitOnPaint) {
      this.fitOnPaint = false;
      this.treeCenter = false;
      requestAnimationFrame(() => this.fitTree());
    } else if (this.treeCenter) {
      this.treeCenter = false;
      requestAnimationFrame(() => this.centerTree());
    }
    for (const id of ["filter-all", ...Object.keys(SECTORS)]) {
      const button = document.querySelector(`[data-filter="${id === "filter-all" ? "all" : id}"]`);
      button?.classList.toggle("on", (id === "filter-all" ? "all" : id) === filter);
    }
  }

  private paintCard(sim: Sim): void {
    const skill = this.selectedId ? skillById(this.selectedId) : undefined;
    text("tree-points", pointLabel(sim.character.unspentSkills));
    const confirm = must("tree-confirm");
    if (!skill) {
      this.confirmSpend = false;
      text("tree-name", "Choose a skill");
      text("tree-blurb", "Pinch to zoom, or use the buttons. Tap a circle to read what it does.");
      text("tree-next", "");
      text("tree-reason", "");
      confirm.classList.add("hidden");
      must("tree-invest").toggleAttribute("hidden", true);
      must("tree-confirm-yes").toggleAttribute("hidden", true);
      must("tree-cancel-spend").toggleAttribute("hidden", true);
      for (let i = 0; i < 3; i++) must(`assign-${i}`).toggleAttribute("hidden", true);
      return;
    }
    const rank = sim.character.skillRanks[skill.id] ?? 0;
    const gate = canSpendSkill(sim.character, skill.id);
    if (!gate.ok) this.confirmSpend = false;
    text("tree-name", `${skill.name}  ·  ${skill.kind}  ·  ${rank}/${skill.maxRank}`);
    text("tree-blurb", describeSkill(skill.id, Math.max(1, rank), sim.character.skillRanks));
    text(
      "tree-next",
      rank > 0 && rank < skill.maxRank
        ? `Next rank (${rank + 1}): ${describeSkill(skill.id, rank + 1, sim.character.skillRanks)}`
        : rank >= skill.maxRank
          ? "No further ranks."
          : "",
    );
    text("tree-reason", gate.reason || (rank === 0 ? "Not learned yet." : ""));
    const asking = this.confirmSpend && gate.ok;
    confirm.classList.toggle("hidden", !asking);
    if (asking) {
      const left = Math.max(0, sim.character.unspentSkills - 1);
      confirm.textContent = `Spend 1 skill point on ${skill.name}? Rank ${rank} becomes ${rank + 1}. ${pointLabel(left)} will remain.`;
    }
    const invest = must("tree-invest") as HTMLButtonElement;
    invest.hidden = asking || rank >= skill.maxRank;
    invest.disabled = !gate.ok;
    invest.textContent = rank === 0 ? "Learn" : "Spend point";
    must("tree-confirm-yes").toggleAttribute("hidden", !asking);
    must("tree-cancel-spend").toggleAttribute("hidden", !asking);
    const canSlot = skill.kind !== "passive" && rank > 0;
    for (let i = 0; i < 3; i++) {
      const button = must(`assign-${i}`);
      button.toggleAttribute("hidden", !canSlot);
    }
  }

  private selectSkill(id: string | null): void {
    if (id === this.selectedId && id !== null) {
      this.treeKey = "";
      this.paintTree(current());
      return;
    }
    this.selectedId = id;
    this.confirmSpend = false;
    this.treeKey = "";
    this.paintTree(current());
  }

  private bindTreeGestures(): void {
    const scroller = must("tree-scroll");
    scroller.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      try {
        scroller.setPointerCapture(event.pointerId);
      } catch {
        // A pointer that has already ended cannot be captured.
      }
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.pointers.size === 1) {
        this.treeGesture = "none";
        this.panOrigin = { x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
      } else {
        this.treeGesture = "pinch";
        this.pinchStart = this.pointerSpan();
        this.pinchZoom = this.treeZoom;
      }
    });
    scroller.addEventListener("pointermove", (event) => {
      if (!this.pointers.has(event.pointerId)) return;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.pointers.size >= 2 && this.pinchStart > 0) {
        this.treeGesture = "pinch";
        const mid = this.pointerMidpoint();
        this.setTreeZoom(this.pinchZoom * (this.pointerSpan() / this.pinchStart), mid);
        return;
      }
      const dx = event.clientX - this.panOrigin.x;
      const dy = event.clientY - this.panOrigin.y;
      if (this.treeGesture !== "pinch" && Math.hypot(dx, dy) > 8) {
        this.treeGesture = "pan";
        scroller.scrollLeft = this.panOrigin.left - dx;
        scroller.scrollTop = this.panOrigin.top - dy;
      }
    });
    const finish = (event: PointerEvent) => {
      if (!this.pointers.has(event.pointerId)) return;
      const start = this.pointers.get(event.pointerId)!;
      this.pointers.delete(event.pointerId);
      if (this.pointers.size === 0 && this.treeGesture === "none") {
        const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (moved < 12) this.selectSkill(this.nodeAt(event.clientX, event.clientY));
      }
      if (this.pointers.size === 1) {
        const rest = [...this.pointers.values()][0]!;
        this.treeGesture = "pan";
        this.panOrigin = { x: rest.x, y: rest.y, left: scroller.scrollLeft, top: scroller.scrollTop };
      }
      if (this.pointers.size === 0) this.treeGesture = "none";
    };
    scroller.addEventListener("pointerup", finish);
    scroller.addEventListener("pointercancel", (event) => {
      this.pointers.delete(event.pointerId);
      if (this.pointers.size === 0) this.treeGesture = "none";
    });
    scroller.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        this.setTreeZoom(this.treeZoom * factor, { x: event.clientX, y: event.clientY });
      },
      { passive: false },
    );
  }

  private nodeAt(clientX: number, clientY: number): string | null {
    const svg = document.getElementById("tree-svg");
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const x = ((clientX - rect.left) / rect.width) * 1480;
    const y = ((clientY - rect.top) / rect.height) * 1480;
    let best: string | null = null;
    let bestD = 78;
    for (const [id, at] of this.treePos) {
      const d = Math.hypot(x - at.x, y - at.y);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  private pointerSpan(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 1;
    return Math.max(1, Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y));
  }

  private pointerMidpoint(): { x: number; y: number } {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return pts[0] ?? this.scrollerCenter();
    return { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
  }

  private scrollerCenter(): { x: number; y: number } {
    const scroller = must("tree-scroll");
    const rect = scroller.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  private applyTreeZoom(): void {
    const svg = document.getElementById("tree-svg");
    if (!svg) return;
    const size = 1480 * this.treeZoom;
    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;
  }

  private setTreeZoom(next: number, focal: { x: number; y: number }): void {
    const scroller = document.getElementById("tree-scroll");
    if (!scroller) return;
    const prev = this.treeZoom;
    const zoom = clamp(next, 0.15, 2.5);
    const rect = scroller.getBoundingClientRect();
    const localX = focal.x - rect.left;
    const localY = focal.y - rect.top;
    const contentX = scroller.scrollLeft + localX;
    const contentY = scroller.scrollTop + localY;
    const ratio = prev > 0 ? zoom / prev : 1;
    this.treeZoom = zoom;
    this.applyTreeZoom();
    scroller.scrollLeft = contentX * ratio - localX;
    scroller.scrollTop = contentY * ratio - localY;
  }

  private fitTree(): void {
    const scroller = document.getElementById("tree-scroll");
    if (!scroller) return;
    const fit = Math.min(scroller.clientWidth, scroller.clientHeight) / 1480;
    this.treeZoom = clamp(fit * 0.96, 0.15, 1.6);
    this.applyTreeZoom();
    this.centerTree();
  }

  private centerTree(): void {
    const scroller = document.getElementById("tree-scroll");
    const svg = document.getElementById("tree-svg");
    if (!scroller || !svg) return;
    scroller.scrollLeft = Math.max(0, (svg.clientWidth - scroller.clientWidth) / 2);
    scroller.scrollTop = Math.max(0, (svg.clientHeight - scroller.clientHeight) / 2);
  }

  private paintPack(sim: Sim): void {
    const c = sim.character;
    const labels: Record<SlotName, string> = {
      weapon: "Weapon",
      offhand: "Off-hand",
      weapon3: "Third arm",
      weapon4: "Fourth arm",
      head: "Head",
      chest: "Chest",
      belt: "Belt",
      boots: "Boots",
      gloves: "Gloves",
      ring1: "Left ring",
      ring2: "Right ring",
      neck: "Necklace",
      ear1: "Left earring",
      ear2: "Right earring",
    };
    const insect = c.race === "insectoid";
    for (const slot of ["weapon3", "weapon4"] as const) {
      must(`eq-${slot}`).classList.toggle("hidden", !insect);
    }
    for (const slot of GEAR_SLOTS) {
      if ((slot === "weapon3" || slot === "weapon4") && !insect) continue;
      const item = c.equipment[slot];
      const el = must(`eq-${slot}`) as HTMLButtonElement;
      el.className = `gear-slot${item ? ` ${rarityClass(item)}` : " empty"}${this.tip && "slot" in this.tip && this.tip.slot === slot ? " on" : ""}${slot === "weapon3" || slot === "weapon4" ? " insect-only" : ""}`;
      el.innerHTML = gearIcon(slot, item?.style ?? "melee");
      el.setAttribute("aria-label", item ? `${labels[slot]}, ${item.name}` : `${labels[slot]}, empty`);
    }
    must("pack-tab-gear").classList.toggle("on", this.packTab === "gear");
    must("pack-tab-gems").classList.toggle("on", this.packTab === "gems");
    const list = must("pack-list");
    list.innerHTML = "";
    must("salvage-bar").toggleAttribute("hidden", this.packTab !== "gear");
    if (this.packTab === "gear") this.paintSalvageBar(sim);
    if (this.packTab === "gems") {
      this.paintGemList(sim, list);
      this.paintTip(sim, labels);
      return;
    }
    const gear = c.inventory.filter((item) => item.slot !== "gem");
    if (gear.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "The pack is empty. Spare gear falls in the ward.";
      list.append(empty);
      this.paintTip(sim, labels);
      return;
    }
    for (const item of gear) {
      const button = document.createElement("button");
      button.type = "button";
      const selected = this.tip && "uid" in this.tip && this.tip.uid === item.uid;
      button.className = `gear-slot loot-slot ${rarityClass(item)}${selected ? " on" : ""}`;
      button.dataset.tip = item.uid;
      button.innerHTML = gearIcon(item.slot, item.style);
      button.setAttribute("aria-label", item.name);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.tip = this.tip && "uid" in this.tip && this.tip.uid === item.uid ? null : { uid: item.uid };
        this.packKey = "";
      });
      list.append(button);
    }
    this.paintTip(sim, labels);
  }

  private paintTip(sim: Sim, labels: Record<SlotName, string>): void {
    const tip = must("gear-tip");
    tip.innerHTML = "";
    if (!this.tip) {
      tip.classList.add("hidden");
      return;
    }
    if ("gem" in this.tip) {
      this.paintGemTip(sim);
      return;
    }
    const c = sim.character;
    const wornSlot = "slot" in this.tip ? this.tip.slot : null;
    const item = wornSlot ? c.equipment[wornSlot] : c.inventory.find((entry) => "uid" in this.tip! && entry.uid === this.tip.uid);
    if (!wornSlot && !item) {
      this.tip = null;
      tip.classList.add("hidden");
      return;
    }
    const title = document.createElement("div");
    title.textContent = item ? item.name : labels[wornSlot!];
    if (item) title.className = rarityClass(item);
    const body = document.createElement("p");
    body.className = "muted";
    if (!item) {
      body.textContent = "Empty.";
    } else {
      const affix = liveItem(item, c.level).affixes.map((entry) => entry.label).join(", ");
      const req = requirementText(item);
      body.textContent = [wornSlot ? labels[wornSlot] : null, itemSummary(item, c.level), affix, req].filter(Boolean).join(". ");
    }
    tip.append(title, body);
    if (item && wornSlot) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Remove";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const error = unequipItem(c, wornSlot);
        text("pack-note", error ?? `Removed ${item.name}.`);
        if (!error) {
          this.tip = null;
          sim.recompute();
          this.packKey = "";
          this.actions.changed();
        }
      });
      tip.append(button);
      this.socketButtons(sim, item.uid, tip);
    } else if (item) {
      const equip = document.createElement("button");
      equip.type = "button";
      equip.textContent = "Equip";
      equip.addEventListener("click", (event) => {
        event.stopPropagation();
        const error = equipItem(c, item.uid);
        text("pack-note", error ?? `Equipped ${item.name}.`);
        if (!error) {
          this.tip = null;
          sim.recompute();
          this.packKey = "";
          this.actions.changed();
        }
      });
      const salvage = document.createElement("button");
      salvage.type = "button";
      const gained = salvageCount(item);
      salvage.textContent = `Salvage ${gained}`;
      salvage.addEventListener("click", (event) => {
        event.stopPropagation();
        const error = salvageItem(c, item.uid);
        text("pack-note", error ?? `Broke down ${item.name} into ${gained} ${MATERIAL_LABEL[materialFor(item)]}.`);
        if (!error) {
          this.tip = null;
          this.packKey = "";
          this.townKey = "";
          this.actions.changed();
        }
      });
      tip.append(equip, salvage);
      this.socketButtons(sim, item.uid, tip);
    }
    tip.classList.remove("hidden");
    this.placeTip();
  }

  private placeTip(): void {
    const tip = document.getElementById("gear-tip");
    if (!tip || tip.classList.contains("hidden") || !this.tip) return;
    const anchor = "slot" in this.tip
      ? document.getElementById(`eq-${this.tip.slot}`)
      : document.querySelector(`[data-tip="${CSS.escape("uid" in this.tip ? this.tip.uid : `gem:${this.tip.gem}:${this.tip.quality}`)}"]`);
    if (!anchor) return;
    const margin = 8;
    const rect = anchor.getBoundingClientRect();
    const inLoot = anchor.classList.contains("loot-slot");
    const side = document.querySelector(".pack-side")?.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    let left = inLoot ? rect.left : (side?.left ?? rect.right) + margin;
    let top = inLoot ? rect.bottom + margin : rect.top;
    if (!inLoot && left + width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - width);
      top = rect.bottom + margin;
    }
    if (inLoot && left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - margin - width);
    if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - margin);
    if (top < margin) top = margin;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  private paintGemList(sim: Sim, list: HTMLElement): void {
    const c = sim.character;
    if (!Array.isArray(c.gems)) c.gems = [];
    const stacks = [...c.gems].filter((stack) => stack.count > 0).sort((a, b) => a.kind.localeCompare(b.kind) || a.quality - b.quality);
    if (stacks.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No gems yet. They fall in the ward and stack here.";
      list.append(empty);
      return;
    }
    for (const stack of stacks) {
      const button = document.createElement("button");
      button.type = "button";
      const selected = this.tip && "gem" in this.tip && this.tip.gem === stack.kind && this.tip.quality === stack.quality;
      button.className = `gear-slot loot-slot gem-${stack.kind}${selected ? " on" : ""}`;
      button.dataset.tip = `gem:${stack.kind}:${stack.quality}`;
      button.innerHTML = `${gemIcon()}<span class="loot-count">${stack.count}</span>`;
      button.setAttribute("aria-label", `${gemStackName(stack.kind, stack.quality)}, ${stack.count}`);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.tip = selected ? null : { gem: stack.kind, quality: stack.quality };
        this.packKey = "";
      });
      list.append(button);
    }
  }

  private paintGemTip(sim: Sim): void {
    if (!this.tip || !("gem" in this.tip)) return;
    const tip = must("gear-tip");
    const c = sim.character;
    const stack = (c.gems ?? []).find((entry) => this.tip && "gem" in this.tip && entry.kind === this.tip.gem && entry.quality === this.tip.quality && entry.count > 0);
    if (!stack || !this.tip || !("gem" in this.tip)) {
      this.tip = null;
      tip.classList.add("hidden");
      return;
    }
    const name = gemStackName(stack.kind, stack.quality);
    const title = document.createElement("div");
    title.className = `gem-${stack.kind}`;
    title.textContent = `${name}  × ${stack.count}`;
    const body = document.createElement("p");
    body.className = "muted";
    body.textContent = "Socket into a weapon, helm, or chest.";
    tip.append(title, body);
    const host = this.firstSocketHost(c);
    if (host) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Socket into ${host.name}`;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const error = socketGem(c, host.uid, stack.kind, stack.quality);
        text("pack-note", error ?? `Set ${name} into ${host.name}.`);
        if (!error) {
          if (stack.count <= 0) this.tip = null;
          sim.recompute();
          this.packKey = "";
          this.actions.changed();
        }
      });
      tip.append(button);
    }
    tip.classList.remove("hidden");
    this.placeTip();
  }

  private firstSocketHost(c: Sim["character"]): { uid: string; name: string } | null {
    const worn = GEAR_SLOTS.map((slot) => c.equipment[slot]).find((item) => item && item.gems.includes(null));
    const bag = c.inventory.find((item) => item.gems.includes(null));
    const host = worn ?? bag;
    return host ? { uid: host.uid, name: host.name } : null;
  }

  private paintSalvageBar(sim: Sim): void {
    const c = sim.character;
    if (!Array.isArray(c.salvageMarks)) c.salvageMarks = ["grey", "white"];
    const bar = must("salvage-bar");
    bar.innerHTML = "";
    for (const rarity of RARITIES) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = RARITY_LABEL[rarity];
      button.classList.toggle("on", c.salvageMarks.includes(rarity));
      button.addEventListener("click", () => {
        const marks = new Set(c.salvageMarks);
        if (marks.has(rarity)) marks.delete(rarity);
        else marks.add(rarity);
        c.salvageMarks = RARITIES.filter((entry) => marks.has(entry));
        this.packKey = "";
        this.actions.changed();
      });
      bar.append(button);
    }
    const marked = c.inventory.filter((item) => item.slot !== "gem" && c.salvageMarks.includes(item.rarity)).length;
    const bulk = document.createElement("button");
    bulk.type = "button";
    bulk.textContent = marked > 0 ? `Salvage marked (${marked})` : "Salvage marked";
    bulk.disabled = marked === 0;
    bulk.addEventListener("click", () => {
      const names = salvageMarked(c);
      text("pack-note", names.length ? `Broke down ${names.length} item${names.length === 1 ? "" : "s"}.` : "Nothing of those qualities is in the pack.");
      this.packKey = "";
      this.townKey = "";
      this.actions.changed();
    });
    bar.append(bulk);
  }

  private requestTown(): void {
    if (this.open("town")) {
      this.leaveTown();
      return;
    }
    const sim = current();
    if (!sim || sim.phase !== "play") return;
    const error = sim.startPortal();
    if (error) {
      sim.banner = error;
      sim.bannerT = 2.2;
    }
    this.actions.changed();
  }

  arriveTown(): void {
    this.townVendor = "hub";
    this.townKey = "";
    this.refreshMerchantStock();
    this.show("town");
    this.actions.changed();
  }

  private leaveTown(): void {
    this.hide("town");
    this.townVendor = "hub";
    this.townKey = "";
    this.merchantTag = "";
    this.merchantGoods = [];
    this.actions.changed();
  }

  private refreshMerchantStock(): void {
    const sim = current();
    if (!sim) return;
    const tag = `${sim.character.name}-${sim.character.level}-${sim.wave}`;
    if (tag === this.merchantTag && this.merchantGoods.length > 0) return;
    this.merchantTag = tag;
    let seed = 1;
    for (let i = 0; i < tag.length; i++) seed = (seed * 31 + tag.charCodeAt(i)) >>> 0;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    this.merchantGoods = merchantStock(sim.character.level, rng, `ash-${tag}`);
  }

  private openTown(): void {
    this.arriveTown();
  }

  private paintTown(sim: Sim): void {
    const c = sim.character;
    if (!Array.isArray(c.materials)) c.materials = [];
    const mats = must("town-materials");
    mats.innerHTML = "";
    for (const id of MATERIAL_ORDER) {
      const chip = document.createElement("span");
      chip.textContent = `${MATERIAL_LABEL[id]} ${materialCount(c, id)}`;
      mats.append(chip);
    }
    const goldChip = document.createElement("span");
    goldChip.textContent = `Gold ${c.gold}`;
    mats.append(goldChip);

    const body = must("town-body");
    body.innerHTML = "";
    text("town-note", "");

    if (this.townVendor === "hub") {
      text("town-title", TOWN_NAME);
      text("town-sub", "A quiet court off the ward. Smith, merchant, and gambler keep the stalls.");
      const grid = document.createElement("div");
      grid.className = "town-vendors";
      for (const vendor of VENDORS) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "town-vendor";
        card.innerHTML = `<strong>${vendor.name}</strong><em>${vendor.title}</em><span>${vendor.blurb}</span>`;
        card.addEventListener("click", () => {
          this.townVendor = vendor.id;
          this.townKey = "";
        });
        grid.append(card);
      }
      body.append(grid);
      return;
    }

    const back = document.createElement("button");
    back.type = "button";
    back.textContent = "Back to court";
    back.addEventListener("click", () => {
      this.townVendor = "hub";
      this.townKey = "";
    });
    body.append(back);

    if (this.townVendor === "smith") {
      text("town-title", "Sable · Smith");
      text("town-sub", "Raises item level with salvaged materials. Weapons, armor, shields, and jewelry.");
      this.paintSmith(sim, body);
      return;
    }
    if (this.townVendor === "merchant") {
      text("town-title", "Merrick · Merchant");
      text("town-sub", "Buys spare gear for gold. Stock refreshes when you leave the ward for town.");
      this.paintMerchant(sim, body);
      return;
    }
    text("town-title", "Nyx · Gambler");
    text("town-sub", "Pays gold for a sealed parcel. Quality is a roll of the bones.");
    this.paintGambler(sim, body);
  }

  private paintSmith(sim: Sim, body: HTMLElement): void {
    const c = sim.character;
    const list = document.createElement("div");
    list.id = "town-list";
    const pieces = [
      ...GEAR_SLOTS.map((slot) => c.equipment[slot]).filter((item) => item && canUpgrade(item)),
      ...c.inventory.filter((item) => canUpgrade(item)),
    ];
    if (pieces.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No weapons, armor, or jewelry to improve. Salvage spare gear in the pack to gather materials.";
      list.append(empty);
      body.append(list);
      return;
    }
    for (const item of pieces) {
      if (!item) continue;
      const row = document.createElement("div");
      row.className = "town-row";
      const copy = document.createElement("div");
      const name = document.createElement("div");
      name.className = rarityClass(item);
      name.textContent = item.name;
      const live = liveItem(item, c.level);
      const meta = document.createElement("div");
      meta.className = "muted";
      const jewelry = item.slot === "ring" || item.slot === "neck" || item.slot === "earring";
      const stat = item.slot === "weapon" ? `${live.damageMin}–${live.damageMax} damage` : jewelry ? live.affixes.map((entry) => entry.label).join(", ") || "Jewelry" : `${live.armor} armor`;
      const bill = upgradeBill(item);
      const costText = bill.map((row) => `${row.count} ${MATERIAL_LABEL[row.id]}`).join(", ");
      meta.textContent = `Item level ${Math.max(1, item.ilvl || 1)} → ${Math.max(1, item.ilvl || 1) + 1}. ${stat}. Costs ${costText}.`;
      copy.append(name, meta);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Upgrade";
      button.disabled = bill.some((row) => materialCount(c, row.id) < row.count);
      button.addEventListener("click", () => {
        const error = upgradeItem(c, item.uid);
        text("town-note", error ?? `${item.name} is now item level ${item.ilvl}.`);
        if (!error) {
          sim.recompute();
          this.townKey = "";
          this.packKey = "";
          this.actions.changed();
        }
      });
      row.append(copy, button);
      list.append(row);
    }
    body.append(list);
  }

  private paintMerchant(sim: Sim, body: HTMLElement): void {
    const c = sim.character;
    this.refreshMerchantStock();
    const list = document.createElement("div");
    list.id = "town-list";

    const stockHead = document.createElement("h3");
    stockHead.textContent = "For sale";
    list.append(stockHead);
    if (this.merchantGoods.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Merrick's board is bare. Return from the ward later.";
      list.append(empty);
    }
    this.merchantGoods.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "town-row";
      const copy = document.createElement("div");
      const name = document.createElement("div");
      name.className = rarityClass(item);
      name.textContent = item.name;
      const meta = document.createElement("div");
      meta.className = "muted";
      const cost = buyPrice(item, c.level);
      meta.textContent = `${RARITY_LABEL[item.rarity]} · ${cost} gold`;
      copy.append(name, meta);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Buy";
      button.disabled = c.gold < cost;
      button.addEventListener("click", () => {
        const error = buyStockItem(c, this.merchantGoods, index);
        text("town-note", error ?? `Bought ${item.name}.`);
        if (!error) {
          this.townKey = "";
          this.packKey = "";
          this.actions.changed();
        }
      });
      row.append(copy, button);
      list.append(row);
    });

    const sellHead = document.createElement("h3");
    sellHead.textContent = "Sell from pack";
    list.append(sellHead);
    const sellables = c.inventory.filter((item) => item.slot !== "gem");
    if (sellables.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Nothing in the pack Merrick will buy.";
      list.append(empty);
    }
    for (const item of sellables) {
      const row = document.createElement("div");
      row.className = "town-row";
      const copy = document.createElement("div");
      const name = document.createElement("div");
      name.className = rarityClass(item);
      name.textContent = item.name;
      const meta = document.createElement("div");
      meta.className = "muted";
      meta.textContent = `${RARITY_LABEL[item.rarity]} · ${sellPrice(item, c.level)} gold`;
      copy.append(name, meta);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Sell";
      button.addEventListener("click", () => {
        const price = sellPrice(item, c.level);
        const error = sellItem(c, item.uid);
        text("town-note", error ?? `Sold ${item.name} for ${price} gold.`);
        if (!error) {
          this.townKey = "";
          this.packKey = "";
          this.actions.changed();
        }
      });
      row.append(copy, button);
      list.append(row);
    }
    body.append(list);
  }

  private paintGambler(sim: Sim, body: HTMLElement): void {
    const c = sim.character;
    const cost = gambleCost(c.level);
    const wrap = document.createElement("div");
    wrap.className = "town-gamble";
    const blurb = document.createElement("p");
    blurb.className = "muted";
    blurb.textContent = `Nyx draws a sealed parcel from the dark for ${cost} gold.`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary";
    button.textContent = `Gamble (${cost} gold)`;
    button.disabled = c.gold < cost;
    button.addEventListener("click", () => {
      const roll = gambleItem(c, Math.random, `nyx-${Date.now()}`);
      if (roll.error) {
        text("town-note", roll.error);
        return;
      }
      text("town-note", roll.item ? `Nyx reveals ${gambleBlurb(roll.item)}.` : "The parcel was empty.");
      sim.recompute();
      this.townKey = "";
      this.packKey = "";
      this.actions.changed();
    });
    wrap.append(blurb, button);
    body.append(wrap);
  }

  private townSignature(sim: Sim): string {
    const c = sim.character;
    const pieces = [...GEAR_SLOTS.map((slot) => c.equipment[slot]), ...c.inventory]
      .filter((item) => item && canUpgrade(item))
      .map((item) => `${item!.uid}:${item!.ilvl}:${item!.damageMin}:${item!.armor}`)
      .join(",");
    const mats = MATERIAL_ORDER.map((id) => materialCount(c, id)).join(",");
    const stock = this.merchantGoods.map((item) => item.uid).join(",");
    return `${this.townVendor}|${pieces}|${mats}|${c.gold}|${stock}|${c.inventory.length}`;
  }

  private packSignature(sim: Sim): string {
    const c = sim.character;
    const worn = GEAR_SLOTS.map((slot) => c.equipment[slot]?.uid ?? "").join(",");
    const bag = c.inventory.map((item) => `${item.uid}:${item.ilvl}:${item.gems.length}`).join(",");
    const gems = (c.gems ?? []).map((stack) => `${stack.kind}:${stack.quality}:${stack.count}`).join(",");
    return `${this.packTab}|${worn}|${bag}|${gems}|${(c.salvageMarks ?? []).join(",")}`;
  }

  private socketButtons(sim: Sim, itemUid: string, host: HTMLElement): void {
    const c = sim.character;
    const item = GEAR_SLOTS.map((slot) => c.equipment[slot]).find((entry) => entry?.uid === itemUid) ?? c.inventory.find((entry) => entry.uid === itemUid);
    if (!item || !item.gems.includes(null)) return;
    for (const stack of c.gems ?? []) {
      if (stack.count <= 0) continue;
      const button = document.createElement("button");
      button.type = "button";
      const label = gemStackName(stack.kind, stack.quality);
      button.textContent = `Socket ${label}`;
      button.addEventListener("click", () => {
        const error = socketGem(c, itemUid, stack.kind, stack.quality);
        text("pack-note", error ?? `Set ${label} into ${item.name}.`);
        if (!error) {
          sim.recompute();
          this.packKey = "";
          this.actions.changed();
        }
      });
      host.append(button);
    }
  }

  private open(id: string): boolean {
    return !must(id).classList.contains("hidden");
  }

  private show(id: string): void {
    must(id).classList.remove("hidden");
  }

  private hide(id: string): void {
    must(id).classList.add("hidden");
  }
}

function spreadRadius(radius: number): number {
  if (radius < 0.35) return 0.18;
  if (radius < 0.55) return 0.4;
  if (radius < 0.72) return 0.58;
  if (radius < 0.86) return 0.76;
  if (radius < 0.96) return 0.78;
  if (radius < 1.08) return 0.9;
  return 1;
}

function displayAngle(angle: number, sector: SectorId, filter: SectorId | "all"): number {
  let rel = angle - SECTORS[sector].angle;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  if (filter === "all") return SECTORS[sector].angle + rel * 1.55;
  if (sector !== filter) return angle;
  return rel * 4.6;
}

function must(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

function pointLabel(count: number): string {
  return `${count} skill point${count === 1 ? "" : "s"}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function text(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function gemIcon(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M12 3 19 9 12 21 5 9z" fill="currentColor" fill-opacity="0.85"/><path d="M5 9h14M8.2 9 12 3.6 15.8 9" fill="none"/></svg>`;
}

function gearIcon(slot: string, style: string): string {
  const kind =
    slot === "weapon" || slot === "offhand"
      ? style
      : slot === "shield"
        ? "shield"
        : slot.startsWith("ring")
          ? "ring"
          : slot.startsWith("ear")
            ? "ear"
            : slot;
  const shapes: Record<string, string> = {
    head: `<path d="M5 14c0-5 3.2-9 7-9s7 4 7 9v3H5z"/><path d="M8 17c1.2 2 6.8 2 8 0"/>`,
    ear: `<circle cx="12" cy="8" r="2.4"/><path d="M12 10.5v6"/><circle cx="12" cy="18.2" r="1.4" fill="currentColor" stroke="none"/>`,
    neck: `<path d="M4 8c2.6 3.2 13.4 3.2 16 0"/><circle cx="12" cy="16" r="3"/>`,
    melee: `<path d="M12 2.5v11"/><path d="M8 7.5h8"/><path d="M10 14.5 12 21l2-6.5"/>`,
    bow: `<path d="M8 3.5c7 4 7 13 0 17"/><path d="M8 3.5v17"/><path d="M8 12h7"/>`,
    handbow: `<path d="M7 5h10v4H7z"/><path d="M17 7h3"/><path d="M6 6.5 4 12h3"/>`,
    thrown: `<path d="M6 18 18 6"/><path d="M14 6h4v4"/>`,
    focus: `<path d="M12 3.5 18.5 12 12 20.5 5.5 12z"/>`,
    shield: `<path d="M12 3 19 6v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6z"/>`,
    chest: `<path d="M6 5h12l2 14H4z"/><path d="M12 5v14"/>`,
    gloves: `<path d="M8 11V6.5M11 11V5.5M14 11V7"/><path d="M6 11h12v3c0 4-2.2 7-6 7s-6-3-6-7z"/>`,
    belt: `<path d="M3 10h18v4H3z"/><path d="M9 9h6v6H9z"/>`,
    boots: `<path d="M8 3.5h5v10l5 2v4H6v-5l2-2z"/>`,
    ring: `<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>`,
  };
  const shape = shapes[kind] ?? shapes.chest;
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
}

function rarityClass(item: { rarity: string; ethereal: boolean; uniqueId: string | null }): string {
  return `${item.uniqueId ? "unique" : `rarity-${item.rarity}`}${item.ethereal ? " ethereal" : ""}`;
}

let currentFn: () => Sim = () => {
  throw new Error("Game is not ready.");
};

export function bindSim(sim: () => Sim): void {
  currentFn = sim;
}

function current(): Sim {
  return currentFn();
}
