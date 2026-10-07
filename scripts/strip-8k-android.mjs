/**
 * Drop 8k PBR maps from dist before Capacitor sync.
 * Phones cannot GPU-upload them; keeping them only bloats the APK (~400MB+).
 */
import { readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "dist", "textures", "pbr");
let removed = 0;
let bytes = 0;

try {
  for (const name of readdirSync(root)) {
    if (!name.includes("8k")) continue;
    const path = join(root, name);
    bytes += statSync(path).size;
    unlinkSync(path);
    removed += 1;
    console.log(`stripped ${name}`);
  }
} catch (err) {
  console.error("strip-8k-android: missing dist/textures/pbr — run build first");
  process.exit(1);
}

console.log(`strip-8k-android: removed ${removed} files (${(bytes / 1e6).toFixed(1)} MB)`);
