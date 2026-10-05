import { Capacitor } from "@capacitor/core";

export type VoiceLine = "eliteAggro" | "uniqueFind" | "maxCritDealt" | "maxCritTaken";

const LINES: Record<VoiceLine, string[]> = {
  eliteAggro: ["Elite!", "They found us!", "Big one!", "Watch out!"],
  uniqueFind: ["A unique!", "Legendary find!", "Gold drop!", "Rare prize!"],
  maxCritDealt: ["Max crit!", "Perfect strike!", "Crushed them!", "Full power!"],
  maxCritTaken: ["That hurt!", "Heavy hit!", "I'm hit hard!", "Crushing blow!"],
};

/**
 * Procedural SFX + optional Web Speech cues.
 * No recorded assets — keeps the APK light and works offline in WebView.
 * Android WebView TTS is often missing or garbled, so speech is skipped there.
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

  /** Unlock audio (call from a user gesture) and start the splash / title drone. */
  startOminous(): void {
    this.themeOn = true;
    if (this.muted) return;
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
    master.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 2.4);

    // Low pedal — a hollow fifth under a minor second for unease.
    this.drone(ctx, master, 55, "sine", 0.045);
    this.drone(ctx, master, 82.5, "triangle", 0.028);
    this.drone(ctx, master, 110, "sine", 0.018);
    this.drone(ctx, master, 164.8, "sine", 0.006);

    // Slow breathing noise bed.
    const noise = this.noiseBed(ctx, master, 0.01);
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
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0001, level * 0.55), now + 0.35);
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
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.08);
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
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.7;
      this.sfxBus.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  hit(): void {
    this.blip(420, 0.035, "triangle", 0.045);
  }

  hurt(): void {
    this.blip(110, 0.07, "sine", 0.05);
  }

  level(): void {
    this.blip(392, 0.07, "sine", 0.04);
    window.setTimeout(() => this.blip(523, 0.09, "triangle", 0.035), 90);
  }

  eliteAggro(): void {
    this.blip(140, 0.1, "triangle", 0.05);
    window.setTimeout(() => this.blip(90, 0.14, "sine", 0.04), 70);
    this.speak("eliteAggro", 0.95, 0.7);
  }

  uniqueFind(): void {
    this.blip(440, 0.06, "sine", 0.04);
    window.setTimeout(() => this.blip(554, 0.07, "triangle", 0.035), 80);
    window.setTimeout(() => this.blip(659, 0.1, "sine", 0.03), 160);
    this.speak("uniqueFind", 1.05, 0.85);
  }

  maxCritDealt(): void {
    this.blip(620, 0.045, "triangle", 0.04);
    window.setTimeout(() => this.blip(880, 0.07, "sine", 0.03), 50);
    this.speak("maxCritDealt", 1.15, 1);
  }

  maxCritTaken(): void {
    this.blip(85, 0.09, "sine", 0.05);
    window.setTimeout(() => this.blip(60, 0.12, "triangle", 0.04), 60);
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
