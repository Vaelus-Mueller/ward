/**
 * Day/night cycle, sparse mist, godrays, and rare weather — phone-budget friendly.
 *
 * Knobs (also documented in environment-visual-pass.md):
 * - DAY_SECONDS: real-time length of a full day→night loop
 * - WEATHER_ROLL_SECONDS: how often we reconsider weather intensity (type is locked per level)
 * - WEATHER_CHANCE: probability a level gets a non-clear weather type at lock time
 * - AdaptiveQuality.atmosphere / .weather scale particle & shaft budgets
 */
import * as THREE from "three";
import type { QualitySettings } from "./quality";

export type WeatherType = "clear" | "rain" | "snow" | "mist";
export type RealmId = "dungeon" | "hell";

/** Full day/night loop in real seconds (~10 min). */
export const DAY_SECONDS = 600;
/** Background weather intensity reconsider interval. */
export const WEATHER_ROLL_SECONDS = 180;
/** Chance a level locks a non-clear weather type. */
export const WEATHER_CHANCE = 0.18;

export interface AtmosphereTargets {
  playerX: number;
  playerZ: number;
  moon: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  ember: THREE.PointLight;
  fog: THREE.Fog;
  groundMat: THREE.MeshStandardMaterial;
  roadMat: THREE.MeshStandardMaterial | null;
  renderer: THREE.WebGLRenderer;
  realm: RealmId;
}

interface TodSample {
  phase: number;
  /** 0 night … 1 day peak. */
  dayFactor: number;
  keyColor: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  fillColor: THREE.Color;
  rimColor: THREE.Color;
  fogColor: THREE.Color;
  clearColor: THREE.Color;
  keyIntensity: number;
  hemiIntensity: number;
  fillIntensity: number;
  rimIntensity: number;
  emberIntensity: number;
  exposure: number;
  fogNear: number;
  fogFar: number;
  shaftStrength: number;
}

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

