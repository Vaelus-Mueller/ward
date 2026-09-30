import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { classTitle } from "./game/character";
import { ARENA, type Item } from "./game/types";
import type { Burst, Enemy, FloatText, Shot, Sim } from "./game/sim";

const SCALE = 0.045;
const MODEL_URL = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;

const FILES: Record<string, string> = {
  knight: "knight.glb",
  rogue: "rogue.glb",
  mage: "mage.glb",
  hound: "hound.glb",
  sentinel: "sentinel.glb",
  archer: "archer.glb",
  brute: "brute.glb",
  floor: "floor.glb",
  wall: "wall.glb",
  "wall-broken": "wall-broken.glb",
  pillar: "pillar.glb",
  column: "column.glb",
};

const HEIGHT: Record<string, number> = {
  knight: 1.75,
  rogue: 1.7,
  mage: 1.72,
  hound: 1.15,
  sentinel: 1.8,
  archer: 1.72,
  brute: 2.55,
};

interface ClipSet {
  scene: THREE.Object3D;
  clips: THREE.AnimationClip[];
}

interface Actor {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  idle?: THREE.AnimationAction;
  walk?: THREE.AnimationAction;
  attack?: THREE.AnimationAction;
  hit?: THREE.AnimationAction;
  mode: string;
  placeholder: boolean;
  kind: string;
  attackLeft: number;
  attackDur: number;
  held: boolean;
  armed: boolean;
  hitLeft: number;
  hurt: boolean;
  slash?: THREE.Mesh;
  blade?: THREE.Mesh;
  bar?: THREE.Group;
  hpFill?: THREE.Mesh;
}

export class Renderer {
  camX = 0;
  camY = 0;
  private readonly webgl: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly hitPoint = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly templates = new Map<string, ClipSet>();
  private readonly enemies = new Map<number, Actor>();
  private readonly enemyRoots: THREE.Object3D[] = [];
  private player: Actor | null = null;
  private playerKind = "";
  private readonly shots: THREE.Group[] = [];
  private readonly bursts: { kind: string; group: THREE.Group }[] = [];
  private readonly rings: THREE.Mesh[] = [];
  private readonly drops: THREE.Mesh[] = [];
  private readonly floatLayer: HTMLElement;
  private readonly floatNodes: HTMLSpanElement[] = [];
  private last = performance.now();
  private lastPlayer = new THREE.Vector2();
  private propsBuilt = false;
  private realm: "dungeon" | "hell" | "" = "";
  private readonly groundMat: THREE.MeshStandardMaterial;
  private hemi!: THREE.HemisphereLight;
  private moon!: THREE.DirectionalLight;
  private fill!: THREE.DirectionalLight;
  private ember!: THREE.PointLight;
  private stone?: THREE.Texture;
  private stoneRough?: THREE.Texture;
  private lava?: THREE.Texture;
  private lavaRough?: THREE.Texture;

