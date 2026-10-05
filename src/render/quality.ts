/**
 * Graphics quality ladder. Ultra is the default target when install size
 * and GPU budget are uncapped; AdaptiveQuality may still step down if frames stall.
 */

export type QualityLevel = "ultra" | "high" | "balanced" | "low";

export interface QualitySettings {
  level: QualityLevel;
  /** Device pixel ratio cap. */
  dpr: number;
  shadows: boolean;
  shadowMap: number;
  /** 0–1 multiplier for burst / FX mesh counts. */
  fxScale: number;
  antialias: boolean;
  /** Max simultaneous burst groups before culling oldest. */
  maxBursts: number;
  /** Soft volumetric shafts + mist density scale (0 = off). */
  atmosphere: number;
  /** Weather particle budget multiplier. */
  weather: number;
}

const PRESETS: Record<QualityLevel, Omit<QualitySettings, "level">> = {
  ultra: { dpr: 2.5, shadows: true, shadowMap: 4096, fxScale: 1.4, antialias: true, maxBursts: 36, atmosphere: 1.25, weather: 1.25 },
  high: { dpr: 2.0, shadows: true, shadowMap: 2048, fxScale: 1.1, antialias: true, maxBursts: 22, atmosphere: 1.05, weather: 1.05 },
  balanced: { dpr: 1.6, shadows: true, shadowMap: 1024, fxScale: 0.75, antialias: true, maxBursts: 14, atmosphere: 0.6, weather: 0.6 },
  low: { dpr: 1.2, shadows: false, shadowMap: 512, fxScale: 0.45, antialias: false, maxBursts: 8, atmosphere: 0, weather: 0 },
};

const ORDER: QualityLevel[] = ["ultra", "high", "balanced", "low"];

function isMobileShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints ?? 0) > 1;
}

function startLevel(): QualityLevel {
  // Size uncapped — prefer ultra on capable devices, high on phones.
  if (!isMobileShell()) return "ultra";
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const cores = navigator.hardwareConcurrency || 4;
  if (dpr >= 2.5 && cores >= 8) return "ultra";
  if (dpr >= 2 || cores >= 6) return "high";
  return "balanced";
}

function stepDown(level: QualityLevel): QualityLevel {
  const i = ORDER.indexOf(level);
  return ORDER[Math.min(ORDER.length - 1, i + 1)] ?? "low";
}

function stepUp(level: QualityLevel): QualityLevel {
  const i = ORDER.indexOf(level);
  return ORDER[Math.max(0, i - 1)] ?? "ultra";
}

export class AdaptiveQuality {
  private level: QualityLevel = startLevel();
  private frameMs = 16.7;
  private cool = 0;
  private dirty = true;
  private applied: QualitySettings;

  constructor() {
    this.applied = this.snapshot();
  }

  snapshot(): QualitySettings {
    return { level: this.level, ...PRESETS[this.level] };
  }

  current(): QualitySettings {
    return this.applied;
  }

  /** Feed measured frame delta (seconds). Returns true when settings changed. */
  sample(dt: number): boolean {
    const ms = Math.min(50, dt * 1000);
    this.frameMs = this.frameMs * 0.9 + ms * 0.1;
    this.cool = Math.max(0, this.cool - dt);
    if (this.cool > 0) return false;

    let next = this.level;
    if (this.frameMs > 22) next = stepDown(this.level);
    else if (this.frameMs < 14 && this.level !== "ultra") next = stepUp(this.level);

    // Don't slam from ultra → low in one hit: only one step per cool window.
    if (next === this.level) return false;
    const from = ORDER.indexOf(this.level);
    const to = ORDER.indexOf(next);
    if (Math.abs(to - from) > 1) next = to > from ? stepDown(this.level) : stepUp(this.level);

    this.level = next;
    this.cool = 2.5;
    this.applied = this.snapshot();
    this.dirty = true;
    return true;
  }

  consumeDirty(): boolean {
    if (!this.dirty) return false;
    this.dirty = false;
    return true;
  }
}
