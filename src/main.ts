import "./style.css";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { AudioBus } from "./audio";
import { createCharacter } from "./game/character";
import { readSave, writeSave } from "./game/save";
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

must("new-game").addEventListener("click", () => {
  audio.hit();
  box.sim = new Sim(createCharacter(), Date.now() >>> 0 || 1);
  box.sim.begin();
  startRun();
});

must("continue").addEventListener("click", () => {
  const save = readSave(localStorage);
  if (!save) return;
  box.sim = new Sim(save.character, 1);
  box.sim.applySnapshot(save);
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
  if (box.sim.character.unspentStats > 0 || box.sim.character.unspentSkills > 0) {
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

ui.showTitle(readSave(localStorage) !== null);
paintMute();
void nativeChrome();

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

function startRun(): void {
  box.started = true;
  ui.hideTitle();
  must("hud").classList.remove("hidden");
  must("dead").classList.add("hidden");
  last = performance.now();
  persist();
}

function persist(): void {
  if (!box.started) return;
  writeSave(localStorage, box.sim.toSnapshot());
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