  constructor(private canvas: HTMLCanvasElement) {
    this.webgl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.webgl.setClearColor(0x3a342e);
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.28;
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 200);
    this.scene.fog = new THREE.Fog(0x6d6256, 36, 110);
    this.hemi = new THREE.HemisphereLight(0xfff6ea, 0x8a6a48, 1.45);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xfff8f0, 2.1);
    this.moon.position.set(-8, 20, 12);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    this.moon.shadow.bias = -0.0006;
    this.moon.shadow.camera.near = 1;
    this.moon.shadow.camera.far = 36;
    const shadow = this.moon.shadow.camera;
    shadow.left = -12;
    shadow.right = 12;
    shadow.top = 12;
    shadow.bottom = -12;
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);
    this.fill = new THREE.DirectionalLight(0xc9d4e4, 0.45);
    this.fill.position.set(12, 8, -8);
    this.scene.add(this.fill);
    this.ember = new THREE.PointLight(0xffb56a, 22, 40, 2);
    this.ember.position.set((ARENA.width * SCALE) / 2, 3.2, (ARENA.height * SCALE) / 2);
    this.scene.add(this.ember);
    this.groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.width * SCALE, ARENA.height * SCALE), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((ARENA.width * SCALE) / 2, -0.02, (ARENA.height * SCALE) / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.floatLayer = document.createElement("div");
    this.floatLayer.id = "float-layer";
    canvas.parentElement?.appendChild(this.floatLayer);
    void this.loadModels();
    void this.loadFloors();
  }

  resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.webgl.setPixelRatio(dpr);
    this.webgl.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  lookAt(sim: Sim): void {
    const x = sim.player.x * SCALE;
    const z = sim.player.y * SCALE;
    this.camera.position.set(x, 10.46, z + 9.5);
    this.camera.lookAt(x, 1.15, z);
    this.moon.position.set(x - 5, 14, z + 6);
    this.moon.target.position.set(x, 0, z);
    this.moon.target.updateMatrixWorld();
  }

  pick(clientX: number, clientY: number): { x: number; y: number; enemyId: number | null } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.enemyRoots, true);
    for (const hit of hits) {
      let node: THREE.Object3D | null = hit.object;
      while (node) {
        if (typeof node.userData.enemyId === "number") {
          return { x: node.userData.simX as number, y: node.userData.simY as number, enemyId: node.userData.enemyId as number };
        }
        node = node.parent;
      }
    }
    if (!this.raycaster.ray.intersectPlane(this.ground, this.hitPoint)) return null;
    return { x: this.hitPoint.x / SCALE, y: this.hitPoint.z / SCALE, enemyId: null };
  }

  draw(sim: Sim): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.propsBuilt && this.templates.has("wall")) this.buildDungeon();
    this.applyRealm(sim.character.level > 20 ? "hell" : "dungeon");
    this.syncPlayer(sim, dt);
    this.syncEnemies(sim, dt);
    this.syncShots(sim.shots);
    this.syncBursts(sim.bursts);
    this.syncRings(sim.enemies);
    this.syncDrops(sim);
    this.syncFloats(sim.floats);
    this.webgl.render(this.scene, this.camera);
  }

  private async loadFloors(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const url = (file: string) => `${import.meta.env.BASE_URL}textures/${file}`;
    try {
      const [stone, stoneRough, lava, lavaRough] = await Promise.all([
        loader.loadAsync(url("dungeon_diff.jpg")),
        loader.loadAsync(url("dungeon_rough.jpg")),
        loader.loadAsync(url("hell_diff.jpg")),
        loader.loadAsync(url("hell_rough.jpg")),
      ]);
      this.stone = prepFloor(stone, true);
      this.stoneRough = prepFloor(stoneRough, false);
      this.lava = prepFloor(lava, true);
      this.lavaRough = prepFloor(lavaRough, false);
      this.realm = "";
    } catch {
      // The colored floor remains if a texture is missing.
    }
  }

  private applyRealm(next: "dungeon" | "hell"): void {
    if (this.realm === next) return;
    const fog = this.scene.fog as THREE.Fog;
    if (next === "dungeon") {
      this.groundMat.map = this.stone ?? null;
      this.groundMat.roughnessMap = this.stoneRough ?? null;
      this.groundMat.emissiveMap = null;
      this.groundMat.emissive.set(0x000000);
      this.groundMat.emissiveIntensity = 0;
      this.groundMat.color.set(0xffffff);
      this.groundMat.roughness = 0.95;
      this.webgl.setClearColor(0x4c463e);
      fog.color.set(0x8d8478);
      fog.near = 34;
      fog.far = 120;
      this.hemi.color.set(0xfff4e6);
      this.hemi.groundColor.set(0x6e6254);
      this.hemi.intensity = 1.35;
      this.moon.color.set(0xfff7ee);
      this.moon.intensity = 1.85;
      this.fill.color.set(0xc5d0de);
      this.fill.intensity = 0.4;
      this.ember.color.set(0xffb56a);
      this.ember.intensity = 18;
      this.tintScenery(0xd5ddd8);
    } else {
      this.groundMat.map = this.lava ?? null;
      this.groundMat.roughnessMap = this.lavaRough ?? null;
      this.groundMat.emissiveMap = this.lava ?? null;
      this.groundMat.emissive.set(0xff4a16);
      this.groundMat.emissiveIntensity = 0.85;
      this.groundMat.color.set(0xfff2ea);
      this.groundMat.roughness = 0.72;
      this.webgl.setClearColor(0x3a140e);
      fog.color.set(0x6a2414);
      fog.near = 18;
      fog.far = 78;
      this.hemi.color.set(0xffc09a);
      this.hemi.groundColor.set(0x6a1c0c);
      this.hemi.intensity = 1.15;
      this.moon.color.set(0xff7a42);
      this.moon.intensity = 1.7;
      this.fill.color.set(0xff3c16);
      this.fill.intensity = 0.85;
      this.ember.color.set(0xff4a12);
      this.ember.intensity = 55;
      this.tintScenery(0xffb090);
    }
    this.groundMat.needsUpdate = true;
    this.realm = next;
  }

  private tintScenery(hex: number): void {
    for (const key of ["wall", "wall-broken", "pillar", "column"]) {
      const piece = this.templates.get(key);
      if (!piece) continue;
      piece.scene.traverse((node: THREE.Object3D) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          const standard = material as THREE.MeshStandardMaterial;
          standard.color?.set(hex);
        }
      });
    }
  }
    private async loadModels(): Promise<void> {
    const loader = new GLTFLoader();
    await Promise.all(
      Object.entries(FILES).map(async ([key, file]) => {
        try {
          const gltf = await loader.loadAsync(MODEL_URL(file));
          this.templates.set(key, { scene: gltf.scene, clips: gltf.animations });
        } catch {
          // A missing model falls back to a plain figure.
        }
      }),
    );
    this.realm = "";
  }

  private buildDungeon(): void {
    this.propsBuilt = true;
    const minX = ARENA.margin * SCALE;
    const maxX = (ARENA.width - ARENA.margin) * SCALE;
    const minZ = ARENA.margin * SCALE;
    const maxZ = (ARENA.height - ARENA.margin) * SCALE;
    const span = 4;
    const place = (key: string, x: number, z: number, rot: number, width: number) => {
      const piece = this.templates.get(key);
      if (!piece) return;
      const mesh = piece.scene.clone(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      const wide = Math.max(size.x, size.z, 0.001);
      mesh.scale.multiplyScalar(width / wide);
      const fitted = new THREE.Box3().setFromObject(mesh);
      const center = fitted.getCenter(new THREE.Vector3());
      mesh.position.x -= center.x;
      mesh.position.z -= center.z;
      mesh.position.y -= fitted.min.y;
      const group = new THREE.Group();
      group.add(mesh);
      group.position.set(x, 0, z);
      group.rotation.y = rot;
      this.scene.add(group);
    };
    for (let x = minX; x <= maxX; x += span) {
      const broken = Math.round(x) % 12 === 0;
      place(broken ? "wall-broken" : "wall", x, minZ, 0, span);
      place(broken ? "wall-broken" : "wall", x, maxZ, Math.PI, span);
    }
    for (let z = minZ + span; z <= maxZ - span; z += span) {
      place("wall", minX, z, Math.PI / 2, span);
      place("wall", maxX, z, -Math.PI / 2, span);
    }
    for (let x = minX + 10; x < maxX; x += 16) {
      for (let z = minZ + 10; z < maxZ; z += 16) {
        place((x + z) % 32 === 0 ? "column" : "pillar", x, z, 0, 1.6);
      }
    }
  }

  private syncPlayer(sim: Sim, dt: number): void {
    const kind = heroKind(sim);
    const ready = this.templates.has(kind);
    if (!this.player || this.playerKind !== kind || (this.player.placeholder && ready)) {
      if (this.player) this.scene.remove(this.player.root);
      this.player = this.makeActor(kind, HEIGHT[kind] ?? 1.7, false);
      this.playerKind = kind;
      if (this.player) this.scene.add(this.player.root);
    }
    if (!this.player) return;
    const moved = Math.hypot(sim.player.x - this.lastPlayer.x, sim.player.y - this.lastPlayer.y) > 0.4;
    this.lastPlayer.set(sim.player.x, sim.player.y);
    this.placeActor(this.player, sim.player.x, sim.player.y, sim.player.facing, dt, moved, sim.player.swing > 0, 0.5, false);
    this.paintGear(this.player, sim);
    const ward = this.player.root.getObjectByName("ward-shell");
    if (sim.player.shield > 0 && !ward) {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xe7c39a, transparent: true, opacity: 0.18 }),
      );
      shell.name = "ward-shell";
      shell.position.y = 0.9;
      this.player.root.add(shell);
    } else if (ward && sim.player.shield <= 0) {
      this.player.root.remove(ward);
    }
  }

  private syncEnemies(sim: Sim, dt: number): void {
    const seen = new Set<number>();
    this.enemyRoots.length = 0;
    for (const enemy of sim.enemies) {
      seen.add(enemy.id);
      let actor = this.enemies.get(enemy.id);
      if (actor?.placeholder && this.templates.has(enemy.kind)) {
        this.scene.remove(actor.root);
        if (actor.bar) this.scene.remove(actor.bar);
        this.enemies.delete(enemy.id);
        actor = undefined;
      }
      if (!actor) {
        actor = this.makeActor(enemy.kind, HEIGHT[enemy.kind] ?? 1.7, true);
        actor.root.userData.enemyId = enemy.id;
        this.enemies.set(enemy.id, actor);
        this.scene.add(actor.root);
        if (actor.bar) this.scene.add(actor.bar);
      }
      actor.root.userData.simX = enemy.x;
      actor.root.userData.simY = enemy.y;
      this.enemyRoots.push(actor.root);
      const moving = enemy.stun <= 0 && enemy.telegraph <= 0;
      const winding = enemy.telegraph > 0;
      if (!actor.placeholder && !actor.armed) actor.armed = this.arm(actor.root, actor.kind);
      this.placeActor(actor, enemy.x, enemy.y, facingOf(enemy, sim), dt, moving, winding, 0.8, enemy.flash > 0 && !winding);
      if (actor.bar && actor.hpFill) {
        const ratio = Math.max(0, enemy.hp / Math.max(1, enemy.maxHp));
        actor.hpFill.scale.x = Math.max(0.001, ratio);
        actor.hpFill.position.x = (ratio - 1) * 0.42;
        actor.bar.position.set(enemy.x * SCALE, (HEIGHT[enemy.kind] ?? 1.7) + 0.28, enemy.y * SCALE);
        actor.bar.quaternion.copy(this.camera.quaternion);
      }
    }
    for (const [id, actor] of this.enemies) {
      if (seen.has(id)) continue;
      this.scene.remove(actor.root);
      if (actor.bar) this.scene.remove(actor.bar);
      this.enemies.delete(id);
    }
  }

  private makeActor(kind: string, height: number, enemy: boolean): Actor {
    const loaded = this.templates.get(kind);
    const template = loaded ?? fallbackFigure(kind, height);
    const model = cloneSkinned(template.scene);
    if (loaded) this.dress(model, kind);
    cloneMaterials(model);
    fitFeet(model, height);
    const root = new THREE.Group();
    model.rotation.y = Math.PI;
    root.add(model);
    const marker = markerFor(kind);
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(kind === "brute" ? 0.62 : kind === "hound" ? 0.36 : 0.46, 24),
      new THREE.MeshBasicMaterial({ color: marker.ring, transparent: true, opacity: 0.4, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    root.add(ring);
    const slash = swingMesh(marker.swing, marker.melee);
    const blade = bladeMesh(marker.swing);
    root.add(slash, blade);
    const mixer = new THREE.AnimationMixer(model);
    const pose = POSE[kind] ?? POSE.knight;
    let bar: THREE.Group | undefined;
    let hpFill: THREE.Mesh | undefined;
    if (enemy) {
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(0.92, 0.09),
        new THREE.MeshBasicMaterial({ color: 0x140e0b, depthTest: false }),
      );
      hpFill = new THREE.Mesh(
        new THREE.PlaneGeometry(0.84, 0.055),
        new THREE.MeshBasicMaterial({ color: 0xd24a38, depthTest: false }),
      );
      hpFill.position.z = 0.01;
      bar = new THREE.Group();
      bar.add(back, hpFill);
      bar.renderOrder = 3;
    }
    return {
      root,
      mixer,
      idle: exactAction(mixer, template.clips, pose.idle, false),
      walk: exactAction(mixer, template.clips, pose.walk, false),
      attack: exactAction(mixer, template.clips, pose.attack, true),
      hit: exactAction(mixer, template.clips, "Hit_A", true),
      mode: "",
      placeholder: !loaded,
      kind,
      attackLeft: 0,
      attackDur: 0.5,
      held: false,
      hitLeft: 0,
      hurt: false,
      armed: !GEAR[kind],
      slash,
      blade,
      bar,
      hpFill,
    };
  }

  private dress(model: THREE.Object3D, kind: string): void {
    for (const name of HIDE[kind] ?? []) {
      const node = model.getObjectByName(name);
      if (node) node.visible = false;
    }
    const gear = GEAR[kind];
    if (!gear) return;
    const source = this.templates.get(gear.source)?.scene.getObjectByName(gear.name);
    const hand = model.getObjectByName("handslot.r");
    if (!source || !hand) return;
    const prop = source.clone(true);
    prop.visible = true;
    prop.traverse((node) => {
      node.visible = true;
    });
    hand.add(prop);
    cloneMaterials(prop);
  }

  private arm(root: THREE.Object3D, kind: string): boolean {
    const gear = GEAR[kind];
    if (!gear) return true;
    if (root.getObjectByName(gear.name)) return true;
    const source = this.templates.get(gear.source)?.scene.getObjectByName(gear.name);
    const hand = root.getObjectByName("handslot.r");
    if (!source || !hand) return false;
    this.dress(root, kind);
    return true;
  }

  private paintGear(actor: Actor, sim: Sim): void {
    const model = actor.root.children[0];
    if (!model) return;
    rememberMaterials(model);
    restoreMaterials(model);
    const eq = sim.character.equipment;
    tintHead(model, eq.head);
    tintNamed(model, ["Body"], eq.chest);
    tintNamed(model, ["ArmLeft", "ArmRight"], eq.gloves);
    tintNamed(model, ["LegLeft", "LegRight"], eq.boots);
    showAddon(model, "hips", "gear-belt", "belt", eq.belt);
    showAddon(model, "hand.r", "gear-ring-r", "ring", eq.ring1);
    showAddon(model, "hand.l", "gear-ring-l", "ring", eq.ring2);
    showAddon(model, "head", "gear-ear-l", "earring", eq.ear1);
    showAddon(model, "head", "gear-ear-r", "earring", eq.ear2);
    if (!showAddon(model, "chest", "gear-neck", "neck", eq.neck)) showAddon(model, "spine", "gear-neck", "neck", eq.neck);
    if (eq.weapon?.ethereal) ghostWeapon(model);
  }

  private placeActor(
    actor: Actor,
    x: number,
    y: number,
    facing: number,
    dt: number,
    moving: boolean,
    attackPulse: boolean,
    attackSeconds: number,
    hitPulse: boolean,
  ): void {
    const wx = x * SCALE;
    const wz = y * SCALE;
    actor.root.position.set(wx, 0, wz);
    this.look.set(wx + Math.cos(facing), 0, wz + Math.sin(facing));
    actor.root.lookAt(this.look);
    if (hitPulse && actor.hitLeft <= 0) actor.hitLeft = 0.28;
    if (attackPulse && !actor.held) {
      actor.attackLeft = attackSeconds;
      actor.attackDur = attackSeconds;
      replay(actor.attack, attackSeconds);
    }
    actor.held = attackPulse;
    if (actor.attackLeft > 0) actor.attackLeft = Math.max(0, actor.attackLeft - dt);
    if (actor.hitLeft > 0) actor.hitLeft = Math.max(0, actor.hitLeft - dt);
    const next = actor.hitLeft > 0 ? "hit" : actor.attackLeft > 0 ? "attack" : moving ? "walk" : "idle";
    if (actor.mode !== next) {
      const action = next === "hit" ? actor.hit : next === "attack" ? actor.attack : next === "walk" ? actor.walk : actor.idle;
      if (next === "hit") replay(actor.hit, 0.28);
      else if (next !== "attack") action?.reset().fadeIn(0.08).play();
      const previous =
        actor.mode === "hit" ? actor.hit : actor.mode === "attack" ? actor.attack : actor.mode === "walk" ? actor.walk : actor.idle;
      if (previous !== action) previous?.fadeOut(0.08);
      actor.mode = next;
    }
    const swinging = actor.attackLeft > 0 && actor.hitLeft <= 0;
    const elapsed = swinging ? 1 - actor.attackLeft / Math.max(0.001, actor.attackDur) : 0;
    if (actor.slash) actor.slash.visible = swinging;
    if (actor.blade) {
      actor.blade.visible = swinging;
      actor.blade.rotation.y = (elapsed - 0.5) * 1.7;
      const mat = actor.blade.material as THREE.MeshBasicMaterial;
      mat.opacity = swinging ? 0.35 + elapsed * 0.55 : 0;
    }
    const hurt = hitPulse || actor.hitLeft > 0;
    if (hurt !== actor.hurt) {
      actor.hurt = hurt;
      tintActor(actor.root, hurt);
    }
    actor.mixer.update(dt);
  }

  private syncShots(shots: Shot[]): void {
    while (this.shots.length < shots.length) {
      const group = shotVisual();
      this.shots.push(group);
      this.scene.add(group);
    }
    this.shots.forEach((group, index) => {
      const shot = shots[index];
      group.visible = !!shot;
      if (!shot) return;
      group.position.set(shot.x * SCALE, shot.style === "arrow" || shot.style === "knife" ? 1.15 : 1.25, shot.y * SCALE);
      group.rotation.y = Math.atan2(shot.vx, shot.vy);
      group.children.forEach((child) => {
        child.visible = child.name === shot.style;
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.color.set(shot.color);
        material.opacity = shot.style === "fire" ? 0.92 : 0.95;
      });
    });
  }

  private syncBursts(bursts: Burst[]): void {
    while (this.bursts.length < bursts.length) {
      const group = new THREE.Group();
      this.scene.add(group);
      this.bursts.push({ kind: "", group });
    }
    this.bursts.forEach((entry, index) => {
      const burst = bursts[index];
      entry.group.visible = !!burst;
      if (!burst) return;
      if (entry.kind !== burst.kind) {
        entry.group.clear();
        buildBurst(entry.group, burst.kind, burst.color);
        entry.kind = burst.kind;
      }
      const age = 1 - burst.t / Math.max(0.001, burst.life);
      entry.group.position.set(burst.x * SCALE, burst.kind === "heal" ? age * 1.5 : 0, burst.y * SCALE);
      entry.group.rotation.y = Math.atan2(Math.cos(burst.facing), Math.sin(burst.facing));
      const spread = burst.kind === "fire" || burst.kind === "frost" || burst.kind === "arcane" ? 0.55 + age * burst.radius : 1;
      entry.group.scale.setScalar(spread);
      entry.group.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as THREE.MeshBasicMaterial;
        if (material?.opacity !== undefined) material.opacity = 0.9 * (1 - age);
      });
    });
  }

  private syncRings(enemies: Enemy[]): void {
    const telegraphs = enemies.filter((enemy) => enemy.telegraph > 0);
    while (this.rings.length < telegraphs.length) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 1.45, 28),
        new THREE.MeshBasicMaterial({ color: 0xd2563a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      this.rings.push(ring);
      this.scene.add(ring);
    }
    this.rings.forEach((ring, index) => {
      const enemy = telegraphs[index];
      ring.visible = !!enemy;
      if (!enemy) return;
      ring.position.set(enemy.x * SCALE, 0.05, enemy.y * SCALE);
    });
  }

  private syncDrops(sim: Sim): void {
    while (this.drops.length < sim.drops.length) {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({ color: 0xe4c37a, roughness: 0.4, metalness: 0.35 }),
      );
      this.drops.push(mesh);
      this.scene.add(mesh);
    }
    this.drops.forEach((mesh, index) => {
      const drop = sim.drops[index];
      mesh.visible = !!drop;
      if (!drop) return;
      (mesh.material as THREE.MeshStandardMaterial).color.set(drop.itemUid ? 0xd7e4ff : 0xe4c37a);
      mesh.position.set(drop.x * SCALE, 0.28, drop.y * SCALE);
      mesh.rotation.y += 0.02;
    });
  }

  private syncFloats(floats: FloatText[]): void {
    while (this.floatNodes.length < floats.length) {
      const span = document.createElement("span");
      this.floatLayer.append(span);
      this.floatNodes.push(span);
    }
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.floatNodes.forEach((node, index) => {
      const entry = floats[index];
      if (!entry) {
        node.style.display = "none";
        return;
      }
      const point = new THREE.Vector3(entry.x * SCALE, 2.15, entry.y * SCALE);
      point.project(this.camera);
      if (point.z > 1) {
        node.style.display = "none";
        return;
      }
      node.style.display = "block";
      node.style.color = entry.color;
      node.textContent = entry.text;
      node.style.left = `${(point.x * 0.5 + 0.5) * width}px`;
      node.style.top = `${(-point.y * 0.5 + 0.5) * height}px`;
    });
  }
}

