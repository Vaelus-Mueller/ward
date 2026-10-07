/**
 * Keep only Oniro-class 1k PBR in the Android package.
 * Desktop/web builds still get 4k/8k from dist; Capacitor sync strips them here.
 */
import { readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "dist", "textures", "pbr");
let removed = 0;
let bytes = 0;

try {
  for (const name of readdirSync(root)) {
    // Keep *_1k.jpg (and any non-resolution-tagged leftovers). Drop 4k/8k.
    if (!name.includes("4k") && !name.includes("8k")) continue;
    const path = join(root, name);
    bytes += statSync(path).size;
    unlinkSync(path);
    removed += 1;
    console.log(`stripped ${name}`);
  }
} catch {
  console.error("strip-heavy-android: missing dist/textures/pbr — run build first");
  process.exit(1);
}

console.log(`strip-heavy-android: removed ${removed} files (${(bytes / 1e6).toFixed(1)} MB)`);
