import { Capacitor } from "@capacitor/core";

export type VoiceLine = "eliteAggro" | "uniqueFind" | "maxCritDealt" | "maxCritTaken";

const LINES: Record<VoiceLine, string[]> = {
  eliteAggro: ["Elite!", "They found us!", "Big one!", "Watch out!"],
  uniqueFind: ["A unique!", "Legendary find!", "Gold drop!", "Rare prize!"],
  maxCritDealt: ["Max crit!", "Perfect strike!", "Crushed them!", "Full power!"],
  maxCritTaken: ["That hurt!", "Heavy hit!", "I'm hit hard!", "Crushing blow!"],
};

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
  private sfxBus: GainNode | null = null;
  private organBus: GainNode | null = null;
  private chordIndex = 0;
  private nativeShell = Capacitor.isNativePlatform();

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
      if (this.themeNodes.length === 0) this.buildTheme();
      else this.setThemeGain(1);
    }
    return this.muted;
  }

  /** Unlock audio (call from a user gesture) and start the organ title bed. */
  startOminous(): void {
    this.themeOn = true;
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    void ctx.resume().then(() => this.buildTheme());
  }

  private buildTheme(): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || this.themeNodes.length > 0) return;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    this.master = master;
    master.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 1.8);

    // Cathedral space via a short synthetic impulse.
    const wet = ctx.createGain();
    const dry = ctx.createGain();
    wet.gain.value = 0.55;
    dry.gain.value = 0.7;
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
    this.themeNodes.push(organ, dry, wet, convolver);

    // Deep pedal — D minor tonic / dominant under the chorale.
    this.pipePedal(ctx, organ, 36.71, 0.07); // D1
    this.pipePedal(ctx, organ, 55.0, 0.045); // A1
    this.pipePedal(ctx, organ, 73.42, 0.03); // D2

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
    master.gain.exponentialRampToValueAtTime(0.0001, now + fadeMs / 1000);
    window.setTimeout(() => this.clearTheme(), fadeMs + 80);
  }

  private setThemeGain(level: number): void {
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0001, level * 0.7), now + 0.4);
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
    this.master?.disconnect();
    this.master = null;
    this.organBus = null;
  }

  /** Slow D-minor gothic chorale — original progression, organ timbre. */
  private scheduleChorale(ctx: AudioContext, dest: AudioNode): void {
    if (!this.themeOn || this.muted) return;
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
    const hold = 3.6;
    for (const freq of chord) {
      this.pipeVoice(ctx, dest, freq, now, hold, 0.028);
      // Soft quint mixture above for pipe glitter.
      this.pipeVoice(ctx, dest, freq * 2, now + 0.04, hold - 0.1, 0.01);
    }
    this.themeTimer = window.setTimeout(() => this.scheduleChorale(ctx, dest), hold * 1000 - 180);
  }

  private pipePedal(ctx: AudioContext, dest: AudioNode, freq: number, gainValue: number): void {
    const voice = this.makePipe(ctx, freq, gainValue * 0.85);
    voice.gain.gain.value = gainValue;
    voice.out.connect(dest);
    voice.osc.start();
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
    const voice = this.makePipe(ctx, freq, peak);
    const g = voice.gain.gain;
    g.setValueAtTime(0.0001, when);
    g.exponentialRampToValueAtTime(peak, when + 0.35);
    g.setValueAtTime(peak * 0.92, when + duration - 0.8);
    g.exponentialRampToValueAtTime(0.0001, when + duration);
    voice.out.connect(dest);
    voice.osc.start(when);
    voice.osc.stop(when + duration + 0.05);
    // Don't keep stopped oscillators in themeNodes forever — schedule disconnect.
    window.setTimeout(() => {
      try {
        voice.osc.disconnect();
        voice.filter.disconnect();
        voice.gain.disconnect();
        voice.out.disconnect();
      } catch {
        // Already gone.
      }
    }, (duration + 0.2) * 1000);
  }

  /** Additive-ish organ: sine fundamental + odd harmonics through a gentle lowpass. */
  private makePipe(
    ctx: AudioContext,
    freq: number,
    _peak: number,
  ): { osc: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; out: GainNode } {
    // Use a custom periodic wave approximating wooden/flue pipe harmonics.
    const real = new Float32Array([0, 1, 0.45, 0.28, 0.12, 0.08, 0.04, 0.025]);
    const imag = new Float32Array(real.length);
    const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = Math.min(3200, freq * 8);
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    const out = ctx.createGain();
    out.gain.value = 1;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    return { osc, filter, gain, out };
  }

  private cathedralImpulse(ctx: AudioContext): AudioBuffer {
    const seconds = 2.4;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / rate;
        const decay = Math.exp(-t * 2.1) * (1 - i / length);
        // Sparse early reflections + noise tail.
        const tick = i % Math.floor(rate * (0.029 + ch * 0.004)) === 0 ? 0.35 : 0;
        data[i] = (Math.random() * 2 - 1) * 0.22 * decay + tick * decay;
      }
    }
    return buffer;
  }

  private context(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.65;
      this.sfxBus.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  hit(): void {
    this.blip(420, 0.035, "triangle", 0.04);
  }

  hurt(): void {
    this.blip(110, 0.07, "sine", 0.045);
  }

  level(): void {
    this.blip(392, 0.07, "sine", 0.035);
    window.setTimeout(() => this.blip(523, 0.09, "triangle", 0.03), 90);
  }

  eliteAggro(): void {
    this.blip(140, 0.1, "triangle", 0.045);
    window.setTimeout(() => this.blip(90, 0.14, "sine", 0.035), 70);
    this.speak("eliteAggro", 0.95, 0.7);
  }

  uniqueFind(): void {
    this.blip(440, 0.06, "sine", 0.035);
    window.setTimeout(() => this.blip(554, 0.07, "triangle", 0.03), 80);
    window.setTimeout(() => this.blip(659, 0.1, "sine", 0.025), 160);
    this.speak("uniqueFind", 1.05, 0.85);
  }

  maxCritDealt(): void {
    this.blip(620, 0.045, "triangle", 0.035);
    window.setTimeout(() => this.blip(880, 0.07, "sine", 0.025), 50);
    this.speak("maxCritDealt", 1.15, 1);
  }

  maxCritTaken(): void {
    this.blip(85, 0.09, "sine", 0.045);
    window.setTimeout(() => this.blip(60, 0.12, "triangle", 0.035), 60);
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
    const ctx = this.context();
    if (!ctx || !this.sfxBus) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.72), ctx.currentTime + duration);
    filter.type = "lowpass";
    filter.frequency.value = Math.min(2400, freq * 3.2);
    filter.Q.value = 0.6;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