function heroKind(sim: Sim): string {
  const title = classTitle(sim.character);
  if (title === "Shade" || title === "Cutpurse" || title === "Marksman") return "rogue";
  if (title === "Rite" || title === "Pyre" || title === "Cantor") return "mage";
  return "knight";
}

function facingOf(enemy: Enemy, sim: Sim): number {
  return Math.atan2(sim.player.y - enemy.y, sim.player.x - enemy.x);
}

function prepFloor(texture: THREE.Texture, color: boolean): THREE.Texture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 11);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function fitFeet(model: THREE.Object3D, height: number): void {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = height / Math.max(0.001, size.y);
  model.scale.multiplyScalar(scale);
  const fitted = new THREE.Box3().setFromObject(model);
  const center = fitted.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= fitted.min.y;
}

const POSE: Record<string, { idle: string; walk: string; attack: string }> = {
  knight: { idle: "Idle", walk: "Running_A", attack: "1H_Melee_Attack_Slice_Horizontal" },
  rogue: { idle: "Idle", walk: "Running_A", attack: "Dualwield_Melee_Attack_Slice" },
  mage: { idle: "Idle", walk: "Running_A", attack: "Spellcast_Shoot" },
  hound: { idle: "Idle", walk: "Running_A", attack: "1H_Melee_Attack_Slice_Horizontal" },
  sentinel: { idle: "Idle_Combat", walk: "Running_A", attack: "1H_Melee_Attack_Chop" },
  archer: { idle: "Idle", walk: "Running_A", attack: "1H_Ranged_Shoot" },
  brute: { idle: "Idle", walk: "Running_A", attack: "Spellcast_Shoot" },
};

