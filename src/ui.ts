import { classTitle, refundStat, retrain, retrainCost, slotSkill, spendSkill, spendStat, canSpendSkill } from "./game/character";
import { derive, requirementText, xpGoal } from "./game/formulas";
import { equipItem, gemKind, itemSummary, socketGem, unequipItem } from "./game/items";
import { describeSkill, SECTORS, SKILLS, scaledActive, skillById } from "./game/skills";
import type { Sim } from "./game/sim";
import { ATTRS, GEAR_SLOTS, MAX_LEVEL, PARAGON_CAP, type Attr, type SectorId, type SlotName } from "./game/types";

export class Ui {
  treeFilter: SectorId | "all" = "all";
  selectedId: string | null = null;
  private session: Record<Attr, number> = { strength: 0, agility: 0, endurance: 0, wisdom: 0 };
  private treeKey = "";
  private packKey = "";
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

  blocking(): boolean {
    return ["title", "sheet", "tree", "pack", "dead", "privacy"].some((id) => this.open(id));
  }

  closeTop(): boolean {
    for (const id of ["privacy", "pack", "tree", "sheet"]) {
      if (this.open(id)) {
        this.hide(id);
        return true;
      }
    }
    return false;
  }

  showTitle(hasSave: boolean): void {
    this.show("title");
    const cont = must("continue");
    cont.toggleAttribute("hidden", !hasSave);
  }

  hideTitle(): void {
    this.hide("title");
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
    text("identity", `${classTitle(c)}  ·  ${rank}`);
    text("wave-label", sim.phase === "between" ? "The ward stills" : `Wave ${sim.wave}`);
    text("gold", `${c.gold}`);
    const bar = must("xp-fill");
    const goal = xpGoal(c);
    bar.style.width = `${c.level >= MAX_LEVEL && c.paragon >= PARAGON_CAP ? 100 : Math.min(100, (c.xp / goal) * 100)}%`;
    text("hp-text", sim.player.shield > 0 ? `${Math.ceil(sim.player.hp)}+${Math.ceil(sim.player.shield)}` : `${Math.ceil(sim.player.hp)}`);
    text("hp-max", `${derived.life}`);
    text("mana-text", `${Math.ceil(sim.player.mana)}`);
    text("mana-max", `${derived.mana}`);
    const life = must("life-globe");
    const mana = must("mana-globe");
    life.style.setProperty("--fill", String(sim.player.hp / derived.life));
    mana.style.setProperty("--fill", String(sim.player.mana / Math.max(1, derived.mana)));
    must("btn-character").classList.toggle("attention", c.unspentStats > 0);
    must("btn-tree").classList.toggle("attention", c.unspentSkills > 0);
    const banner = must("banner");
    banner.classList.toggle("hidden", sim.bannerT <= 0 || sim.banner.length === 0);
    banner.textContent = sim.banner;
    const near = sim.nearestItemDrop();
    const loot = must("loot");
    loot.classList.toggle("hidden", !near);
    if (near) loot.dataset.drop = String(near.id);

    for (let i = 0; i < 3; i++) {
      const button = must(`skill-${i}`);
      const id = c.slotted[i];
      const spec = id ? scaledActive(id, c.skillRanks[id] ?? 0) : null;
      const skill = id ? skillById(id) : undefined;
      button.textContent = skill ? skill.name : "Empty";
      const max = spec ? Math.max(0.2, spec.cooldown) : 1;
      const ratio = spec && spec.kind !== "aura" ? Math.min(1, sim.player.skillCd[i]! / max) : 0;
      button.style.setProperty("--cd", String(ratio));
      button.classList.toggle("on", !!sim.player.auras[i]);
      button.classList.toggle("empty", !skill);
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
      const c = sim.character;
      const key = [...GEAR_SLOTS.map((slot) => c.equipment[slot]?.uid ?? ""), ...c.inventory.map((item) => `${item.uid}:${item.gems.join(",")}`)].join("|");
      if (key !== this.packKey) {
        this.packKey = key;
        this.paintPack(sim);
      }
    }
  }

