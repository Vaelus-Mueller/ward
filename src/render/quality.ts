/**
 * Adaptive graphics budget aimed at high-end phones (Galaxy S24 class)
 * while keeping headroom under load. Starts sharp, dials down if frames stall.
 */

export type QualityLevel = "high" | "balanced" | "low";

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
}

const PRESETS: Record<QualityLevel, Omit<QualitySettings, "level">> = {
  high: { dpr: 1.85, shadows: true, shadowMap: 1024, fxScale: 1, antialias: true, maxBursts: 18 },
  balanced: { dpr: 1.5, shadows: true, shadowMap: 768, fxScale: 0.7, antialias: true, maxBursts: 12 },
  low: { dpr: 1.15, shadows: false, shadowMap: 512, fxScale: 0.4, antialias: false, maxBursts: 8 },
};

function isMobileShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints ?? 0) > 1;
}

function startLevel(): QualityLevel {
  // Galaxy S24 and peers can hold "high"; start balanced on smaller/unknown phones.
  if (!isMobileShell()) return "high";
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const cores = navigator.hardwareConcurrency || 4;
  if (dpr >= 2.5 && cores >= 8) return "high";
  if (dpr >= 2 || cores >= 6) return "balanced";
  return "low";
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
    if (this.frameMs > 22 && this.level === "high") next = "balanced";
    else if (this.frameMs > 28 && this.level === "balanced") next = "low";
    else if (this.frameMs < 15 && this.level === "low") next = "balanced";
    else if (this.frameMs < 14 && this.level === "balanced") next = "high";

    if (next === this.level) return false;
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