const HIDE: Record<string, string[]> = {
  knight: ["1H_Sword_Offhand", "Badge_Shield", "Rectangle_Shield", "Round_Shield", "Spike_Shield", "2H_Sword"],
  rogue: ["1H_Crossbow", "2H_Crossbow", "Throwable"],
  mage: ["Spellbook", "Spellbook_open", "2H_Staff"],
};

const GEAR: Record<string, { source: string; name: string }> = {
  hound: { source: "rogue", name: "Knife" },
  sentinel: { source: "knight", name: "1H_Sword" },
  archer: { source: "rogue", name: "1H_Crossbow" },
  brute: { source: "mage", name: "2H_Staff" },
};

function markerFor(kind: string): { ring: number; swing: number; melee: boolean } {
  if (kind === "rogue") return { ring: 0xd7dde6, swing: 0xf4f7fb, melee: true };
  if (kind === "mage" || kind === "brute") return { ring: 0xb9a4e8, swing: 0xd8c8ff, melee: false };
  if (kind === "hound") return { ring: 0xd2563a, swing: 0xff8a62, melee: true };
  if (kind === "archer") return { ring: 0x7eb6d6, swing: 0xb7e4ff, melee: false };
  if (kind === "sentinel") return { ring: 0xd7b56a, swing: 0xffe0a0, melee: true };
  return { ring: 0xe7c39a, swing: 0xffe2b0, melee: true };
}

