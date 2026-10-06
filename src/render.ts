import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { ARENA, type Item } from "./game/types";
import { ROAD_X, roadSpine, worldPacks } from "./game/world";
import type { Burst, Enemy, FloatText, Shot, Sim } from "./game/sim";
import { buildHero, heroAnimationClips, HERO_ATTACK_DUR, HERO_HEIGHT, isHeroRace } from "./render/heroes";
import { syncHeroGear } from "./render/gear";
import { AdaptiveQuality } from "./render/quality";
import { AtmosphereFx } from "./render/atmosphere";
import { buildMonster, isProceduralMonster } from "./render/monsters";

const SCALE = 0.045;
const MODEL_URL = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;
/** Zoomed-out ARPG: advance skeletal clips in ~12 FPS steps; sim/render stay full rate. */
const ANIM_STEP = 1 / 12;

export interface LoadProgress {
  ratio: number;
  percent: number;
  label: string;
}

const FILES: Record<string, string> = {
  knight: "knight.glb",
  rogue: "rogue.glb",
  mage: "mage.glb",
  human: "races/human.glb",
  elf: "races/elf.glb",
  dwarf: "races/dwarf.glb",
  gnome: "races/gnome.glb",
  hobbit: "races/hobbit.glb",
  hound: "hound.glb",
  sentinel: "sentinel.glb",
  archer: "archer.glb",
  brute: "brute.glb",
  floor: "floor.glb",
  wall: "wall.glb",
  "wall-broken": "wall-broken.glb",
  pillar: "pillar.glb",
  column: "column.glb",
  // Dense KayKit dungeon dressing (CC0)
  chest: "props/chest.glb",
  "chest-gold": "props/chest_gold.glb",
  barrel: "props/barrel_large.glb",
  "barrel-small": "props/barrel_small.glb",
  crates: "props/crates_stacked.glb",
  rubble: "props/rubble_large.glb",
  "rubble-half": "props/rubble_half.glb",
  torch: "props/torch_mounted.glb",
  "torch-lit": "props/torch_lit.glb",
  banner: "props/banner_red.glb",
  "banner-blue": "props/banner_blue.glb",
  table: "props/table_medium.glb",
  candle: "props/candle_lit.glb",
  stairs: "props/stairs.glb",
  "wall-arch": "props/wall_arched.glb",
  doorway: "props/wall_doorway.glb",
};

