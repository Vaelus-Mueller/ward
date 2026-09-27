export class AudioBus {
  muted = false;
  private ctx: AudioContext | null = null;

  toggle(): boolean {
    this.muted = !this.muted;
    return this.muted;
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