function swingMesh(color: number, melee: boolean): THREE.Mesh {
  const geo = melee ? new THREE.RingGeometry(0.4, 1.02, 28, 1, -1.15, 2.3) : new THREE.RingGeometry(0.18, 0.55, 22);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }),
  );
  mesh.position.set(0, melee ? 1.22 : 1.05, -0.58);
  mesh.renderOrder = 2;
  mesh.visible = false;
  return mesh;
}

function shotVisual(): THREE.Group {
  const group = new THREE.Group();
  const material = () => new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, depthWrite: false });
  const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), material());
  spark.name = "spark";
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.48, 7), material());
  fire.name = "fire";
  fire.rotation.x = Math.PI / 2;
  const knife = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.42), material());
  knife.name = "knife";
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 5), material());
  arrow.name = "arrow";
  arrow.rotation.x = Math.PI / 2;
  group.add(spark, fire, knife, arrow);
  return group;
}

function buildBurst(group: THREE.Group, kind: string, color: string): void {
  const material = () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  if (kind === "fire" || kind === "frost" || kind === "arcane") {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.72, 28), material());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    const inner = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.28, 20), material());
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.12;
    group.add(ring, inner);
    const spikes = kind === "frost" ? 8 : 6;
    for (let i = 0; i < spikes; i++) {
      const spike = new THREE.Mesh(kind === "fire" ? new THREE.ConeGeometry(0.08, 0.42, 5) : new THREE.BoxGeometry(0.06, 0.36, 0.06), material());
      const angle = (i / spikes) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 0.7, 0.28, Math.sin(angle) * 0.7);
      group.add(spike);
    }
    return;
  }
  if (kind === "heal") {
    for (let i = 0; i < 3; i++) {
      const disc = new THREE.Mesh(new THREE.RingGeometry(0.18 + i * 0.12, 0.28 + i * 0.12, 20), material());
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.4 + i * 0.35;
      group.add(disc);
    }
    return;
  }
  if (kind === "ward") {
    const shield = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 18), material());
    shield.position.set(0, 1.15, -0.45);
    group.add(shield);
    return;
  }
  if (kind === "dash") {
    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.6), material());
    streak.position.set(0, 0.9, -0.7);
    group.add(streak);
    return;
  }
  const wide = kind === "cleave";
  const steps = wide ? 7 : 5;
  const span = wide ? 1.7 : kind === "bleed" ? 0.7 : 1.15;
  for (let i = 0; i < steps; i++) {
    const angle = -span / 2 + (span * i) / Math.max(1, steps - 1);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(kind === "bleed" ? 0.05 : 0.1, kind === "bleed" ? 0.72 : 0.58, 0.08), material());
    blade.position.set(Math.sin(angle) * 0.82, 1.15, -Math.cos(angle) * 0.82);
    blade.rotation.y = angle;
    group.add(blade);
  }
}

