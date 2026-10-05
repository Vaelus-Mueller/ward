import * as THREE from "three";
import type { RaceId } from "../game/types";
import { buildHero, heroAnimationClips, HERO_HEIGHT } from "./heroes";

/** Lightweight spinning preview of the handcrafted race models for character creation. */
export class RacePreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly pivot = new THREE.Group();
  private hero: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private race: RaceId | null = null;
  private frame = 0;
  private running = false;
  private lastTime = 0;
  private readonly onFrame = (time: number) => this.tick(time);

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

  show(race: RaceId): void {
    if (this.race === race && this.hero) {
      this.start();
      return;
    }
    if (this.hero) this.pivot.remove(this.hero);
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.hero = buildHero(race);
    this.race = race;
    this.pivot.add(this.hero);
    this.mixer = new THREE.AnimationMixer(this.hero);
    const battle = heroAnimationClips(race).find((clip) => clip.name === "Idle_Combat");
    if (battle) {
      const action = this.mixer.clipAction(battle);
      action.play();
    }
    const height = HERO_HEIGHT[race];
    this.camera.position.set(0, height * 0.62, Math.max(2.6, height * 1.7));
    this.camera.lookAt(0, height * 0.52, 0);
    this.start();
    this.draw();
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

  dispose(): void {
    this.stop();
    this.mixer?.stopAllAction();
    this.mixer = null;
    if (this.hero) this.pivot.remove(this.hero);
    this.hero = null;
    this.race = null;
    this.renderer.dispose();
  }

  private tick(time: number): void {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.onFrame);
    const dt = this.lastTime ? Math.min(0.05, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    this.pivot.rotation.y = time * 0.00055;
    this.mixer?.update(dt);
    this.draw();
  }

  private draw(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    // Keep PR #1 preview DPR (1.85) — polish does not need the 1.75 cap.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.85);
    if (this.canvas.width !== Math.floor(width * dpr) || this.canvas.height !== Math.floor(height * dpr)) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.render(this.scene, this.camera);
  }
}
