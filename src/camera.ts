import { ARENA, clamp } from "./game/types";

export function cameraFor(px: number, py: number, viewW: number, viewH: number): { x: number; y: number } {
  let x = px - viewW / 2;
  let y = py - viewH / 2;
  if (ARENA.width <= viewW) x = (ARENA.width - viewW) / 2;
  else x = clamp(x, 0, ARENA.width - viewW);
  if (ARENA.height <= viewH) y = (ARENA.height - viewH) / 2;
  else y = clamp(y, 0, ARENA.height - viewH);
  return { x, y };
}