function bladeMesh(color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.05, 1.25),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  mesh.position.set(0, 1.05, -0.72);
  mesh.visible = false;
  return mesh;
}

function cloneMaterials(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((entry) => entry.clone()) : mesh.material.clone();
  });
}

function tintActor(root: THREE.Object3D, hurt: boolean): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const standard = material as THREE.MeshStandardMaterial;
      if (!standard.emissive) continue;
      standard.emissive.set(hurt ? 0xff4a32 : 0x000000);
      standard.emissiveIntensity = hurt ? 0.85 : 0;
    }
  });
}

function exactAction(
  mixer: THREE.AnimationMixer,
  clips: THREE.AnimationClip[],
  name: string,
  once: boolean,
): THREE.AnimationAction | undefined {
  const clip = clips.find((entry) => entry.name === name);
  if (!clip) return undefined;
  const action = mixer.clipAction(clip);
  action.loop = once ? THREE.LoopOnce : THREE.LoopRepeat;
  if (once) action.clampWhenFinished = true;
  return action;
}

function replay(action: THREE.AnimationAction | undefined, seconds: number): void {
  if (!action) return;
  const duration = action.getClip().duration || seconds;
  action.reset();
  action.timeScale = duration / Math.max(0.05, seconds);
  action.fadeIn(0.04).play();
}

