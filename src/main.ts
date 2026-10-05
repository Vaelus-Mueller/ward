import "./style.css";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { AudioBus } from "./audio";
import { createCharacter } from "./game/character";
import { cleanName, clearSlot, nameSlot, readSlots, writeSlot } from "./game/save";
import { Sim } from "./game/sim";
import { Input } from "./input";
import { Renderer } from "./render";
import { bindSim, Ui } from "./ui";

const canvas = document.querySelector("#view") as HTMLCanvasElement;
const audio = new AudioBus();
if (localStorage.getItem("vaelus-mute") === "1") audio.toggle();

const box = { sim: new Sim(createCharacter(), 1), started: false };
if (import.meta.env.DEV) (window as unknown as { __vaelus?: typeof box }).__vaelus = box;
bindSim(() => box.sim);

const ui = new Ui({
  changed: () => persist(),
  mutedLabel: () => (audio.muted ? "Sound off" : "Sound"),
});
const renderer = new Renderer(canvas);
const input = new Input(canvas, must("joy"), (x, y) => renderer.pick(x, y));

let activeSlot = 0;

must("save-slots").addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-play], [data-delete]");
  if (!target) return;
  if (target.dataset.delete !== undefined) {
    const index = Number(target.dataset.delete);
    if (index < 0 || index > 2) return;
    const slot = readSlots(localStorage)[index];
    if (!slot?.save) return;
    const label = slot.name || slot.save.character.name || `Slot ${index + 1}`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    audio.hit();
    clearSlot(localStorage, index);
    (must(`slot-name-${index}`) as HTMLInputElement).value = "";
    ui.showTitle();
    return;
  }
  const index = Number(target.dataset.play);
  if (index < 0 || index > 2) return;
  audio.hit();
  playSlot(index);
});

must("save-slots").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (!input.dataset.slot) return;
  nameSlot(localStorage, Number(input.dataset.slot), input.value);
  ui.showTitle();
});

must("create-enter").addEventListener("click", () => {
  audio.hit();
  const choice = ui.createChoice();
  activeSlot = choice.slot;
  const name = cleanName(choice.name);
  (must(`slot-name-${choice.slot}`) as HTMLInputElement).value = name;
  nameSlot(localStorage, choice.slot, name);
  box.sim = new Sim(createCharacter(name, choice.race), Date.now() >>> 0 || 1);
  box.sim.begin();
  startRun();
});

must("retry").addEventListener("click", () => {
  box.sim.retry();
  ui.hideDead();
  persist();
});

must("btn-mute").addEventListener("click", () => {
  audio.toggle();
  localStorage.setItem("vaelus-mute", audio.muted ? "1" : "0");
  paintMute();
});

must("banner").addEventListener("click", () => {
  if (
    box.sim.character.unspentStats > 0 ||
    box.sim.character.unspentSkills > 0 ||
    (box.sim.character.unspentClass ?? 0) > 0
  ) {
    must("btn-character").click();
  }
});

const attack = must("attack");
let attackPointer: number | null = null;
attack.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  attackPointer = event.pointerId;
  input.holdAttack(true);
});
const releaseAttack = (event: PointerEvent) => {
  if (event.pointerId !== attackPointer) return;
  attackPointer = null;
  input.holdAttack(false);
};
window.addEventListener("pointerup", releaseAttack);
window.addEventListener("pointercancel", releaseAttack);

for (let i = 0; i < 3; i++) {
  const index = i as 0 | 1 | 2;
  must(`skill-${i}`).addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (box.sim.character.slotted[index] === null) {
      must("btn-tree").click();
      return;
    }
    input.pulseSkill(index);
  });
}

must("loot").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  const id = Number((event.currentTarget as HTMLElement).dataset.drop);
  if (Number.isFinite(id)) input.pulseLoot(id);
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && ui.closeTop()) return;
  if (ui.blocking() || event.repeat) return;
  if (event.code === "KeyC") must("btn-character").click();
  if (event.code === "KeyK") must("btn-tree").click();
  if (event.code === "KeyI") must("btn-pack").click();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) persist();
});

