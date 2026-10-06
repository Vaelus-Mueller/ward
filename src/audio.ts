export type VoiceLine = "eliteAggro" | "uniqueFind" | "maxCritDealt" | "maxCritTaken";

const LINES: Record<VoiceLine, string[]> = {
  eliteAggro: ["Elite!", "They found us!", "Big one!", "Watch out!"],
  uniqueFind: ["A unique!", "Legendary find!", "Gold drop!", "Rare prize!"],
  maxCritDealt: ["Max crit!", "Perfect strike!", "Crushed them!", "Full power!"],
  maxCritTaken: ["That hurt!", "Heavy hit!", "I'm hit hard!", "Crushing blow!"],
};

/** Max concurrent one-shot voices — prevents stacking clicks under dense combat. */
const MAX_SFX_VOICES = 8;
/** Soft ceiling under the compressor so layered hits never hard-clip. */
const MASTER_CEILING = 0.85;
const MUSIC_GAIN = 0.55;
const SFX_GAIN = 0.72;

type ActiveVoice = {
  stopAt: number;
  nodes: AudioNode[];
};

/**
 * Tiny voice cues via Web Speech, with tonal stingers underneath.
 * Procedural title drone for the splash — no recorded assets.
 * Keeps the APK light and works offline in WebView.
 *
 * Quality path: native sample rate, larger playback buffers on mobile,
 * shared master + compressor, soft envelopes, filtered harmonics,
 * and capped overlapping one-shots to avoid crackle/clipping.
 */
export class AudioBus {
  muted = false;
  private ctx: AudioContext | null = null;
  private lastVoice = 0;
  private voiceGapMs = 1400;
  private lineCursor: Record<VoiceLine, number> = {
    eliteAggro: 0,
    uniqueFind: 0,
    maxCritDealt: 0,
    maxCritTaken: 0,
  };
  private themeNodes: AudioNode[] = [];
  private themeTimer: number | null = null;
  private themeOn = false;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private activeVoices: ActiveVoice[] = [];
  private lastHitAt = 0;