const ARMOR_FINISH: Record<string, { metalness: number; roughness: number }> = {
  cloth: { metalness: 0.02, roughness: 0.94 },
  leather: { metalness: 0.08, roughness: 0.72 },
  mail: { metalness: 0.78, roughness: 0.38 },
  plate: { metalness: 0.9, roughness: 0.24 },
};

function rememberMaterials(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    const material = standardMaterial(mesh);
    if (!material || material.userData.gearBase) return;
    material.userData.gearBase = {
      color: material.color.getHex(),
      map: material.map,
      metalness: material.metalness,
      roughness: material.roughness,
      emissive: material.emissive.getHex(),
      emissiveIntensity: material.emissiveIntensity,
      opacity: material.opacity,
      transparent: material.transparent,
    };
  });
}

function restoreMaterials(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    const material = standardMaterial(mesh);
    const base = material?.userData.gearBase as
      | {
          color: number;
          map: THREE.Texture | null;
          metalness: number;
          roughness: number;
          emissive: number;
          emissiveIntensity: number;
          opacity: number;
          transparent: boolean;
        }
      | undefined;
    if (!material || !base) return;
    material.color.setHex(base.color);
    material.map = base.map;
    material.metalness = base.metalness;
    material.roughness = base.roughness;
    material.emissive.setHex(base.emissive);
    material.emissiveIntensity = base.emissiveIntensity;
    material.opacity = base.opacity;
    material.transparent = base.transparent;
  });
}

