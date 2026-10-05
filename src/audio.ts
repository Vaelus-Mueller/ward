export type VoiceLine = "eliteAggro" | "uniqueFind" | "maxCritDealt" | "maxCritTaken";

const LINES: Record<VoiceLine, string[]> = {
  eliteAggro: ["Elite!", "They found us!", "Big one!", "Watch out!"],
  uniqueFind: ["A unique!", "Legendary find!", "Gold drop!", "Rare prize!"],
  maxCritDealt: ["Max crit!", "Perfect strike!", "Crushed them!", "Full power!"],
  maxCritTaken: ["That hurt!", "Heavy hit!", "I'm hit hard!", "Crushing blow!"],
};

/**
 * Tiny voice cues via Web Speech, with tonal stingers underneath.
 * Procedural title drone for the splash — no recorded assets.
 * Keeps the APK light and works offline in WebView.
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

  toggle(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      window.speechSynthesis?.cancel();
      this.setThemeGain(0);
    } else if (this.themeOn) {
      if (this.themeNodes.length === 0) this.buildTheme();
      else this.setThemeGain(1);
    }
    return this.muted;
  }

  /** Unlock audio (call from a user gesture) and start the splash / title drone. */
  startOminous(): void {
    this.themeOn = true;
    if (this.muted) return;
    // Resume a suspended context from a gesture, then build or keep the bed.
    const ctx = this.context();
    if (!ctx) return;
    this.buildTheme();
  }

  private buildTheme(): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || this.themeNodes.length > 0) return;
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    this.master = master;
    master.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.4);

    // Low pedal — a hollow fifth under a minor second for unease.
    this.drone(ctx, master, 55, "sine", 0.045);
    this.drone(ctx, master, 82.5, "triangle", 0.028);
    this.drone(ctx, master, 110, "sine", 0.018);
    this.drone(ctx, master, 164.8, "sawtooth", 0.008);

    // Slow breathing noise bed.
    const noise = this.noiseBed(ctx, master, 0.012);
    if (noise) this.themeNodes.push(noise);

    this.scheduleBell(ctx, master);
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
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), now + 0.35);
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
    filter.frequency.value = 280;
    filter.Q.value = 0.7;
    gain.gain.value = gainValue;
    // Gentle tremolo via LFO on the filter.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.07 + freq / 4000;
    lfoGain.gain.value = 40;
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
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 90;
    filter.Q.value = 0.6;
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
    filter.frequency.value = 520;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 3.8);
    const wait = 4200 + Math.random() * 3800;
    this.themeTimer = window.setTimeout(() => this.scheduleBell(ctx, dest), wait);
  }

  private context(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  hit(): void {
    this.tone(210, 0.04, "square", 0.03);
  }

  hurt(): void {
    this.tone(90, 0.08, "sawtooth", 0.04);
  }

  level(): void {
    this.tone(392, 0.08, "triangle", 0.04);
    window.setTimeout(() => this.tone(523, 0.1, "triangle", 0.04), 90);
  }

  eliteAggro(): void {
    this.tone(120, 0.12, "sawtooth", 0.05);
    window.setTimeout(() => this.tone(70, 0.18, "square", 0.04), 70);
    this.speak("eliteAggro", 0.95, 0.7);
  }

  uniqueFind(): void {
    this.tone(440, 0.07, "triangle", 0.045);
    window.setTimeout(() => this.tone(554, 0.08, "triangle", 0.04), 80);
    window.setTimeout(() => this.tone(659, 0.12, "sine", 0.035), 160);
    this.speak("uniqueFind", 1.05, 0.85);
  }

  maxCritDealt(): void {
    this.tone(620, 0.05, "square", 0.04);
    window.setTimeout(() => this.tone(880, 0.08, "triangle", 0.035), 50);
    this.speak("maxCritDealt", 1.15, 1);
  }

  maxCritTaken(): void {
    this.tone(70, 0.1, "sawtooth", 0.055);
    window.setTimeout(() => this.tone(50, 0.14, "square", 0.04), 60);
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
    utter.volume = 0.85;
    const voices = synth.getVoices();
    const english = voices.find((voice) => /en(-|_|$)/i.test(voice.lang) && /male|daniel|david|fred|alex/i.test(voice.name))
      ?? voices.find((voice) => /en(-|_|$)/i.test(voice.lang));
    if (english) utter.voice = english;
    synth.speak(utter);
  }

  private tone(freq: number, duration: number, type: OscillatorType, gainValue: number): void {
    const ctx = this.context();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}
