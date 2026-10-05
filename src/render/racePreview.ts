import * as THREE from "three";
import type { RaceId } from "../game/types";
import { buildHero, HERO_HEIGHT } from "./heroes";

/** Lightweight spinning preview of the handcrafted race models for character creation. */
export class RacePreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly pivot = new THREE.Group();
  private hero: THREE.Group | null = null;
  private race: RaceId | null = null;
  private frame = 0;
  private running = false;
  private readonly onFrame = (time: number) => this.tick(time);

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    this.camera.position.set(0, 1.15, 3.4);
    this.camera.lookAt(0, 0.95, 0);
    this.scene.add(new THREE.AmbientLight(0xd8c8b0, 0.85));
    const key = new THREE.DirectionalLight(0xfff0dc, 1.15);
    key.position.set(2.2, 4.2, 3.4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9bb8d8, 0.45);
    rim.position.set(-2.4, 1.6, -2.2);
    this.scene.add(rim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 32),
      new THREE.MeshBasicMaterial({ color: 0x1a1511, transparent: true, opacity: 0.55 }),
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
    this.hero = buildHero(race);
    this.race = race;
    this.pivot.add(this.hero);
    const height = HERO_HEIGHT[race];
    this.camera.position.set(0, height * 0.62, Math.max(2.6, height * 1.7));
    this.camera.lookAt(0, height * 0.52, 0);
    this.start();
    this.draw();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.frame = requestAnimationFrame(this.onFrame);
  }

  stop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  dispose(): void {
    this.stop();
    if (this.hero) this.pivot.remove(this.hero);
    this.hero = null;
    this.race = null;
    this.renderer.dispose();
  }

  private tick(time: number): void {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.onFrame);
    this.pivot.rotation.y = time * 0.00055;
    this.draw();
  }

  private draw(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.floor(width * dpr) || this.canvas.height !== Math.floor(height * dpr)) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.render(this.scene, this.camera);
  }
}