function lerpColor(out: THREE.Color, a: number, b: number, t: number): THREE.Color {
  return out.set(a).lerp(tmpB.set(b), t);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function sampleTod(phase: number, realm: RealmId): TodSample {
  // phase: 0 dawn, 0.25 day, 0.5 dusk, 0.75 night, 1 dawn
  const dayFactor = Math.sin(phase * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  const dawn = smoothstep(0.0, 0.12, phase) * (1 - smoothstep(0.12, 0.22, phase));
  const dusk = smoothstep(0.42, 0.52, phase) * (1 - smoothstep(0.52, 0.62, phase));
  const night = phase > 0.62 || phase < 0.05 ? (phase > 0.62 ? smoothstep(0.62, 0.78, phase) : 1) : 0;

  if (realm === "hell") {
    const emberBoost = 0.65 + night * 0.45;
    return {
      phase,
      dayFactor,
      keyColor: lerpColor(tmpA, 0xff6a38, 0xff3c16, night),
      hemiSky: lerpColor(new THREE.Color(), 0xffb088, 0xff7040, night * 0.6),
      hemiGround: new THREE.Color(0x4a1408),
      fillColor: new THREE.Color(0xff3c16),
      rimColor: lerpColor(new THREE.Color(), 0xff8a5a, 0xff5020, night),
      fogColor: lerpColor(new THREE.Color(), 0x5a1e12, 0x3a1008, night),
      clearColor: lerpColor(new THREE.Color(), 0x2a0e0a, 0x140605, night),
      keyIntensity: 1.55 + dayFactor * 0.45,
      hemiIntensity: 0.85 + dayFactor * 0.2,
      fillIntensity: 0.55 + night * 0.25,
      rimIntensity: 0.4 + dusk * 0.2,
      emberIntensity: 36 * emberBoost,
      exposure: 1.05 + dayFactor * 0.08,
      fogNear: 12 + dayFactor * 4,
      fogFar: 58 + dayFactor * 10,
      shaftStrength: 0.35 + dawn * 0.35 + dusk * 0.45,
    };
  }

  // Gothic stone dungeon — “day” is cooler shaft light; night is ember-heavy.
  return {
    phase,
    dayFactor,
    keyColor: lerpColor(tmpA, 0xfff1de, 0xb8c4d8, night * 0.7 + dusk * 0.2),
    hemiSky: lerpColor(new THREE.Color(), 0xffe8d2, 0x8a9bb0, night),
    hemiGround: lerpColor(new THREE.Color(), 0x4a4034, 0x2a241c, night),
    fillColor: lerpColor(new THREE.Color(), 0x9aabbc, 0x6a7a90, night),
    rimColor: lerpColor(new THREE.Color(), 0x8ea6c0, 0xffa060, night * 0.5 + dusk * 0.4),
    fogColor: lerpColor(new THREE.Color(), 0x6f675c, 0x3a3530, night),
    clearColor: lerpColor(new THREE.Color(), 0x2e2a26, 0x161412, night),
    keyIntensity: 1.55 + dayFactor * 0.7,
    hemiIntensity: 0.75 + dayFactor * 0.4,
    fillIntensity: 0.22 + dayFactor * 0.18,
    rimIntensity: 0.32 + dusk * 0.28 + dawn * 0.15,
    emberIntensity: 18 + night * 22 + dusk * 10,
    exposure: 1.02 + dayFactor * 0.14,
    fogNear: 18 + dayFactor * 8,
    fogFar: 72 + dayFactor * 22,
    shaftStrength: 0.25 + dawn * 0.55 + dusk * 0.65 + dayFactor * 0.15,
  };
}

function makeSoftDisc(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.45, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeShaftTex(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(size / 2, 0, size / 2, size);
  g.addColorStop(0, "rgba(255,240,210,0)");
  g.addColorStop(0.2, "rgba(255,230,190,0.35)");
  g.addColorStop(0.55, "rgba(255,210,160,0.18)");
  g.addColorStop(1, "rgba(255,200,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const soft = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5);
  soft.addColorStop(0, "rgba(255,255,255,0.2)");
  soft.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = soft;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class AtmosphereFx {
  private readonly clock = { elapsed: Math.random() * DAY_SECONDS * 0.4 };
  private readonly getQuality: () => QualitySettings;
  private weatherType: WeatherType = "clear";
  private weatherIntensity = 0;
  private weatherTarget = 0;
  private weatherRollIn = WEATHER_ROLL_SECONDS * (0.4 + Math.random() * 0.4);
  private lockedLevel = -1;
  private realm: RealmId = "dungeon";
  private rolling = false;

  private readonly mist: THREE.Points;
  private readonly mistMat: THREE.PointsMaterial;
  private readonly mistVel: Float32Array;
  private readonly shafts: THREE.Mesh[] = [];
  private readonly shaftMat: THREE.MeshBasicMaterial;
  private readonly weather: THREE.Points;
  private readonly weatherMat: THREE.PointsMaterial;
  private readonly weatherVel: Float32Array;
  private readonly softTex: THREE.CanvasTexture;
  private readonly shaftTex: THREE.CanvasTexture;
  private readonly group = new THREE.Group();

  private base = {
    key: 2.05,
    hemi: 1.05,
    fill: 0.32,
    rim: 0.42,
    ember: 28,
    fogNear: 22,
    fogFar: 88,
    fog: new THREE.Color(0x6f675c),
    clear: new THREE.Color(0x2e2a26),
  };

  constructor(
    private readonly scene: THREE.Scene,
    _renderer: THREE.WebGLRenderer,
    getQuality: () => QualitySettings,
  ) {
    this.getQuality = getQuality;
    this.softTex = makeSoftDisc();
    this.shaftTex = makeShaftTex();
    this.group.name = "AtmosphereFx";

    const mistCount = 64;
    const mistGeo = new THREE.BufferGeometry();
    const mistPos = new Float32Array(mistCount * 3);
    this.mistVel = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      mistPos[i * 3] = (Math.random() - 0.5) * 28;
      mistPos[i * 3 + 1] = 0.4 + Math.random() * 4.5;
      mistPos[i * 3 + 2] = (Math.random() - 0.5) * 28;
      this.mistVel[i * 3] = (Math.random() - 0.5) * 0.15;
      this.mistVel[i * 3 + 1] = 0.02 + Math.random() * 0.05;
      this.mistVel[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    }
    mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
    this.mistMat = new THREE.PointsMaterial({
      map: this.softTex,
      color: 0xd8cfc2,
      size: 1.8,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.mist = new THREE.Points(mistGeo, this.mistMat);
    this.mist.frustumCulled = false;
    this.group.add(this.mist);

    this.shaftMat = new THREE.MeshBasicMaterial({
      map: this.shaftTex,
      color: 0xffe2c0,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 14), this.shaftMat);
      mesh.position.set((i - 1.5) * 2.2, 7, -1 + (i % 2) * 1.4);
      mesh.rotation.x = -0.35;
      mesh.renderOrder = 2;
      this.shafts.push(mesh);
      this.group.add(mesh);
    }

    const weatherCount = 140;
    const weatherGeo = new THREE.BufferGeometry();
    const weatherPos = new Float32Array(weatherCount * 3);
    this.weatherVel = new Float32Array(weatherCount);
    for (let i = 0; i < weatherCount; i++) {
      weatherPos[i * 3] = (Math.random() - 0.5) * 30;
      weatherPos[i * 3 + 1] = Math.random() * 12;
      weatherPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      this.weatherVel[i] = 4 + Math.random() * 6;
    }
    weatherGeo.setAttribute("position", new THREE.BufferAttribute(weatherPos, 3));
    this.weatherMat = new THREE.PointsMaterial({
      map: this.softTex,
      color: 0xc8d4e4,
      size: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.weather = new THREE.Points(weatherGeo, this.weatherMat);
    this.weather.frustumCulled = false;
    this.weather.visible = false;
    this.group.add(this.weather);

    this.scene.add(this.group);
    this.applyQuality(getQuality());
  }

  applyQuality(q: QualitySettings): void {
    const atmo = q.atmosphere;
    this.mist.visible = atmo > 0.05;
    this.mistMat.opacity = 0.06 + atmo * 0.1;
    for (const shaft of this.shafts) shaft.visible = atmo > 0.05;
    this.shaftMat.opacity = 0.04 + atmo * 0.1;
    const weatherOn = q.weather > 0.05 && this.weatherType !== "clear";
    this.weather.visible = weatherOn;
    if (!weatherOn) this.weatherMat.opacity = 0;
  }

  onLevelChange(level: number, realm: RealmId): void {
    this.realm = realm;
    if (level === this.lockedLevel) return;
    this.lockedLevel = level;
    // Lock type once per level — never rain-then-snow in the same run.
    this.weatherType = this.pickWeatherType(level, realm);
    this.weatherTarget = this.weatherType === "clear" ? 0 : 0.35 + Math.random() * 0.45;
    this.weatherIntensity = 0;
    this.weatherRollIn = WEATHER_ROLL_SECONDS * (0.5 + Math.random() * 0.5);
    this.styleWeather();
    this.applyQuality(this.getQuality());
  }

  private pickWeatherType(level: number, realm: RealmId): WeatherType {
    // Deterministic-ish per level so reloads feel stable, still rare.
    const seed = ((level * 2654435761) >>> 0) % 1000;
    if (seed / 1000 > WEATHER_CHANCE) return "clear";
    if (realm === "hell") return seed % 2 === 0 ? "mist" : "clear";
    const pick = seed % 3;
    if (pick === 0) return "rain";
    if (pick === 1) return "snow";
    return "mist";
  }

  private styleWeather(): void {
    if (this.weatherType === "rain") {
      this.weatherMat.color.set(0xa8bdd4);
      this.weatherMat.size = 0.1;
      this.weatherMat.opacity = 0;
    } else if (this.weatherType === "snow") {
      this.weatherMat.color.set(0xeef2f8);
      this.weatherMat.size = 0.22;
      this.weatherMat.opacity = 0;
    } else if (this.weatherType === "mist") {
      this.weatherMat.color.set(0xd2c8b8);
      this.weatherMat.size = 1.4;
      this.weatherMat.opacity = 0;
    }
  }

  /** Capture realm-tuned bases before TOD modulation (call after applyRealm). */
  captureBases(t: AtmosphereTargets): void {
    this.base.key = t.moon.intensity;
    this.base.hemi = t.hemi.intensity;
    this.base.fill = t.fill.intensity;
    this.base.rim = t.rim.intensity;
    this.base.ember = t.ember.intensity;
    this.base.fogNear = t.fog.near;
    this.base.fogFar = t.fog.far;
    this.base.fog.copy(t.fog.color);
    this.base.clear.copy(t.renderer.getClearColor(new THREE.Color()));
  }

  update(dt: number, t: AtmosphereTargets): void {
    this.clock.elapsed += dt;
    this.realm = t.realm;
    this.group.position.set(t.playerX, 0, t.playerZ);

    this.scheduleWeatherRoll(dt);
    this.weatherIntensity += (this.weatherTarget - this.weatherIntensity) * Math.min(1, dt * 0.35);

    const phase = (this.clock.elapsed / DAY_SECONDS) % 1;
    const tod = sampleTod(phase, t.realm);
    this.applyTod(t, tod);
    this.updateMist(dt, tod);
    this.updateShafts(t, tod);
    this.updateWeatherParticles(dt);
  }

  private applyTod(t: AtmosphereTargets, tod: TodSample): void {
    const q = this.getQuality();
    const weatherFog = this.weatherIntensity * (this.weatherType === "mist" ? 0.35 : this.weatherType === "rain" ? 0.18 : 0.1);

    t.moon.color.copy(tod.keyColor);
    t.moon.intensity = tod.keyIntensity * (0.92 + q.atmosphere * 0.08);
    t.hemi.color.copy(tod.hemiSky);
    t.hemi.groundColor.copy(tod.hemiGround);
    t.hemi.intensity = tod.hemiIntensity;
    t.fill.color.copy(tod.fillColor);
    t.fill.intensity = tod.fillIntensity;
    t.rim.color.copy(tod.rimColor);
    t.rim.intensity = tod.rimIntensity;
    t.ember.intensity = tod.emberIntensity;
    t.renderer.toneMappingExposure = tod.exposure;
    t.renderer.setClearColor(tod.clearColor);
    t.fog.color.copy(tod.fogColor);
    t.fog.near = Math.max(8, tod.fogNear * (1 - weatherFog * 0.35));
    t.fog.far = tod.fogFar * (1 - weatherFog * 0.25);

    // Stronger key→shadow contrast in daylight peaks.
    if (t.moon.castShadow) {
      t.moon.shadow.radius = q.level === "high" ? 2.2 - tod.dayFactor * 0.5 : 1.6;
    }
  }

  private updateMist(dt: number, tod: TodSample): void {
    if (!this.mist.visible) return;
    const pos = this.mist.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const weatherMist = this.weatherType === "mist" ? this.weatherIntensity * 0.5 : 0;
    this.mistMat.opacity = (0.05 + tod.shaftStrength * 0.04 + weatherMist * 0.12) * Math.max(0.2, this.getQuality().atmosphere);
    this.mistMat.color.set(this.realm === "hell" ? 0xc08060 : 0xd8cfc2);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += this.mistVel[i]! * dt;
      arr[i + 1] += this.mistVel[i + 1]! * dt;
      arr[i + 2] += this.mistVel[i + 2]! * dt;
      if (arr[i + 1]! > 5.2) {
        arr[i] = (Math.random() - 0.5) * 28;
        arr[i + 1] = 0.3;
        arr[i + 2] = (Math.random() - 0.5) * 28;
      }
      if (Math.abs(arr[i]!) > 16) this.mistVel[i] = -(this.mistVel[i] ?? 0);
      if (Math.abs(arr[i + 2]!) > 16) this.mistVel[i + 2] = -(this.mistVel[i + 2] ?? 0);
    }
    pos.needsUpdate = true;
  }

  private updateShafts(t: AtmosphereTargets, tod: TodSample): void {
    const atmo = this.getQuality().atmosphere;
    if (atmo < 0.05) return;
    const dir = new THREE.Vector3().subVectors(t.moon.position, this.group.position).normalize();
    const strength = tod.shaftStrength * atmo * (0.7 + (1 - this.weatherIntensity * 0.4));
    this.shaftMat.opacity = 0.03 + strength * 0.14;
    this.shaftMat.color.copy(tod.keyColor);
    for (let i = 0; i < this.shafts.length; i++) {
      const shaft = this.shafts[i]!;
      shaft.visible = strength > 0.12;
      shaft.position.set((i - 1.5) * 2.4 + dir.x * 0.5, 7.2, -2 + (i % 2) * 2 + dir.z * 0.5);
      shaft.lookAt(shaft.position.x - dir.x * 4, 0.2, shaft.position.z - dir.z * 4);
    }
  }

  private updateWeatherParticles(dt: number): void {
    const q = this.getQuality();
    if (q.weather < 0.05 || this.weatherType === "clear" || this.weatherIntensity < 0.02) {
      this.weather.visible = false;
      return;
    }
    this.weather.visible = true;
    const budget = q.weather;
    this.weatherMat.opacity =
      this.weatherType === "mist"
        ? 0.08 * this.weatherIntensity * budget
        : 0.45 * this.weatherIntensity * budget;
    const pos = this.weather.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const count = Math.floor((arr.length / 3) * budget);
    for (let i = 0; i < arr.length / 3; i++) {
      if (i >= count) {
        arr[i * 3 + 1] = -10;
        continue;
      }
      const speed = this.weatherVel[i] ?? 5;
      if (this.weatherType === "rain") {
        arr[i * 3 + 1]! -= speed * 1.6 * dt;
        arr[i * 3]! -= 1.2 * dt;
      } else if (this.weatherType === "snow") {
        arr[i * 3 + 1]! -= speed * 0.35 * dt;
        arr[i * 3]! += Math.sin(this.clock.elapsed * 1.4 + i) * 0.4 * dt;
      } else {
        arr[i * 3 + 1]! += (0.1 + (i % 5) * 0.02) * dt;
        arr[i * 3]! += Math.sin(this.clock.elapsed * 0.3 + i) * 0.2 * dt;
      }
      if (arr[i * 3 + 1]! < 0 || arr[i * 3 + 1]! > 12) {
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 1] = this.weatherType === "mist" ? Math.random() * 3 : 8 + Math.random() * 4;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
    }
    pos.needsUpdate = true;
  }

  private scheduleWeatherRoll(dt: number): void {
    if (this.weatherType === "clear") return;
    this.weatherRollIn -= dt;
    if (this.weatherRollIn > 0 || this.rolling) return;
    this.rolling = true;
    this.weatherRollIn = WEATHER_ROLL_SECONDS * (0.7 + Math.random() * 0.6);
    // Async so the roll never stalls the frame that tripped the timer.
    queueMicrotask(() => {
      // Intensity can ebb/clear/return; type stays locked for the level.
      if (Math.random() < 0.35) this.weatherTarget = 0;
      else this.weatherTarget = 0.25 + Math.random() * 0.55;
      this.rolling = false;
    });
  }

  /** Debug / docs helpers. */
  getWeather(): { type: WeatherType; intensity: number; level: number } {
    return { type: this.weatherType, intensity: this.weatherIntensity, level: this.lockedLevel };
  }

  getPhase(): number {
    return (this.clock.elapsed / DAY_SECONDS) % 1;
  }
}