paintMute();
void nativeChrome();
void bootSplash();

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  renderer.resize();
  renderer.lookAt(box.sim);
  if (box.started && ui.resting()) {
    box.sim.rest(dt);
  } else if (box.started && !ui.blocking()) {
    const result = box.sim.update(input.sample(), dt);
    if (result.enemyHit) audio.hit();
    if (result.playerHit) audio.hurt();
    if (result.eliteAggro) audio.eliteAggro();
    if (result.uniqueFind) audio.uniqueFind();
    if (result.maxCritDealt) audio.maxCritDealt();
    if (result.maxCritTaken) audio.maxCritTaken();
    if (result.townReady) ui.arriveTown();
    if (result.leveled > 0) {
      audio.level();
      persist();
    }
    if (result.died) {
      audio.hurt();
      ui.showDead();
      persist();
    }
  }
  renderer.draw(box.sim);
  ui.sync(box.sim);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

async function bootSplash(): Promise<void> {
  const splash = must("splash");
  const status = must("splash-status");
  const fill = must("splash-fill");
  const pct = must("splash-pct");
  const bar = must("splash-bar");
  const enter = must("splash-enter");

  const paintProgress = (ratio: number, label: string) => {
    const installTick = (window as unknown as { __wardInstallTick?: number }).__wardInstallTick;
    if (installTick) {
      window.clearInterval(installTick);
      (window as unknown as { __wardInstallTick?: number }).__wardInstallTick = undefined;
    }
    const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    fill.style.width = `${percent}%`;
    pct.textContent = `${percent}%`;
    status.textContent = label;
    bar.setAttribute("aria-valuenow", String(percent));
  };

  // Hand off from the HTML "Installing…" bootstrap into real asset load.
  paintProgress(0.04, "Loading assets…");

  let entered = false;
  const ensureMusic = () => {
    audio.startOminous();
  };
  ensureMusic();
  const onGesture = () => ensureMusic();
  splash.addEventListener("pointerdown", onGesture);
  enter.addEventListener("click", (event) => {
    event.preventDefault();
    ensureMusic();
  });

  renderer.onLoadProgress((info) => {
    // Keep a little headroom so 100% only lands when fully ready.
    paintProgress(Math.min(0.97, Math.max(0.04, info.ratio)), info.label);
  });

  await renderer.whenReady();
  paintProgress(1, "The gate is open");
  splash.classList.add("ready");
  enter.classList.remove("hidden");
  splash.setAttribute("aria-busy", "false");

  // Always require a tap so Chrome/Safari unlock the AudioContext if needed.
  await new Promise<void>((resolve) => {
    const done = () => {
      if (entered) return;
      entered = true;
      ensureMusic();
      resolve();
    };
    enter.addEventListener("click", done, { once: true });
    splash.addEventListener(
      "pointerdown",
      (event) => {
        if ((event.target as HTMLElement).closest("#splash-enter")) return;
        done();
      },
      { once: true },
    );
  });

  status.textContent = "Enter the ruin";
  await sleep(420);
  splash.removeEventListener("pointerdown", onGesture);
  splash.classList.add("fade-out");
  ui.showTitle();
  await sleep(920);
  splash.classList.add("hidden");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function startRun(): void {
  box.started = true;
  audio.stopOminous(1200);
  ui.hideTitle();
  must("hud").classList.remove("hidden");
  must("dead").classList.add("hidden");
  last = performance.now();
  persist();
}

function playSlot(index: number): void {
  activeSlot = index;
  const name = cleanName((must(`slot-name-${index}`) as HTMLInputElement).value);
  const existing = readSlots(localStorage)[index]?.save;
  if (existing) {
    existing.character.name = name;
    box.sim = new Sim(existing.character, 1);
    box.sim.applySnapshot(existing);
    box.sim.begin();
    startRun();
    return;
  }
  ui.openCreate(index, name);
}

function persist(): void {
  if (!box.started) return;
  writeSlot(localStorage, activeSlot, box.sim.toSnapshot());
}

function paintMute(): void {
  must("btn-mute").textContent = audio.muted ? "Sound off" : "Sound";
}

function must(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

async function nativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0e0d0b" });
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.hide();
  } catch {
    // Status bar styling is Android-only.
  }
  await App.addListener("backButton", () => {
    if (!ui.closeTop()) void App.minimizeApp();
  });
}