  toggle(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      window.speechSynthesis?.cancel();
      this.setThemeGain(0);
      this.setBusGain(this.sfxBus, 0.0001, 0.12);
    } else {
      this.setBusGain(this.sfxBus, SFX_GAIN, 0.12);
      if (this.themeOn) {
        if (this.themeNodes.length === 0) this.buildTheme();
        else this.setThemeGain(MUSIC_GAIN);
      }
    }
    return this.muted;
  }

  /** Unlock audio (call from a user gesture) and start the splash / title drone. */
  startOminous(): void {
    this.themeOn = true;
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    this.ensureGraph();
    this.buildTheme();
  }

  private ensureGraph(): void {
    const ctx = this.ctx;
    if (!ctx || this.master) return;

    const master = ctx.createGain();
    master.gain.value = MASTER_CEILING;

    // Soft knee compressor acts as a gentle limiter — gothic bed stays dark, not loud.
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;

    const music = ctx.createGain();
    music.gain.value = this.muted ? 0.0001 : MUSIC_GAIN;
    const sfx = ctx.createGain();
    sfx.gain.value = this.muted ? 0.0001 : SFX_GAIN;

    music.connect(master);
    sfx.connect(master);
    master.connect(compressor);
    compressor.connect(ctx.destination);

    this.master = master;
    this.musicBus = music;
    this.sfxBus = sfx;
    this.compressor = compressor;
  }

  private buildTheme(): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || this.themeNodes.length > 0) return;
    this.ensureGraph();
    const dest = this.musicBus;
    if (!dest) return;

    // Fade music bus in from silence (avoids theme pop on unlock).
    const now = ctx.currentTime;
    dest.gain.cancelScheduledValues(now);
    dest.gain.setValueAtTime(0.0001, now);
    dest.gain.exponentialRampToValueAtTime(MUSIC_GAIN, now + 2.4);

    // Low pedal — hollow fifth under a minor second; sine/triangle only (no saw hiss).
    this.drone(ctx, dest, 55, "sine", 0.038);
    this.drone(ctx, dest, 82.5, "triangle", 0.022);
    this.drone(ctx, dest, 110, "sine", 0.014);
    this.drone(ctx, dest, 164.8, "triangle", 0.006);

    const noise = this.noiseBed(ctx, dest, 0.01);
    if (noise) this.themeNodes.push(noise);

    this.scheduleBell(ctx, dest);
  }

  stopOminous(fadeMs = 1800): void {
    this.themeOn = false;
    if (this.themeTimer !== null) {
      window.clearTimeout(this.themeTimer);
      this.themeTimer = null;
    }
    const ctx = this.ctx;
    const music = this.musicBus;
    if (!ctx || !music) {
      this.clearTheme();
      return;
    }
    const now = ctx.currentTime;
    music.gain.cancelScheduledValues(now);
    music.gain.setValueAtTime(Math.max(0.0001, music.gain.value), now);
    music.gain.exponentialRampToValueAtTime(0.0001, now + fadeMs / 1000);
    window.setTimeout(() => this.clearTheme(), fadeMs + 80);
  }

  private setThemeGain(level: number): void {
    this.setBusGain(this.musicBus, level, 0.35);
  }

  private setBusGain(bus: GainNode | null, level: number, seconds: number): void {
    if (!bus || !this.ctx) return;
    const now = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), now + seconds);
  }

  private clearTheme(): void {
    for (const node of this.themeNodes) {
      try {
        if ("stop" in node && typeof (node as OscillatorNode).stop === "function") {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Already stopped.
      }
    }
    this.themeNodes = [];
  }

  private drone(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    type: OscillatorType,
    gainValue: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = 240;
    filter.Q.value = 0.55;
    gain.gain.value = gainValue;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.07 + freq / 4000;
    lfoGain.gain.value = 28;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start();
    lfo.start();
    this.themeNodes.push(osc, lfo, filter, gain, lfoGain);
  }

  private noiseBed(ctx: AudioContext, dest: AudioNode, gainValue: number): AudioNode | null {
    const seconds = 4;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Approximate pink noise (Voss-McCartney-ish) — softer than white for mobile DACs.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.032498;
      b2 = 0.57 * b2 + white * 0.016982;
      data[i] = (b0 + b1 + b2 + white * 0.01) * 0.18;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 85;
    filter.Q.value = 0.55;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start();
    this.themeNodes.push(src, filter, gain);
    return src;
  }

  private scheduleBell(ctx: AudioContext, dest: AudioNode): void {
    if (!this.themeOn || this.muted) return;
    const notes = [110, 116.5, 82.4, 98, 73.4, 103.8];
    const freq = notes[Math.floor(Math.random() * notes.length)]!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.4;
    const now = ctx.currentTime;
    // Soft attack — no triangle click on distant bells.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.022, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 4);
    osc.onended = () => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        /* noop */
      }
    };
    const wait = 4200 + Math.random() * 3800;
    this.themeTimer = window.setTimeout(() => this.scheduleBell(ctx, dest), wait);
  }

  private context(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      // Prefer native device rate (usually 48 kHz). Larger "playback" buffers
      // reduce underrun crackle on Capacitor WebViews under GPU load.
      try {
        this.ctx = new Ctx({ latencyHint: "playback" });
      } catch {
        this.ctx = new Ctx();
      }
      this.ensureGraph();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  hit(): void {
    // Light rate-limit: combat can fire many hits/frame; keep body blows readable.
    const now = performance.now();
    if (now - this.lastHitAt < 45) return;
    this.lastHitAt = now;
    this.tone({
      freq: 185,
      duration: 0.07,
      type: "triangle",
      gainValue: 0.045,
      attack: 0.004,
      filterHz: 900,
      slideTo: 140,
    });
  }

  hurt(): void {
    this.tone({
      freq: 96,
      duration: 0.12,
      type: "triangle",
      gainValue: 0.05,
      attack: 0.006,
      filterHz: 520,
      slideTo: 62,
    });
  }

  level(): void {
    this.tone({ freq: 392, duration: 0.11, type: "sine", gainValue: 0.04, attack: 0.008, filterHz: 1800 });
    window.setTimeout(
      () => this.tone({ freq: 523, duration: 0.14, type: "triangle", gainValue: 0.038, attack: 0.01, filterHz: 2000 }),
      90,
    );
  }

  eliteAggro(): void {
    this.tone({
      freq: 108,
      duration: 0.16,
      type: "triangle",
      gainValue: 0.048,
      attack: 0.01,
      filterHz: 480,
      slideTo: 78,
    });
    window.setTimeout(
      () =>
        this.tone({
          freq: 64,
          duration: 0.2,
          type: "sine",
          gainValue: 0.04,
          attack: 0.012,
          filterHz: 360,
        }),
      70,
    );
    this.speak("eliteAggro", 0.95, 0.7);
  }

  uniqueFind(): void {
    this.tone({ freq: 440, duration: 0.1, type: "sine", gainValue: 0.038, attack: 0.01, filterHz: 2200 });
    window.setTimeout(
      () => this.tone({ freq: 554, duration: 0.11, type: "triangle", gainValue: 0.034, attack: 0.01, filterHz: 2400 }),
      80,
    );
    window.setTimeout(
      () => this.tone({ freq: 659, duration: 0.16, type: "sine", gainValue: 0.03, attack: 0.012, filterHz: 2600 }),
      160,
    );
    this.speak("uniqueFind", 1.05, 0.85);
  }

  maxCritDealt(): void {
    this.tone({
      freq: 520,
      duration: 0.08,
      type: "triangle",
      gainValue: 0.042,
      attack: 0.005,
      filterHz: 1600,
      slideTo: 680,
    });
    window.setTimeout(
      () => this.tone({ freq: 880, duration: 0.11, type: "sine", gainValue: 0.032, attack: 0.008, filterHz: 2800 }),
      50,
    );
    this.speak("maxCritDealt", 1.15, 1);
  }

  maxCritTaken(): void {
    this.tone({
      freq: 72,
      duration: 0.14,
      type: "triangle",
      gainValue: 0.05,
      attack: 0.008,
      filterHz: 420,
      slideTo: 48,
    });
    window.setTimeout(
      () => this.tone({ freq: 48, duration: 0.18, type: "sine", gainValue: 0.038, attack: 0.01, filterHz: 280 }),
      60,
    );
    this.speak("maxCritTaken", 0.9, 0.55);
  }

  private speak(line: VoiceLine, rate: number, pitch: number): void {
    if (this.muted) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const now = performance.now();
    if (now - this.lastVoice < this.voiceGapMs) return;
    this.lastVoice = now;
    const options = LINES[line];
    const index = this.lineCursor[line] % options.length;
    this.lineCursor[line] = index + 1;
    const text = options[index]!;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = 0.75;
    const voices = synth.getVoices();
    const english =
      voices.find((voice) => /en(-|_|$)/i.test(voice.lang) && /male|daniel|david|fred|alex/i.test(voice.name)) ??
      voices.find((voice) => /en(-|_|$)/i.test(voice.lang));
    if (english) utter.voice = english;
    synth.speak(utter);
  }

  private pruneVoices(now: number): void {
    this.activeVoices = this.activeVoices.filter((voice) => {
      if (voice.stopAt > now) return true;
      for (const node of voice.nodes) {
        try {
          node.disconnect();
        } catch {
          /* noop */
        }
      }
      return false;
    });
  }

  private stealOldestVoice(): void {
    const oldest = this.activeVoices.shift();
    if (!oldest) return;
    for (const node of oldest.nodes) {
      try {
        if ("stop" in node && typeof (node as OscillatorNode).stop === "function") {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        /* noop */
      }
    }
  }

  private tone(opts: {
    freq: number;
    duration: number;
    type: OscillatorType;
    gainValue: number;
    attack?: number;
    filterHz?: number;
    slideTo?: number;
  }): void {
    const ctx = this.context();
    if (!ctx) return;
    this.ensureGraph();
    const dest = this.sfxBus;
    if (!dest) return;

    const now = ctx.currentTime;
    this.pruneVoices(now);
    while (this.activeVoices.length >= MAX_SFX_VOICES) this.stealOldestVoice();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const attack = Math.max(0.003, opts.attack ?? 0.006);
    const duration = Math.max(attack + 0.02, opts.duration);
    const peak = opts.gainValue;
    const cutoff = opts.filterHz ?? 1200;

    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, now);
    if (opts.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), now + duration);
    }

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.45), now + duration);
    filter.Q.value = 0.5;

    // Soft attack → exponential release: removes the hard-edge click that read as crackle.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + duration + 0.02);

    const nodes: AudioNode[] = [osc, filter, gain];
    this.activeVoices.push({ stopAt: now + duration + 0.05, nodes });
    osc.onended = () => {
      for (const node of nodes) {
        try {
          node.disconnect();
        } catch {
          /* noop */
        }
      }
      this.activeVoices = this.activeVoices.filter((v) => v.nodes !== nodes);
    };
  }
}