function tintHead(root: THREE.Object3D, item: Item | null): void {
  if (!item?.armorType) return;
  let covered = false;
  root.traverse((node) => {
    if (["Helmet", "Hat", "Hood"].some((part) => node.name.includes(part))) covered = true;
  });
  tintNamed(root, covered ? ["Helmet", "Hat", "Hood"] : ["Head"], item);
}

function tintNamed(root: THREE.Object3D, parts: string[], item: Item | null): void {
  if (!item?.armorType) return;
  const finish = ARMOR_FINISH[item.armorType] ?? ARMOR_FINISH.cloth!;
  root.traverse((node) => {
    if (!parts.some((part) => node.name.includes(part))) return;
    const material = standardMaterial(node as THREE.Mesh);
    if (!material) return;
    applyFinish(material, item.dye, finish.metalness, finish.roughness, item.ethereal, true);
  });
}

function ghostWeapon(root: THREE.Object3D): void {
  for (const name of ["1H_Sword", "Knife", "Knife_Offhand", "1H_Wand"]) {
    const node = root.getObjectByName(name);
    if (!node?.visible) continue;
    node.traverse((child) => {
      const material = standardMaterial(child as THREE.Mesh);
      if (!material) return;
      applyFinish(material, 0xd5e6f5, 0.45, 0.22, true, false);
    });
  }
}

function applyFinish(
  material: THREE.MeshStandardMaterial,
  dye: number,
  metalness: number,
  roughness: number,
  ethereal: boolean,
  solid: boolean,
): void {
  if (solid) material.map = null;
  material.color.setHex(dye);
  material.metalness = metalness;
  material.roughness = roughness;
  material.transparent = false;
  material.opacity = 1;
  material.emissive.setHex(ethereal ? 0xb7d4ea : 0x000000);
  material.emissiveIntensity = ethereal ? 0.55 : 0;
  if (ethereal) material.color.lerp(new THREE.Color(0xd7e8f6), 0.45);
}

function showAddon(root: THREE.Object3D, boneName: string, addonName: string, shape: "belt" | "ring" | "neck" | "earring", item: Item | null): boolean {
  const bone = root.getObjectByName(boneName);
  if (!bone) return false;
  let mesh = bone.getObjectByName(addonName) as THREE.Mesh | undefined;
  if (!mesh) {
    const geometry =
      shape === "belt"
        ? new THREE.TorusGeometry(0.22, 0.045, 8, 18)
        : shape === "ring"
          ? new THREE.TorusGeometry(0.045, 0.012, 6, 12)
          : shape === "earring"
            ? new THREE.SphereGeometry(0.035, 8, 8)
            : new THREE.OctahedronGeometry(0.07, 0);
    mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.4, metalness: 0.6 }));
    mesh.name = addonName;
    if (shape === "belt") {
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = 0.05;
    }
    if (shape === "neck") mesh.position.set(0, 0.12, 0.08);
    if (shape === "ring") mesh.rotation.z = Math.PI / 2;
    if (shape === "earring") mesh.position.set(addonName.endsWith("-r") ? 0.12 : -0.12, 0.02, 0.06);
    bone.add(mesh);
  }
  mesh.visible = !!item;
  if (!item) return true;
  const material = mesh.material as THREE.MeshStandardMaterial;
  const metal = item.armorType ? (ARMOR_FINISH[item.armorType]?.metalness ?? 0.7) : 0.82;
  const rough = item.armorType ? (ARMOR_FINISH[item.armorType]?.roughness ?? 0.35) : 0.28;
  applyFinish(material, item.dye || 0xe4c37a, metal, rough, item.ethereal, true);
  return true;
}

function standardMaterial(node: THREE.Mesh): THREE.MeshStandardMaterial | null {
  if (!node.isMesh) return null;
  const material = Array.isArray(node.material) ? node.material[0] : node.material;
  if (!material || !(material as THREE.MeshStandardMaterial).color) return null;
  return material as THREE.MeshStandardMaterial;
}

function fallbackFigure(kind: string, height: number): ClipSet {
  const color = kind === "brute" || kind === "hound" ? 0x6e3048 : kind === "knight" ? 0xc4b59a : 0x8d734e;
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, Math.max(0.4, height - 0.7), 4, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
  );
  mesh.position.y = height * 0.5;
  const group = new THREE.Group();
  group.add(mesh);
  return { scene: group, clips: [] };
}
