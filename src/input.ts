import type { Intent } from "./game/sim";

export class Input {
  moveX = 0;
  moveY = 0;
  attackHeld = false;
  private skillEdge: [boolean, boolean, boolean] = [false, false, false];
  private pendingAim: number | null = null;
  private pendingDest: { x: number; y: number } | null = null;
  private pendingLoot: number | null = null;
  private stickId: number | null = null;
  private keys = new Set<string>();

  constructor(
    private canvas: HTMLCanvasElement,
    private joy: HTMLElement,
    private pick: (clientX: number, clientY: number) => { x: number; y: number; enemyId: number | null } | null,
  ) {
    this.joy.addEventListener("pointerdown", (event) => this.stickDown(event));
    this.joy.addEventListener("pointermove", (event) => this.stickMove(event));
    this.joy.addEventListener("pointerup", (event) => this.stickUp(event));
    this.joy.addEventListener("pointercancel", (event) => this.stickUp(event));
    canvas.addEventListener("pointerdown", (event) => this.worldDown(event));
    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === "Digit1") this.skillEdge[0] = true;
      if (event.code === "Digit2") this.skillEdge[1] = true;
      if (event.code === "Digit3") this.skillEdge[2] = true;
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.stickId = null;
      this.moveX = 0;
      this.moveY = 0;
      this.attackHeld = false;
    });
  }

  holdAttack(held: boolean): void {
    this.attackHeld = held;
  }

  pulseSkill(index: 0 | 1 | 2): void {
    this.skillEdge[index] = true;
  }

  pulseLoot(id: number): void {
    this.pendingLoot = id;
  }

  sample(): Intent {
    let moveX = this.moveX;
    let moveY = this.moveY;
    if (this.stickId === null) {
      moveX = (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
      moveY = (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) - (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0);
    }
    const intent: Intent = {
      moveX,
      moveY,
      aimId: this.pendingAim,
      dest: this.pendingDest,
      attack: this.attackHeld || this.keys.has("Space") || this.keys.has("KeyJ"),
      skills: [...this.skillEdge],
      lootId: this.pendingLoot,
    };
    this.skillEdge = [false, false, false];
    this.pendingAim = null;
    this.pendingDest = null;
    this.pendingLoot = null;
    return intent;
  }

  private stickDown(event: PointerEvent): void {
    if (this.stickId !== null) return;
    this.stickId = event.pointerId;
    this.joy.setPointerCapture(event.pointerId);
    this.moveKnob(event);
  }

  private stickMove(event: PointerEvent): void {
    if (event.pointerId !== this.stickId) return;
    this.moveKnob(event);
  }

  private stickUp(event: PointerEvent): void {
    if (event.pointerId !== this.stickId) return;
    this.stickId = null;
    this.moveX = 0;
    this.moveY = 0;
    const knob = this.joy.querySelector("#joy-knob") as HTMLElement | null;
    if (knob) knob.style.transform = "translate(-50%, -50%)";
  }

  private moveKnob(event: PointerEvent): void {
    const rect = this.joy.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const max = rect.width * 0.34;
    const dist = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(max, dist);
    dx = (dx / dist) * clamped;
    dy = (dy / dist) * clamped;
    this.moveX = dx / max;
    this.moveY = dy / max;
    const knob = this.joy.querySelector("#joy-knob") as HTMLElement | null;
    if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  private worldDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const hit = this.pick(event.clientX, event.clientY);
    if (!hit) return;
    if (hit.enemyId !== null) this.pendingAim = hit.enemyId;
    else this.pendingDest = { x: hit.x, y: hit.y };
  }
}
