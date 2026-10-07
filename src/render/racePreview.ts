import * as THREE from "three";
import type { Gender, Item, RaceId, SlotName } from "../game/types";
import { emptyEquipment, GEAR_SLOTS } from "../game/types";
import { syncHeroGear } from "./gear";
import { buildHero, heroAnimationClips, heroHeightFor } from "./heroes";

function gearKey(equipment: Record<SlotName, Item | null>): string {
  return GEAR_SLOTS.map((slot) => equipment[slot]?.uid ?? "").join("|");
}

export interface PreviewShowOpts {
  /** Create screen spins; save-slot portraits stay put. Default true. */
  spin?: boolean;
}

/** Lightweight hero preview for create screen + save-slot portraits. */
export class RacePreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly pivot = new THREE.Group();
  private hero: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  private attackAction: THREE.AnimationAction | null = null;
  private race: RaceId | null = null;
  private gender: Gender | null = null;
  private equippedKey = "";
  private equipment: Record<SlotName, Item | null> = emptyEquipment();
  private spin = true;
  private attacking = false;
  private frame = 0;
  private running = false;
  private lastTime = 0;
  private readonly onFrame = (time: number) => this.tick(time);
  private readonly onAttackFinished = (event: THREE.Event) => this.handleAttackFinished(event);

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    this.camera.position.set(0, 1.15, 3.4);
    this.camera.lookAt(0, 0.95, 0);
    this.scene.add(new THREE.HemisphereLight(0xfff4e6, 0x6e6254, 0.85));
    const key = new THREE.DirectionalLight(0xfff0dc, 1.35);
    key.position.set(2.2, 4.2, 3.4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9bb8d8, 0.55);
    rim.position.set(-2.4, 1.6, -2.2);
    this.scene.add(rim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 48),
      new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.82, metalness: 0.08 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    this.scene.add(floor);
    this.scene.add(this.pivot);
  }

  show(race: RaceId, gender: Gender = "male", equipment?: Record<SlotName, Item | null>, opts: PreviewShowOpts = {}): void {
    const eq = equipment ?? emptyEquipment();
    const key = gearKey(eq);
    this.spin = opts.spin !== false;
    if (!this.spin) this.pivot.rotation.y = 0.4;
    if (this.race === race && this.gender === gender && this.equippedKey === key && this.hero) {
      this.equipment = eq;
      if (!this.attacking) this.ensureCombatIdle();
      this.start();
      return;
    }
    this.teardownHero();
    this.hero = buildHero(race, gender);
    syncHeroGear(this.hero, eq, performance.now());
    this.race = race;
    this.gender = gender;
    this.equippedKey = key;
    this.equipment = eq;
    this.pivot.add(this.hero);
    this.mixer = new THREE.AnimationMixer(this.hero);
    const clips = heroAnimationClips(race);
    const battle = clips.find((clip) => clip.name === "Idle_Combat");
    const attack = clips.find((clip) => clip.name === "1H_Melee_Attack_Slice_Horizontal");
    if (battle) {
      this.idleAction = this.mixer.clipAction(battle);
      this.idleAction.play();
    }
    if (attack) {
      this.attackAction = this.mixer.clipAction(attack);
      this.attackAction.setLoop(THREE.LoopOnce, 1);
      this.attackAction.clampWhenFinished = true;
    }
    const height = heroHeightFor(race, gender);
    this.camera.position.set(0, height * 0.62, Math.max(2.6, height * 1.7));
    this.camera.lookAt(0, height * 0.52, 0);
    this.attacking = false;
    this.start();
    this.draw();
  }

  /** One weapon swing, then return to combat idle. */
  playAttackOnce(): void {
    if (!this.mixer || !this.attackAction || !this.idleAction) return;
    this.start();
    this.attacking = true;
    this.mixer.removeEventListener("finished", this.onAttackFinished);
    this.mixer.addEventListener("finished", this.onAttackFinished);
    this.idleAction.fadeOut(0.08);
    this.attackAction.reset();
    this.attackAction.setEffectiveWeight(1);
    this.attackAction.fadeIn(0.06).play();
  }

  clear(): void {
    this.stop();
    this.teardownHero();
    this.race = null;
    this.gender = null;
    this.equippedKey = "";
    this.equipment = emptyEquipment();
    this.draw();
  }

  /** Free GPU resources — call when leaving title/create. Avoid forceContextLoss (can nuke sibling contexts on Android). */
  dispose(): void {
    this.stop();
    this.teardownHero();
    this.race = null;
    this.gender = null;
    this.equippedKey = "";
    this.equipment = emptyEquipment();
    try {
      this.renderer.dispose();
    } catch {
      // Already lost.
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = 0;
    this.frame = requestAnimationFrame(this.onFrame);
  }

  stop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private ensureCombatIdle(): void {
    if (!this.idleAction || this.attacking) return;
    if (!this.idleAction.isRunning()) this.idleAction.reset().fadeIn(0.1).play();
  }

  private handleAttackFinished(event: THREE.Event): void {
    const action = (event as THREE.Event & { action?: THREE.AnimationAction }).action;
    if (action !== this.attackAction) return;
    this.mixer?.removeEventListener("finished", this.onAttackFinished);
    this.attacking = false;
    this.attackAction?.fadeOut(0.1);
    this.idleAction?.reset().fadeIn(0.12).play();
  }

  private teardownHero(): void {
    this.mixer?.removeEventListener("finished", this.onAttackFinished);
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.idleAction = null;
    this.attackAction = null;
    this.attacking = false;
    if (this.hero) {
      this.pivot.remove(this.hero);
      this.hero = null;
    }
  }

  private tick(time: number): void {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.onFrame);
    const dt = this.lastTime ? Math.min(0.05, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    if (this.spin) this.pivot.rotation.y += dt * 0.55;
    this.mixer?.update(dt);
    if (this.hero) syncHeroGear(this.hero, this.equipment, performance.now());
    this.draw();
  }

  private draw(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w > 0 && h > 0) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.render(this.scene, this.camera);
  }
}