  private bindStatic(): void {
    must("close-sheet").addEventListener("click", () => this.hide("sheet"));
    must("close-tree").addEventListener("click", () => this.hide("tree"));
    must("close-pack").addEventListener("click", () => this.hide("pack"));
    must("close-privacy").addEventListener("click", () => this.hide("privacy"));
    must("btn-character").addEventListener("click", () => this.openSheet());
    must("btn-tree").addEventListener("click", () => this.openTree());
    must("btn-pack").addEventListener("click", () => {
      this.show("pack");
    });
    must("open-privacy").addEventListener("click", () => this.show("privacy"));
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
    this.session = { strength: 0, agility: 0, endurance: 0, wisdom: 0 };
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
    this.session = { strength: 0, agility: 0, endurance: 0, wisdom: 0 };
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
    text("sheet-title", "Ward");
    text("sheet-level", c.paragon > 0 ? `${classTitle(c)}  ·  Level ${c.level}  ·  Paragon ${c.paragon}` : `${classTitle(c)}  ·  Level ${c.level}`);
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
    text("s-mana", `${d.mana}`);
    text("s-dodge", pct(d.evasion));
    text("s-ecdr", pct(sim.mods.cdr));
    text("s-eregen", d.manaRegen.toFixed(1));
    text("s-gf", pct(d.goldFind));
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
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", String(at.x));
      label.setAttribute("y", String(at.y + 4));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", rank > 0 ? "#1a120c" : "#f0e2cf");
      label.setAttribute("font-size", "11");
      label.style.pointerEvents = "none";
      label.textContent = rank > 0 ? String(rank) : gate.ok ? "+" : "";
      svg.append(label);
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
    text("tree-blurb", describeSkill(skill.id, Math.max(1, rank)));
    text(
      "tree-next",
      rank > 0 && rank < skill.maxRank
        ? `Next rank (${rank + 1}): ${describeSkill(skill.id, rank + 1)}`
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
      head: "Head",
      chest: "Chest",
      belt: "Belt",
      boots: "Boots",
      gloves: "Gloves",
      ring1: "Ring",
      ring2: "Ring",
      neck: "Necklace",
    };
    for (const slot of GEAR_SLOTS) {
      const item = c.equipment[slot];
      const el = must(`eq-${slot}`);
      el.innerHTML = "";
      const title = document.createElement("div");
      title.className = "slot-label";
      title.textContent = labels[slot];
      el.append(title);
      const name = document.createElement("div");
      name.textContent = item ? item.name : "Empty";
      name.className = item ? rarityClass(item) : "";
      el.append(name);
      if (item) {
        const meta = document.createElement("div");
        meta.className = "muted";
        meta.textContent = `${itemSummary(item, c.level)}. ${item.affixes.map((affix) => affix.label).join(", ")}`;
        el.append(meta);
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Remove";
        button.addEventListener("click", () => {
          const error = unequipItem(c, slot);
          text("pack-note", error ?? `Removed ${item.name}.`);
          if (!error) {
            sim.recompute();
            this.packKey = "";
            this.actions.changed();
          }
        });
        el.append(button);
        this.socketButtons(sim, item.uid, el);
      }
    }
    const list = must("pack-list");
    list.innerHTML = "";
    if (c.inventory.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "The pack is empty. Gear and gems fall in the ward.";
      list.append(empty);
      return;
    }
    for (const item of c.inventory) {
      const row = document.createElement("div");
      row.className = "pack-row";
      const copy = document.createElement("div");
      const name = document.createElement("div");
      name.className = rarityClass(item);
      name.textContent = item.name;
      const meta = document.createElement("div");
      meta.className = "muted";
      const req = requirementText(item);
      const affix = item.slot === "gem" ? "" : item.affixes.map((entry) => entry.label).join(", ");
      meta.textContent = `${itemSummary(item, c.level)}${affix ? `. ${affix}` : ""}${req ? `. ${req}` : ""}`;
      copy.append(name, meta);
      row.append(copy);
      if (item.slot !== "gem") {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Equip";
        button.addEventListener("click", () => {
          const error = equipItem(c, item.uid);
          text("pack-note", error ?? `Equipped ${item.name}.`);
          if (!error) {
            sim.recompute();
            this.packKey = "";
            this.actions.changed();
          }
        });
        row.append(button);
        this.socketButtons(sim, item.uid, row);
      }
      list.append(row);
    }
  }

  private socketButtons(sim: Sim, itemUid: string, host: HTMLElement): void {
    const c = sim.character;
    const item = GEAR_SLOTS.map((slot) => c.equipment[slot]).find((entry) => entry?.uid === itemUid) ?? c.inventory.find((entry) => entry.uid === itemUid);
    if (!item || !item.gems.includes(null)) return;
    for (const gem of c.inventory) {
      const kind = gemKind(gem);
      if (!kind) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Socket ${gem.name}`;
      button.addEventListener("click", () => {
        const error = socketGem(c, itemUid, gem.uid);
        text("pack-note", error ?? `Set ${gem.name} into ${item.name}.`);
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
  if (radius < 0.96) return 0.9;
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
