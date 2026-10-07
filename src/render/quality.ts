/**
 * Graphics quality ladder. Ultra is the default target when install size
 * and GPU budget are uncapped; AdaptiveQuality may still step down if frames stall.
 *
 * Capacitor / phone GPUs cannot hold the 8k PBR set — keep them on a medium
 * texture tier and a lower starting quality so WebGL does not OOM at boot.
 */

import { Capacitor } from "@capacitor/core";

export type QualityLevel = "ultra" | "high" | "balanced" | "low";
/** full = 8k preferred; medium = 4k only; low = 4k albedo/rough only. */
export type TextureTier = "full" | "medium" | "low";

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

/** True on Capacitor shells and phone browsers — tight GPU / VRAM budget. */
export function isConstrainedGpu(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Capacitor may be unavailable in some test hosts.
  }
  return /Android|iPhone|iPad/i.test(navigator.userAgent);
}

export function textureTier(): TextureTier {
  // Oniro-class mobile ARPG detail: authored 1k PBR (diff/rough/normal/AO), not 4k/8k.
  if (!isConstrainedGpu()) return "full";
  return "medium";
}

/** Safety cap if a larger source slips through; phones ship 1k packages. */
export function maxTextureEdge(): number {
  return isConstrainedGpu() ? 1024 : 8192;
}

function startLevel(): QualityLevel {
  if (isConstrainedGpu()) {
    const cores = navigator.hardwareConcurrency || 4;
    return cores >= 8 ? "balanced" : "low";
  }
  if (typeof navigator === "undefined") return "ultra";
  const mobile = /Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints ?? 0) > 1;
  if (!mobile) return "ultra";
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const cores = navigator.hardwareConcurrency || 4;
  if (dpr >= 2.5 && cores >= 8) return "high";
  if (dpr >= 2 || cores >= 6) return "balanced";
  return "low";
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