const HEIGHT: Record<string, number> = {
  knight: 1.75,
  rogue: 1.7,
  mage: 1.72,
  hound: 1.15,
  sentinel: 1.8,
  archer: 1.72,
  brute: 2.55,
  wolf: 1.05,
  slime: 0.95,
  gargoyle: 1.55,
  wisp: 0.7,
  imp: 0.95,
  spider: 0.7,
  cultist: 1.65,
  sprig: 1.35,
  whelp: 1.45,
  hillock: 2.35,
  lurker: 1.5,
  lumen: 1.7,
  flicker: 0.85,
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
  /** Accumulated dt for stepped clip updates (zoomed-out low anim rate). */
  animDebt: number;
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
  private rim!: THREE.DirectionalLight;
  private ember!: THREE.PointLight;
  private stone?: THREE.Texture;
  private stoneRough?: THREE.Texture;
  private stoneNormal?: THREE.Texture;
  private stoneAo?: THREE.Texture;
  private lava?: THREE.Texture;
  private lavaRough?: THREE.Texture;
  private lavaNormal?: THREE.Texture;
  private lavaAo?: THREE.Texture;
  private roadDiff?: THREE.Texture;
  private roadRough?: THREE.Texture;
  private roadNormal?: THREE.Texture;
  private roadAo?: THREE.Texture;
  private roadDisp?: THREE.Texture;
  private stoneDisp?: THREE.Texture;
  private lavaDisp?: THREE.Texture;
  private wallDiff?: THREE.Texture;
  private wallRough?: THREE.Texture;
  private wallNormal?: THREE.Texture;
  private wallAo?: THREE.Texture;
  private roadMat: THREE.MeshStandardMaterial | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private readonly readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private readonly quality = new AdaptiveQuality();
  private atmosphere: AtmosphereFx | null = null;
  private lastLevel = -1;
  private loadHandler: ((info: LoadProgress) => void) | null = null;
  private readonly loadPhase = { models: 0, floors: 0, hdr: 0 };
  private lastProgress: LoadProgress = { ratio: 0, percent: 0, label: "Installing Ward…" };

  constructor(private canvas: HTMLCanvasElement) {
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    const q = this.quality.current();
    this.webgl = new THREE.WebGLRenderer({
      canvas,
      antialias: q.antialias,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    this.webgl.setClearColor(0x3a342e);
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    // 1.12 with RoomEnvironment IBL + rim reads cleaner than PR #1's 1.28 (IBL adds fill).
    this.webgl.toneMappingExposure = 1.12;
    this.webgl.shadowMap.enabled = q.shadows;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 200);
    this.scene.fog = new THREE.Fog(0x6d6256, 36, 110);
    this.hemi = new THREE.HemisphereLight(0xfff6ea, 0x8a6a48, 1.45);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xfff8f0, 2.1);
    this.moon.position.set(-8, 20, 12);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    this.moon.shadow.bias = -0.00035;
    this.moon.shadow.normalBias = 0.028;
    this.moon.shadow.camera.near = 1;
    this.moon.shadow.camera.far = 42;
    const shadow = this.moon.shadow.camera;
    shadow.left = -14;
    shadow.right = 14;
    shadow.top = 14;
    shadow.bottom = -14;
    this.moon.shadow.radius = q.level === "ultra" ? 3.2 : q.level === "high" ? 2.5 : 1.5;
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);
    this.fill = new THREE.DirectionalLight(0xc9d4e4, 0.45);
    this.fill.position.set(12, 8, -8);
    this.scene.add(this.fill);
    this.rim = new THREE.DirectionalLight(0x9bb4d4, 0.38);
    this.rim.position.set(6, 5, -8);
    this.scene.add(this.rim);
    this.ember = new THREE.PointLight(0xffb56a, 22, 40, 2);
    this.ember.position.set((ARENA.width * SCALE) / 2, 3.2, (ARENA.height * SCALE) / 2);
    this.scene.add(this.ember);
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.04,
      envMapIntensity: 0.55,
    });
    this.installEnvironment();
    // Dense tessellation so displacement maps actually sculpt the floor.
    const groundGeo = new THREE.PlaneGeometry(ARENA.width * SCALE, ARENA.height * SCALE, 192, 192);
    if (groundGeo.getAttribute("uv") && !groundGeo.getAttribute("uv2")) {
      groundGeo.setAttribute("uv2", groundGeo.getAttribute("uv").clone());
    }
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((ARENA.width * SCALE) / 2, -0.02, (ARENA.height * SCALE) / 2);
    ground.receiveShadow = true;
    this.groundMesh = ground;
    this.scene.add(ground);
    this.atmosphere = new AtmosphereFx(this.scene, this.webgl, () => this.quality.current());
    this.floatLayer = document.createElement("div");
    this.floatLayer.id = "float-layer";
    canvas.parentElement?.appendChild(this.floatLayer);
    // Defer so splash can subscribe to progress in the same turn.
    Promise.resolve().then(() => this.beginAssetLoads());
  }

  private beginAssetLoads(): void {
    Promise.all([this.loadModels(), this.loadFloors(), this.loadHdrEnvironment()]).finally(() => {
      this.emitProgress(1, "Ready");
      this.resolveReady();
    });
  }

  /** Subscribe to asset load progress (0-1) for the splash UI. */
  onLoadProgress(handler: (info: LoadProgress) => void): void {
    this.loadHandler = handler;
    handler(this.lastProgress);
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  private emitProgress(ratio: number, label: string): void {
    const clamped = Math.max(0, Math.min(1, ratio));
    this.lastProgress = { ratio: clamped, label, percent: Math.round(clamped * 100) };
    this.loadHandler?.(this.lastProgress);
  }

  private bumpPhase(phase: keyof typeof this.loadPhase, ratio: number, label: string): void {
    this.loadPhase[phase] = Math.max(this.loadPhase[phase], Math.max(0, Math.min(1, ratio)));
    // Models + textures dominate cold start; HDR is smaller.
    const overall = this.loadPhase.models * 0.4 + this.loadPhase.floors * 0.45 + this.loadPhase.hdr * 0.15;
    this.emitProgress(overall, label);
  }

  resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const q = this.quality.current();
    const dpr = Math.min(q.dpr, window.devicePixelRatio || 1);
    this.webgl.setPixelRatio(dpr);
    this.webgl.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  lookAt(sim: Sim): void {
    const x = sim.player.x * SCALE;
    const z = sim.player.y * SCALE;
    this.camera.position.set(x, 9.55, z + 14.05);
    this.camera.lookAt(x, 0.68, z);
    this.moon.position.set(x - 5, 14, z + 6);
    this.rim.position.set(x + 7, 6, z - 5);
    this.moon.target.position.set(x, 0, z);
    this.moon.target.updateMatrixWorld();
    this.ember.position.set(x, 2.6, z);
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
    if (this.quality.sample(dt) || this.quality.consumeDirty()) this.applyQuality();
    if (!this.propsBuilt && this.templates.has("wall")) this.buildDungeon();
    const realm = sim.character.level > 20 ? "hell" : "dungeon";
    this.applyRealm(realm);
    if (sim.character.level !== this.lastLevel) {
      this.lastLevel = sim.character.level;
      this.atmosphere?.onLevelChange(sim.character.level, realm);
    }
    this.syncPlayer(sim, dt);
    this.syncEnemies(sim, dt);
    this.syncShots(sim.shots);
    this.syncBursts(sim.bursts);
    this.syncRings(sim.enemies);
    this.syncDrops(sim);
    this.syncFloats(sim.floats);
    const px = sim.player.x * SCALE;
    const pz = sim.player.y * SCALE;
    this.atmosphere?.update(dt, {
      playerX: px,
      playerZ: pz,
      moon: this.moon,
      hemi: this.hemi,
      fill: this.fill,
      rim: this.rim,
      ember: this.ember,
      fog: this.scene.fog as THREE.Fog,
      groundMat: this.groundMat,
      roadMat: this.roadMat,
      renderer: this.webgl,
      realm,
    });
    this.webgl.render(this.scene, this.camera);
  }

  private applyQuality(): void {
    const q = this.quality.current();
    this.webgl.shadowMap.enabled = q.shadows;
    this.moon.castShadow = q.shadows;
    if (this.moon.shadow.mapSize.x !== q.shadowMap) {
      this.moon.shadow.mapSize.set(q.shadowMap, q.shadowMap);
      this.moon.shadow.map?.dispose();
      this.moon.shadow.map = null;
    }
    this.scene.environmentIntensity =
      q.level === "ultra" ? 0.72 : q.level === "high" ? 0.55 : q.level === "balanced" ? 0.4 : 0.28;
    this.moon.shadow.radius = q.level === "ultra" ? 3.2 : q.level === "high" ? 2.5 : q.level === "balanced" ? 1.75 : 1;
    this.atmosphere?.applyQuality(q);
    this.resize();
  }

  private installEnvironment(): void {
    const pmrem = new THREE.PMREMGenerator(this.webgl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    this.scene.environment = target.texture;
    this.scene.environmentIntensity = 0.55;
    room.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
    });
    pmrem.dispose();
  }

  private async loadHdrEnvironment(): Promise<void> {
    this.bumpPhase("hdr", 0.05, "Lighting…");
    try {
      const url = `${import.meta.env.BASE_URL}textures/hdri/ward_env.hdr`;
      const manager = new THREE.LoadingManager();
      manager.onProgress = (_url, loaded, total) => {
        this.bumpPhase("hdr", total > 0 ? 0.1 + (loaded / total) * 0.85 : 0.5, "Lighting…");
      };
      const hdr = await new RGBELoader(manager).loadAsync(url);
      const pmrem = new THREE.PMREMGenerator(this.webgl);
      pmrem.compileEquirectangularShader();
      const env = pmrem.fromEquirectangular(hdr);
      const previous = this.scene.environment;
      this.scene.environment = env.texture;
      this.scene.environmentIntensity = 0.7;
      hdr.dispose();
      pmrem.dispose();
      previous?.dispose();
      this.bumpPhase("hdr", 1, "Lighting ready");
    } catch {
      // RoomEnvironment fallback already installed.
      this.bumpPhase("hdr", 1, "Lighting ready");
    }
  }

  private async loadFloors(): Promise<void> {
    this.bumpPhase("floors", 0.02, "Textures…");
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      this.bumpPhase("floors", total > 0 ? loaded / total : 0.2, `Textures ${loaded}/${total}`);
    };
    const loader = new THREE.TextureLoader(manager);
    const url = (file: string) => `${import.meta.env.BASE_URL}textures/${file}`;
    const pbr = (file: string) => `${import.meta.env.BASE_URL}textures/pbr/${file}`;
    const prefer = async (hi: string, lo: string) =>
      loader.loadAsync(pbr(hi)).catch(() => loader.loadAsync(pbr(lo)));
    try {
      const anisotropy = Math.min(16, this.webgl.capabilities.getMaxAnisotropy());
      const [
        stone,
        stoneRough,
        stoneNormal,
        stoneAo,
        stoneDisp,
        lava,
        lavaRough,
        lavaNormal,
        lavaAo,
        lavaDisp,
        roadDiff,
        roadRough,
        roadNormal,
        roadAo,
        roadDisp,
        wallDiff,
        wallRough,
        wallNormal,
        wallAo,
      ] = await Promise.all([
        prefer("dungeon_diff_8k.jpg", "dungeon_diff_4k.jpg"),
        prefer("dungeon_rough_8k.jpg", "dungeon_rough_4k.jpg"),
        prefer("dungeon_nor_gl_8k.jpg", "dungeon_nor_gl_4k.jpg"),
        prefer("dungeon_ao_8k.jpg", "dungeon_ao_4k.jpg"),
        loader.loadAsync(pbr("dungeon_disp_8k.jpg")).catch(() => null),
        prefer("hell_diff_8k.jpg", "hell_diff_4k.jpg"),
        prefer("hell_rough_8k.jpg", "hell_rough_4k.jpg"),
        prefer("hell_nor_gl_8k.jpg", "hell_nor_gl_4k.jpg"),
        prefer("hell_ao_8k.jpg", "hell_ao_4k.jpg"),
        loader.loadAsync(pbr("hell_disp_8k.jpg")).catch(() => null),
        prefer("road_diff_8k.jpg", "road_diff_4k.jpg"),
        prefer("road_rough_8k.jpg", "road_rough_4k.jpg"),
        prefer("road_nor_gl_8k.jpg", "road_nor_gl_4k.jpg"),
        prefer("road_ao_8k.jpg", "road_ao_4k.jpg"),
        loader.loadAsync(pbr("road_disp_8k.jpg")).catch(() => null),
        loader.loadAsync(pbr("wall_diff_8k.jpg")).catch(() => null),
        loader.loadAsync(pbr("wall_rough_8k.jpg")).catch(() => null),
        loader.loadAsync(pbr("wall_nor_gl_8k.jpg")).catch(() => null),
        loader.loadAsync(pbr("wall_ao_8k.jpg")).catch(() => null),
      ]);
      this.stone = prepFloor(stone, true, anisotropy, 10);
      this.stoneRough = prepFloor(stoneRough, false, anisotropy, 10);
      this.stoneNormal = prepFloor(stoneNormal, false, anisotropy, 10);
      this.stoneAo = prepFloor(stoneAo, false, anisotropy, 10);
      this.stoneDisp = stoneDisp ? prepFloor(stoneDisp, false, anisotropy, 10) : undefined;
      this.lava = prepFloor(lava, true, anisotropy, 10);
      this.lavaRough = prepFloor(lavaRough, false, anisotropy, 10);
      this.lavaNormal = prepFloor(lavaNormal, false, anisotropy, 10);
      this.lavaAo = prepFloor(lavaAo, false, anisotropy, 10);
      this.lavaDisp = lavaDisp ? prepFloor(lavaDisp, false, anisotropy, 10) : undefined;
      this.roadDiff = prepFloor(roadDiff, true, anisotropy, 6);
      this.roadRough = prepFloor(roadRough, false, anisotropy, 6);
      this.roadNormal = prepFloor(roadNormal, false, anisotropy, 6);
      this.roadAo = prepFloor(roadAo, false, anisotropy, 6);
      this.roadDisp = roadDisp ? prepFloor(roadDisp, false, anisotropy, 6) : undefined;
      this.wallDiff = wallDiff ? prepFloor(wallDiff, true, anisotropy, 4) : undefined;
      this.wallRough = wallRough ? prepFloor(wallRough, false, anisotropy, 4) : undefined;
      this.wallNormal = wallNormal ? prepFloor(wallNormal, false, anisotropy, 4) : undefined;
      this.wallAo = wallAo ? prepFloor(wallAo, false, anisotropy, 4) : undefined;
      this.realm = "";
    } catch {
      try {
        const [stone, stoneRough, lava, lavaRough] = await Promise.all([
          loader.loadAsync(url("dungeon_diff.jpg")),
          loader.loadAsync(url("dungeon_rough.jpg")),
          loader.loadAsync(url("hell_diff.jpg")),
          loader.loadAsync(url("hell_rough.jpg")),
        ]);
        const anisotropy = Math.min(8, this.webgl.capabilities.getMaxAnisotropy());
        this.stone = prepFloor(stone, true, anisotropy);
        this.stoneRough = prepFloor(stoneRough, false, anisotropy);
        this.lava = prepFloor(lava, true, anisotropy);
        this.lavaRough = prepFloor(lavaRough, false, anisotropy);
        this.realm = "";
      } catch {
        // Colored floor remains.
      }
    }
    this.bumpPhase("floors", 1, "Textures ready");
  }

  private applyRealm(next: "dungeon" | "hell"): void {
    if (this.realm === next) return;
    const fog = this.scene.fog as THREE.Fog;
    if (next === "dungeon") {
      this.groundMat.map = this.stone ?? null;
      this.groundMat.roughnessMap = this.stoneRough ?? null;
      this.groundMat.normalMap = this.stoneNormal ?? null;
      this.groundMat.aoMap = this.stoneAo ?? null;
      this.groundMat.aoMapIntensity = this.stoneAo ? 0.9 : 1;
      this.groundMat.displacementMap = this.stoneDisp ?? null;
      this.groundMat.displacementScale = this.stoneDisp ? 0.22 : 0;
      this.groundMat.displacementBias = this.stoneDisp ? -0.05 : 0;
      if (this.groundMat.normalMap) this.groundMat.normalScale.set(1.7, 1.7);
      this.groundMat.emissiveMap = null;
      this.groundMat.emissive.set(0x000000);
      this.groundMat.emissiveIntensity = 0;
      this.groundMat.color.set(0xdce4ec);
      this.groundMat.roughness = 0.92;
      this.groundMat.metalness = 0.05;
      this.groundMat.envMapIntensity = 0.64;
      this.webgl.setClearColor(0x2e2a26);
      fog.color.set(0x6f675c);
      fog.near = 22;
      fog.far = 105;
      this.hemi.color.set(0xffe8d2);
      this.hemi.groundColor.set(0x4a4034);
      this.hemi.intensity = 1.05;
      this.moon.color.set(0xfff1de);
      this.moon.intensity = 2.05;
      this.fill.color.set(0x9aabbc);
      this.fill.intensity = 0.32;
      this.rim.color.set(0x8ea6c0);
      this.rim.intensity = 0.42;
      this.ember.color.set(0xffa45a);
      this.ember.intensity = 28;
      this.ember.distance = 28;
      this.tintScenery(0xb8b0a4, 0.88, 0.08, 0.62);
      if (this.roadMat) {
        this.roadMat.map = this.roadDiff ?? null;
        this.roadMat.roughnessMap = this.roadRough ?? null;
        this.roadMat.normalMap = this.roadNormal ?? null;
        this.roadMat.aoMap = this.roadAo ?? null;
        this.roadMat.aoMapIntensity = this.roadAo ? 0.8 : 1;
        this.roadMat.displacementMap = this.roadDisp ?? null;
        this.roadMat.displacementScale = this.roadDisp ? 0.1 : 0;
        this.roadMat.displacementBias = this.roadDisp ? -0.025 : 0;
        if (this.roadMat.normalMap) this.roadMat.normalScale.set(1.05, 1.05);
        this.roadMat.color.set(0xd8d0c4);
        this.roadMat.roughness = 0.9;
        this.roadMat.metalness = 0.06;
        this.roadMat.envMapIntensity = 0.52;
        this.roadMat.needsUpdate = true;
      }
    } else {
      this.groundMat.map = this.lava ?? null;
      this.groundMat.roughnessMap = this.lavaRough ?? null;
      this.groundMat.normalMap = this.lavaNormal ?? null;
      this.groundMat.aoMap = this.lavaAo ?? null;
      this.groundMat.aoMapIntensity = this.lavaAo ? 0.75 : 1;
      this.groundMat.displacementMap = this.lavaDisp ?? null;
      this.groundMat.displacementScale = this.lavaDisp ? 0.28 : 0;
      this.groundMat.displacementBias = this.lavaDisp ? -0.06 : 0;
      if (this.groundMat.normalMap) this.groundMat.normalScale.set(1.45, 1.45);
      this.groundMat.emissiveMap = this.lava ?? null;
      this.groundMat.emissive.set(0xff4a16);
      this.groundMat.emissiveIntensity = 0.72;
      this.groundMat.color.set(0xffebe0);
      this.groundMat.roughness = 0.68;
      this.groundMat.metalness = 0.1;
      this.groundMat.envMapIntensity = 0.6;
      this.webgl.setClearColor(0x2a0e0a);
      fog.color.set(0x5a1e12);
      fog.near = 14;
      fog.far = 82;
      this.hemi.color.set(0xffb088);
      this.hemi.groundColor.set(0x4a1408);
      this.hemi.intensity = 0.95;
      this.moon.color.set(0xff6a38);
      this.moon.intensity = 1.85;
      this.fill.color.set(0xff3c16);
      this.fill.intensity = 0.7;
      this.rim.color.set(0xff7a4a);
      this.rim.intensity = 0.48;
      this.ember.color.set(0xff4a12);
      this.ember.intensity = 48;
      this.ember.distance = 36;
      this.tintScenery(0xc4886e, 0.72, 0.14, 0.72);
      if (this.roadMat) {
        this.roadMat.map = this.roadDiff ?? null;
        this.roadMat.roughnessMap = this.roadRough ?? null;
        this.roadMat.normalMap = this.roadNormal ?? null;
        this.roadMat.aoMap = this.roadAo ?? null;
        this.roadMat.displacementMap = this.roadDisp ?? null;
        this.roadMat.displacementScale = this.roadDisp ? 0.1 : 0;
        this.roadMat.displacementBias = this.roadDisp ? -0.025 : 0;
        this.roadMat.color.set(0xc4886e);
        this.roadMat.roughness = 0.78;
        this.roadMat.metalness = 0.08;
        this.roadMat.envMapIntensity = 0.56;
        this.roadMat.needsUpdate = true;
      }
    }
    this.groundMat.needsUpdate = true;
    this.realm = next;
  }

  private tintScenery(hex: number, roughness: number, metalness: number, envMapIntensity: number): void {
    for (const key of ["wall", "wall-broken", "pillar", "column", "wall-arch", "doorway", "stairs"]) {
      const piece = this.templates.get(key);
      if (!piece) continue;
      piece.scene.traverse((node: THREE.Object3D) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          const standard = material as THREE.MeshStandardMaterial;
          if (!standard.color) continue;
          if (
            this.wallDiff &&
            (key === "wall" ||
              key === "wall-broken" ||
              key === "wall-arch" ||
              key === "doorway" ||
              key === "pillar" ||
              key === "column")
          ) {
            standard.map = this.wallDiff;
            standard.roughnessMap = this.wallRough ?? null;
            standard.normalMap = this.wallNormal ?? null;
            standard.aoMap = this.wallAo ?? null;
            standard.color.set(0xffffff);
            if (standard.normalMap) standard.normalScale.set(1.45, 1.45);
          } else {
            standard.color.set(hex);
          }
          if ("roughness" in standard) standard.roughness = roughness;
          if ("metalness" in standard) standard.metalness = metalness;
          if ("envMapIntensity" in standard) standard.envMapIntensity = envMapIntensity;
          standard.needsUpdate = true;
        }
      });
    }
  }

  private async loadModels(): Promise<void> {
    this.bumpPhase("models", 0.02, "Models…");
    const entries = Object.entries(FILES);
    const total = entries.length;
    let done = 0;
    const manager = new THREE.LoadingManager();
    const loader = new GLTFLoader(manager);
    await Promise.all(
      entries.map(async ([key, file]) => {
        try {
          const gltf = await loader.loadAsync(MODEL_URL(file));
          this.templates.set(key, { scene: gltf.scene, clips: gltf.animations });
        } catch {
          // A missing model falls back to a plain figure.
        } finally {
          done += 1;
          this.bumpPhase("models", done / total, `Models ${done}/${total}`);
        }
      }),
    );
    this.bumpPhase("models", 1, "Models ready");
    this.realm = "";
  }

  private buildDungeon(): void {
    this.propsBuilt = true;
    const minX = ARENA.margin * SCALE;
    const maxX = (ARENA.width - ARENA.margin) * SCALE;
    const minZ = ARENA.margin * SCALE;
    const maxZ = (ARENA.height - ARENA.margin) * SCALE;
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
    const step = 22;
    for (let x = minX; x <= maxX; x += step) {
      const broken = Math.round(x) % 44 === 0;
      place(broken ? "wall-broken" : "wall", x, minZ, 0, step);
      place(broken ? "wall-broken" : "wall", x, maxZ, Math.PI, step);
    }
    for (let z = minZ + step; z <= maxZ - step; z += step) {
      place("wall", minX, z, Math.PI / 2, step);
      place("wall", maxX, z, -Math.PI / 2, step);
    }
    const spine = roadSpine();
    this.roadMat = new THREE.MeshStandardMaterial({
      color: 0xd8d0c4,
      roughness: 0.9,
      metalness: 0.06,
      envMapIntensity: 0.45,
      map: this.roadDiff ?? null,
      roughnessMap: this.roadRough ?? null,
      normalMap: this.roadNormal ?? null,
      aoMap: this.roadAo ?? null,
      aoMapIntensity: 0.8,
      displacementMap: this.roadDisp ?? null,
      displacementScale: this.roadDisp ? 0.1 : 0,
      displacementBias: this.roadDisp ? -0.025 : 0,
    });
    if (this.roadMat.normalMap) this.roadMat.normalScale.set(1.05, 1.05);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(7, Math.max(1, (spine.fromY - spine.toY) * SCALE), 1, 1),
      this.roadMat,
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(spine.x * SCALE, 0.02, ((spine.fromY + spine.toY) / 2) * SCALE);
    road.receiveShadow = true;
    // aoMap needs a second UV channel — copy uv → uv2
    const roadGeo = road.geometry as THREE.BufferGeometry;
    if (roadGeo.getAttribute("uv") && !roadGeo.getAttribute("uv2")) {
      roadGeo.setAttribute("uv2", roadGeo.getAttribute("uv").clone());
    }
    this.scene.add(road);
    const borderKeys = ["wall", "wall-broken", "column", "pillar", "rubble", "rubble-half", "wall-arch"] as const;
    const borderStep = 21;
    const borderXs = [(ROAD_X - 200) * SCALE, (ROAD_X + 200) * SCALE];
    const borderZHi = Math.max(spine.fromY, spine.toY) * SCALE;
    const borderZLo = Math.min(spine.fromY, spine.toY) * SCALE;
    let borderIdx = 0;
    for (let bz = borderZHi; bz >= borderZLo; bz -= borderStep) {
      for (let side = 0; side < 2; side++) {
        const key = borderKeys[borderIdx % borderKeys.length]!;
        const bx = borderXs[side]!;
        const rot = (side === 0 ? Math.PI / 2 : -Math.PI / 2) + (borderIdx % 7) * 0.06;
        const width =
          key === "wall-arch" ? 3.1 : key === "pillar" || key === "column" ? 2.3 : key.startsWith("rubble") ? 2.6 : 2.5;
        place(key, bx, bz, rot, width);
        borderIdx += 1;
      }
    }
    // Emissive torch bowls + denser dressing at pack columns.
    const torchMat = new THREE.MeshStandardMaterial({
      color: 0x2a1c12,
      roughness: 0.8,
      metalness: 0.2,
      envMapIntensity: 0.4,
      emissive: 0xff6a28,
      emissiveIntensity: 0.55,
    });
    const dressing = ["chest", "barrel", "crates", "rubble", "banner", "table", "candle", "torch"] as const;
    const seen = new Set<string>();
    let dressIdx = 0;
    for (const pack of worldPacks()) {
      const key = pack.branch ? pack.id : `${pack.level}`;
      if (!pack.branch && pack.id !== `${pack.level}-0`) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      const markX = (pack.branch ? pack.x : ROAD_X + 220) * SCALE;
      const markZ = pack.y * SCALE;
      place("column", markX, markZ, 0, 2.4);
      place(dressing[dressIdx % dressing.length]!, markX + 1.4, markZ + 0.6, dressIdx * 0.7, 1.1);
      place(dressing[(dressIdx + 3) % dressing.length]!, markX - 1.2, markZ - 0.5, -dressIdx * 0.5, 1.0);
      if (dressIdx % 2 === 0) place("banner-blue", markX + 0.2, markZ - 1.3, 0, 1.4);
      if (dressIdx % 3 === 0) place("wall-arch", markX - 2.2, markZ, Math.PI / 2, 3.2);
      dressIdx += 1;
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), torchMat);
      bowl.position.set(markX, 2.1, markZ);
      bowl.castShadow = false;
      bowl.receiveShadow = false;
      this.scene.add(bowl);
    }
  }

  private syncPlayer(sim: Sim, dt: number): void {
    const kind = sim.character.race || "human";
    const height = HERO_HEIGHT[kind] ?? 1.78;
    if (!this.player || this.playerKind !== kind) {
      if (this.player) this.scene.remove(this.player.root);
      this.player = this.makeActor(kind, height, false);
      this.playerKind = kind;
      if (this.player) this.scene.add(this.player.root);
    }
    if (!this.player) return;
    const moved = Math.hypot(sim.player.x - this.lastPlayer.x, sim.player.y - this.lastPlayer.y) > 0.4;
    this.lastPlayer.set(sim.player.x, sim.player.y);
    this.placeActor(
      this.player,
      sim.player.x,
      sim.player.y,
      sim.player.facing,
      dt,
      moved,
      sim.player.swing > 0,
      HERO_ATTACK_DUR,
      false,
    );
    this.paintGear(this.player, sim);
    const ward = this.player.root.getObjectByName("ward-shell");
    if (sim.player.shield > 0 && !ward) {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xe7c39a, transparent: true, opacity: 0.18 }),
      );
      shell.name = "ward-shell";
      shell.position.y = height * 0.55;
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
    const hero = isHeroRace(kind);
    const procedural = !hero && isProceduralMonster(kind);
    const loaded = hero || procedural ? null : this.templates.get(kind);
    const template = hero
      ? { scene: buildHero(kind), clips: heroAnimationClips(kind) }
      : procedural
        ? { scene: buildMonster(kind as import("./game/types").EnemyKind), clips: [] as THREE.AnimationClip[] }
        : loaded ?? fallbackFigure(kind, height);
    const model = hero || procedural ? template.scene : cloneSkinned(template.scene);
    if (loaded) this.dress(model, kind);
    cloneMaterials(model);
    if (!hero && !procedural) fitFeet(model, height);
    const root = new THREE.Group();
    root.add(model);
    const marker = markerFor(hero ? "knight" : kind);
    const big = kind === "brute" || kind === "hillock";
    const small = kind === "hound" || kind === "wolf";
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(big ? 0.62 : small ? 0.36 : hero ? 0.4 : 0.46, 24),
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
      placeholder: !hero && !procedural && !loaded,
      kind,
      attackLeft: 0,
      attackDur: 0.5,
      held: false,
      hitLeft: 0,
      hurt: false,
      animDebt: 0,
      armed: hero || procedural || !GEAR[kind],
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
    // Soft body dye under the handcrafted armor shells.
    tintHead(model, eq.head);
    tintNamed(model, ["Body"], eq.chest);
    tintNamed(model, ["ArmLeft", "ArmRight", "ArmLeft2", "ArmRight2"], eq.gloves);
    tintNamed(model, ["LegLeft", "LegRight"], eq.boots);
    syncHeroGear(model, eq, performance.now());
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
    if (attackPulse && !actor.held) {
      actor.attackLeft = attackSeconds;
      actor.attackDur = attackSeconds;
      replay(actor.attack, attackSeconds);
    }
    actor.held = attackPulse;
    if (actor.attackLeft > 0) actor.attackLeft = Math.max(0, actor.attackLeft - dt);
    // Josh rule: dodge / shield-block / flinch must NOT cancel a committed attack.
    // Only start a hit react when not mid-strike; tint can still flash while attacking.
    if (hitPulse && actor.hitLeft <= 0 && actor.attackLeft <= 0) actor.hitLeft = 0.28;
    if (actor.hitLeft > 0) actor.hitLeft = Math.max(0, actor.hitLeft - dt);
    const next =
      actor.attackLeft > 0 ? "attack" : actor.hitLeft > 0 ? "hit" : moving ? "walk" : "idle";
    if (actor.mode !== next) {
      const action = next === "hit" ? actor.hit : next === "attack" ? actor.attack : next === "walk" ? actor.walk : actor.idle;
      if (next === "hit") replay(actor.hit, 0.28);
      else if (next !== "attack") action?.reset().fadeIn(0.08).play();
      const previous =
        actor.mode === "hit" ? actor.hit : actor.mode === "attack" ? actor.attack : actor.mode === "walk" ? actor.walk : actor.idle;
      if (previous !== action) previous?.fadeOut(0.08);
      actor.mode = next;
    }
    const swinging = actor.attackLeft > 0;
    const elapsed = swinging ? 1 - actor.attackLeft / Math.max(0.001, actor.attackDur) : 0;
    const hero = isHeroRace(actor.kind);
    const model = actor.root.children[0];
    const equippedBlade = hero && !!model?.getObjectByName("gear-main")?.visible;
    // Heroes swing real hand weapons; keep a faint trail on the hand, hide the ghost root blade.
    if (hero && actor.slash && model) {
      const hand = model.getObjectByName("handslot.r") ?? model.getObjectByName("hand.r");
      if (hand && actor.slash.parent !== hand) {
        hand.add(actor.slash);
        actor.slash.position.set(0, 0.35, 0.02);
        actor.slash.rotation.set(-Math.PI / 2, 0, 0);
        actor.slash.scale.setScalar(0.55);
      }
      actor.slash.visible = swinging;
      actor.slash.rotation.z = (elapsed - 0.5) * 1.4;
      const slashMat = actor.slash.material as THREE.MeshBasicMaterial;
      slashMat.opacity = swinging ? (equippedBlade ? 0.28 + elapsed * 0.25 : 0.7) : 0;
    } else if (actor.slash) {
      actor.slash.visible = swinging;
    }
    if (actor.blade) {
      actor.blade.visible = swinging && !equippedBlade;
      if (actor.blade.visible) {
        actor.blade.rotation.y = (elapsed - 0.5) * 1.7;
        const mat = actor.blade.material as THREE.MeshBasicMaterial;
        mat.opacity = swinging ? 0.35 + elapsed * 0.55 : 0;
      }
    }
    const hurt = hitPulse || actor.hitLeft > 0;
    if (hurt !== actor.hurt) {
      actor.hurt = hurt;
      tintActor(actor.root, hurt);
    }
    // Full-rate mixer while swinging so weapons arc smoothly; otherwise step for cost.
    if (swinging || actor.hitLeft > 0) {
      actor.mixer.update(dt);
      actor.animDebt = 0;
    } else {
      actor.animDebt += dt;
      if (actor.animDebt >= ANIM_STEP) {
        actor.mixer.update(actor.animDebt);
        actor.animDebt = 0;
      }
    }
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
    const q = this.quality.current();
    const shown = bursts.length > q.maxBursts ? bursts.slice(bursts.length - q.maxBursts) : bursts;
    while (this.bursts.length < shown.length) {
      const group = new THREE.Group();
      this.scene.add(group);
      this.bursts.push({ kind: "", group });
    }
    this.bursts.forEach((entry, index) => {
      const burst = shown[index];
      entry.group.visible = !!burst;
      if (!burst) return;
      if (entry.kind !== burst.kind) {
        entry.group.clear();
        buildBurst(entry.group, burst.kind, burst.color, q.fxScale);
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

function facingOf(enemy: Enemy, sim: Sim): number {
  return Math.atan2(sim.player.y - enemy.y, sim.player.x - enemy.x);
}

function prepFloor(texture: THREE.Texture, color: boolean, anisotropy: number, repeat = 12): THREE.Texture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat * 0.7);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
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
  if (kind === "mage" || kind === "brute" || kind === "cultist" || kind === "lumen") return { ring: 0xb9a4e8, swing: 0xd8c8ff, melee: false };
  if (kind === "hound" || kind === "wolf" || kind === "imp") return { ring: 0xd2563a, swing: 0xff8a62, melee: true };
  if (kind === "archer" || kind === "wisp" || kind === "flicker") return { ring: 0x7eb6d6, swing: 0xb7e4ff, melee: false };
  if (kind === "sentinel" || kind === "gargoyle" || kind === "hillock") return { ring: 0xd7b56a, swing: 0xffe0a0, melee: true };
  if (kind === "slime" || kind === "sprig") return { ring: 0x6ecf7a, swing: 0xa8ef9a, melee: true };
  if (kind === "spider" || kind === "lurker") return { ring: 0x8a6a9a, swing: 0xc8a0e0, melee: true };
  if (kind === "whelp") return { ring: 0xff6a2a, swing: 0xffa060, melee: true };
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

function buildBurst(group: THREE.Group, kind: string, color: string, fxScale = 1): void {
  const material = () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  const detail = Math.max(0.35, fxScale);
  if (kind === "fire" || kind === "frost" || kind === "arcane") {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.72, Math.max(12, Math.round(28 * detail))), material());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    const inner = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.28, Math.max(10, Math.round(20 * detail))), material());
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.12;
    group.add(ring, inner);
    const spikes = Math.max(3, Math.round((kind === "frost" ? 8 : 6) * detail));
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
    if (node.name.startsWith("gear-")) return;
    const material = standardMaterial(node as THREE.Mesh);
    if (!material) return;
    applyFinish(material, item.dye, finish.metalness, finish.roughness, item.ethereal, true);
  });
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
  material.transparent = ethereal;
  material.opacity = ethereal ? 0.55 : 1;
  material.depthWrite = !ethereal;
  material.emissive.setHex(ethereal ? 0xb7d4ea : 0x000000);
  material.emissiveIntensity = ethereal ? 0.4 : 0;
  if (ethereal) material.color.lerp(new THREE.Color(0xd7e8f6), 0.45);
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
