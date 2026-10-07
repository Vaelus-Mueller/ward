import { Capacitor } from "@capacitor/core";

export type VoiceLine = "eliteAggro" | "uniqueFind" | "maxCritDealt" | "maxCritTaken";

const LINES: Record<VoiceLine, string[]> = {
  eliteAggro: ["Elite!", "They found us!", "Big one!", "Watch out!"],
  uniqueFind: ["A unique!", "Legendary find!", "Gold drop!", "Rare prize!"],
  maxCritDealt: ["Max crit!", "Perfect strike!", "Crushed them!", "Full power!"],
  maxCritTaken: ["That hurt!", "Heavy hit!", "I'm hit hard!", "Crushing blow!"],
};

/** Minimum spacing between identical combat cues (ms). Stops Android WebView underruns. */
const HIT_GAP_MS = 48;
const HURT_GAP_MS = 90;
const SFX_VOICE_CAP = 10;

/**
 * Procedural SFX + a dark pipe-organ title bed (SotN-adjacent mood, original voicing).
 * No recorded Castlevania assets — additive organ + cathedral impulse, offline-safe.
 * Android WebView TTS is skipped (often garbled).
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
  private outBus: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxBus: GainNode | null = null;
  private organBus: GainNode | null = null;
  private pipeWave: PeriodicWave | null = null;
  private chordIndex = 0;
  private nativeShell = Capacitor.isNativePlatform();
  private lastHitAt = 0;
  private lastHurtAt = 0;
  private liveSfx = 0;
  private unlocking: Promise<void> | null = null;

  toggle(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // WebView TTS stubs can throw.
      }
      this.setThemeGain(0);
    } else if (this.themeOn) {
      void this.unlock().then(() => {
        if (this.themeNodes.length === 0) this.buildTheme();
        else this.setThemeGain(1);
      });
    }
    return this.muted;
  }

  /** Unlock audio (call from a user gesture) and start the organ title bed. */
  startOminous(): void {
    this.themeOn = true;
    if (this.muted) return;
    void this.unlock().then(() => this.buildTheme());
  }

  /** Wake a suspended AudioContext after backgrounding without forcing title music. */
  resume(): void {
    if (this.muted) return;
    void this.unlock().then(() => {
      if (this.themeOn && this.themeNodes.length === 0) this.buildTheme();
    });
  }

  private buildTheme(): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || this.themeNodes.length > 0 || ctx.state !== "running") return;
    this.ensureGraph(ctx);

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(this.outBus!);
    this.master = master;
    master.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 1.6);

    // Cathedral space — keep wet modest so the sum doesn't clip phone DACs.
    const wet = ctx.createGain();
    const dry = ctx.createGain();
    wet.gain.value = 0.28;
    dry.gain.value = 0.62;
    const convolver = ctx.createConvolver();
    convolver.buffer = this.cathedralImpulse(ctx);
    const organ = ctx.createGain();
    organ.gain.value = 1;
    this.organBus = organ;
    organ.connect(dry);
    organ.connect(convolver);
    convolver.connect(wet);
    dry.connect(master);
    wet.connect(master);
    this.themeNodes.push(organ, dry, wet, convolver, master);

    // Deep pedal — D minor tonic / dominant under the chorale.
    this.pipePedal(ctx, organ, 36.71, 0.045); // D1
    this.pipePedal(ctx, organ, 55.0, 0.03); // A1
    this.pipePedal(ctx, organ, 73.42, 0.02); // D2

    this.chordIndex = 0;
    this.scheduleChorale(ctx, organ);
  }

  stopOminous(fadeMs = 1800): void {
    this.themeOn = false;
    if (this.themeTimer !== null) {
      window.clearTimeout(this.themeTimer);
      this.themeTimer = null;
    }
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) {
      this.clearTheme();
      return;
    }
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
    master.gain.linearRampToValueAtTime(0.0001, now + fadeMs / 1000);
    window.setTimeout(() => this.clearTheme(), fadeMs + 80);
  }

  private setThemeGain(level: number): void {
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.linearRampToValueAtTime(Math.max(0.0001, level * 0.42), now + 0.35);
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
    this.master = null;
    this.organBus = null;
  }

  /** Slow D-minor gothic chorale — original progression, organ timbre. */
  private scheduleChorale(ctx: AudioContext, dest: AudioNode): void {
    if (!this.themeOn || this.muted || ctx.state !== "running") return;
    // Dm · Bb · Am · Gm · Dm/A · C · A · Dm — solemn, castlevania-adjacent mood.
    const chords: number[][] = [
      [146.83, 174.61, 220.0], // D3 F3 A3
      [116.54, 174.61, 233.08], // Bb2 F3 Bb3
      [130.81, 164.81, 220.0], // A2 E3 A3
      [123.47, 146.83, 196.0], // G2 D3 G3
      [110.0, 146.83, 220.0], // A2 D3 A3
      [130.81, 164.81, 196.0], // C3 E3 G3
      [110.0, 164.81, 220.0], // A2 E3 A3
      [146.83, 174.61, 220.0], // D3 F3 A3
    ];
    const chord = chords[this.chordIndex % chords.length]!;
    this.chordIndex += 1;
    const now = ctx.currentTime;
    const hold = 3.4;
    for (const freq of chord) {
      this.pipeVoice(ctx, dest, freq, now, hold, 0.02);
      // Soft octave mixture — one partial, quieter, avoids polyphony crackle.
      this.pipeVoice(ctx, dest, freq * 2, now + 0.05, hold - 0.15, 0.006);
    }
    // Schedule slightly before the previous chord ends so the gap never goes silent,
    // but leave enough room that we do not stack three full chords.
    this.themeTimer = window.setTimeout(() => this.scheduleChorale(ctx, dest), hold * 1000 - 420);
  }

  private pipePedal(ctx: AudioContext, dest: AudioNode, freq: number, gainValue: number): void {
    const voice = this.makePipe(ctx, freq);
    voice.gain.gain.value = 0.0001;
    const now = ctx.currentTime;
    voice.gain.gain.linearRampToValueAtTime(gainValue, now + 0.8);
    voice.out.connect(dest);
    voice.osc.start(now);
    this.themeNodes.push(voice.osc, voice.filter, voice.gain, voice.out);
  }

  private pipeVoice(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    when: number,
    duration: number,
    peak: number,
  ): void {
    const voice = this.makePipe(ctx, freq);
    const g = voice.gain.gain;
    g.setValueAtTime(0.0001, when);
    g.linearRampToValueAtTime(peak, when + 0.45);
    g.linearRampToValueAtTime(peak * 0.88, when + duration - 0.9);
    g.linearRampToValueAtTime(0.0001, when + duration);
    voice.out.connect(dest);
    voice.osc.start(when);
    voice.osc.stop(when + duration + 0.02);
    voice.osc.onended = () => {
      try {
        voice.osc.disconnect();
        voice.filter.disconnect();
        voice.gain.disconnect();
        voice.out.disconnect();
      } catch {
        // Already gone.
      }
    };
  }

  /** Additive-ish organ: sine fundamental + odd harmonics through a gentle lowpass. */
  private makePipe(
    ctx: AudioContext,
    freq: number,
  ): { osc: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; out: GainNode } {
    if (!this.pipeWave) {
      const real = new Float32Array([0, 1, 0.42, 0.24, 0.1, 0.06, 0.03, 0.018]);
      const imag = new Float32Array(real.length);
      this.pipeWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    }
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.pipeWave);
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = Math.min(2400, freq * 6.5);
    filter.Q.value = 0.35;
    const gain = ctx.createGain();
    const out = ctx.createGain();
    out.gain.value = 1;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    return { osc, filter, gain, out };
  }

  private cathedralImpulse(ctx: AudioContext): AudioBuffer {
    const seconds = 1.8;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      const delay = Math.floor(rate * (0.018 + ch * 0.007));
      for (let i = 0; i < length; i++) {
        const t = i / rate;
        // Smooth exponential tail — no hard reflection spikes (those click on mobile).
        const decay = Math.exp(-t * 2.6) * (1 - i / length);
        let sample = (Math.random() * 2 - 1) * 0.14 * decay;
        if (i > delay) {
          sample += data[i - delay]! * 0.35;
        }
        data[i] = sample;
      }
      // Gentle DC / click soften at the head.
      const fade = Math.min(256, length);
      for (let i = 0; i < fade; i++) data[i]! *= i / fade;
    }
    return buffer;
  }

  private ensureGraph(ctx: AudioContext): void {
    if (this.outBus && this.sfxBus && this.compressor) return;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.18;

    const outBus = ctx.createGain();
    outBus.gain.value = 0.9;
    outBus.connect(compressor);
    compressor.connect(ctx.destination);

    const sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(outBus);

    this.compressor = compressor;
    this.outBus = outBus;
    this.sfxBus = sfxBus;
  }

  private context(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      try {
        this.ctx = new Ctx({ latencyHint: "interactive" });
      } catch {
        this.ctx = new Ctx();
      }
      this.ensureGraph(this.ctx);
    }
    return this.ctx;
  }

  /** Resume a suspended context (required after app background / before first gesture). */
  private unlock(): Promise<void> {
    if (this.muted) return Promise.resolve();
    const ctx = this.context();
    if (!ctx) return Promise.resolve();
    if (ctx.state === "running") return Promise.resolve();
    if (this.unlocking) return this.unlocking;
    this.unlocking = ctx
      .resume()
      .catch(() => undefined)
      .then(() => {
        this.unlocking = null;
      });
    return this.unlocking;
  }

  hit(): void {
    const now = performance.now();
    if (now - this.lastHitAt < HIT_GAP_MS) return;
    this.lastHitAt = now;
    this.blip(420, 0.04, "triangle", 0.032);
  }

  hurt(): void {
    const now = performance.now();
    if (now - this.lastHurtAt < HURT_GAP_MS) return;
    this.lastHurtAt = now;
    this.blip(110, 0.08, "sine", 0.038);
  }

  level(): void {
    this.blip(392, 0.08, "sine", 0.03);
    window.setTimeout(() => this.blip(523, 0.1, "triangle", 0.026), 90);
  }

  eliteAggro(): void {
    this.blip(140, 0.11, "triangle", 0.038);
    window.setTimeout(() => this.blip(90, 0.15, "sine", 0.03), 70);
    this.speak("eliteAggro", 0.95, 0.7);
  }

  uniqueFind(): void {
    this.blip(440, 0.07, "sine", 0.03);
    window.setTimeout(() => this.blip(554, 0.08, "triangle", 0.026), 80);
    window.setTimeout(() => this.blip(659, 0.11, "sine", 0.022), 160);
    this.speak("uniqueFind", 1.05, 0.85);
  }

  maxCritDealt(): void {
    this.blip(620, 0.05, "triangle", 0.03);
    window.setTimeout(() => this.blip(880, 0.08, "sine", 0.022), 50);
    this.speak("maxCritDealt", 1.15, 1);
  }

  maxCritTaken(): void {
    this.blip(85, 0.1, "sine", 0.038);
    window.setTimeout(() => this.blip(60, 0.13, "triangle", 0.03), 60);
    this.speak("maxCritTaken", 0.9, 0.55);
  }

  private speak(line: VoiceLine, rate: number, pitch: number): void {
    if (this.muted || this.nativeShell) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const now = performance.now();
    if (now - this.lastVoice < this.voiceGapMs) return;
    this.lastVoice = now;
    const options = LINES[line];
    const index = this.lineCursor[line] % options.length;
    this.lineCursor[line] = index + 1;
    const text = options[index]!;
    try {
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = 0.85;
      const voices = synth.getVoices();
      const english =
        voices.find((voice) => /en(-|_|$)/i.test(voice.lang) && /male|daniel|david|fred|alex/i.test(voice.name)) ??
        voices.find((voice) => /en(-|_|$)/i.test(voice.lang));
      if (english) utter.voice = english;
      synth.speak(utter);
    } catch {
      // Some WebViews expose speechSynthesis but reject speak().
    }
  }

  /** Soft filtered blip — avoids harsh square/saw that crackles on phone speakers. */
  private blip(freq: number, duration: number, type: OscillatorType, gainValue: number): void {
    if (this.muted) return;
    void this.unlock().then(() => this.playBlip(freq, duration, type, gainValue));
  }

  private playBlip(freq: number, duration: number, type: OscillatorType, gainValue: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.sfxBus) return;
    // Drop rather than queue when the WebView audio thread is already busy.
    if (this.liveSfx >= SFX_VOICE_CAP) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.72), now + duration);
    filter.type = "lowpass";
    filter.frequency.value = Math.min(1800, freq * 2.8);
    filter.Q.value = 0.45;

    // Short linear attack / release — exponential ramps from ~0 often click on mobile.
    const peak = gainValue;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.012);
    gain.gain.linearRampToValueAtTime(peak * 0.55, now + duration * 0.45);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    this.liveSfx += 1;
    osc.onended = () => {
      this.liveSfx = Math.max(0, this.liveSfx - 1);
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // Already torn down.
      }
    };
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }
}
