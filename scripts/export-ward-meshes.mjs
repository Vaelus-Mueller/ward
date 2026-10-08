/**
 * Bakes the original Ward procedural heroes and monsters (Three.js) into OBJ
 * files the Unity project can import. Each solid part color becomes a material.
 */
import fs from "fs";
import path from "path";
import * as THREE from "three";
import { buildHero } from "../src/render/heroes.ts";
import { buildMonster } from "../src/render/monsters.ts";

const outDir = path.resolve("WardUnity/Assets/Resources/Models/Actors");
fs.mkdirSync(outDir, { recursive: true });

const races = ["human", "elf", "dwarf", "gnome", "hobbit", "insectoid", "minotaur", "golem", "lizard", "undead"];
const gendered = new Set(["human", "elf", "dwarf", "gnome", "hobbit", "insectoid", "lizard", "undead"]);
const monsters = [
  "skeleton", "zombie", "zombieF", "wolf", "wolfF", "rat", "roofrat", "packrat", "giantrat", "direrat",
  "slime", "gargoyle", "wisp", "imp", "slayer", "assassin", "legionnaire", "archdemon", "spider", "cultist",
  "sprig", "whelp", "wyvern", "drake", "dragon", "wyrm", "hillock", "lurker", "lumen", "flicker",
];

function colorOf(material) {
  const mat = Array.isArray(material) ? material[0] : material;
  const c = mat && mat.color ? mat.color.clone() : new THREE.Color(0.7, 0.7, 0.7);
  if (mat && mat.emissive && mat.emissiveIntensity) {
    c.add(mat.emissive.clone().multiplyScalar(mat.emissiveIntensity));
  }
  c.r = Math.min(1, c.r);
  c.g = Math.min(1, c.g);
  c.b = Math.min(1, c.b);
  const key = [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  return { key, r: c.r, g: c.g, b: c.b };
}

function bake(root, assetName) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  let min = new THREE.Vector3(1e9, 1e9, 1e9);
  let max = new THREE.Vector3(-1e9, -1e9, -1e9);
  let tris = 0;

  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    const { key, r, g, b } = colorOf(obj.material);
    if (!groups.has(key)) groups.set(key, { r, g, b, positions: [], normals: [], indices: [] });
    const group = groups.get(key);
    const geo = obj.geometry;
    const pos = geo.getAttribute("position");
    const nrm = geo.getAttribute("normal");
    if (!pos) return;
    const base = group.positions.length / 3;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      v.x = -v.x;
      if (nrm) n.fromBufferAttribute(nrm, i).applyMatrix3(normalMatrix);
      else n.set(0, 1, 0);
      n.x = -n.x;
      n.normalize();
      group.positions.push(v.x, v.y, v.z);
      group.normals.push(n.x, n.y, n.z);
      min.min(v);
      max.max(v);
    }
    const index = geo.getIndex();
    const count = index ? index.count : pos.count;
    for (let t = 0; t + 2 < count; t += 3) {
      const a = base + (index ? index.getX(t) : t);
      const b = base + (index ? index.getX(t + 1) : t + 1);
      const c = base + (index ? index.getX(t + 2) : t + 2);
      group.indices.push(a, c, b);
      tris++;
    }
  });

  const lines = [];
  let cursor = 1;
  for (const group of groups.values()) {
    const base = cursor;
    for (let i = 0; i < group.positions.length; i += 3) {
      lines.push(
        `v ${fmt(group.positions[i])} ${fmt(group.positions[i + 1])} ${fmt(group.positions[i + 2])} ${fmt(group.r)} ${fmt(group.g)} ${fmt(group.b)}`,
      );
    }
    for (let i = 0; i < group.indices.length; i += 3) {
      lines.push(`f ${base + group.indices[i]} ${base + group.indices[i + 1]} ${base + group.indices[i + 2]}`);
    }
    cursor += group.positions.length / 3;
  }

  fs.writeFileSync(path.join(outDir, `${assetName}.txt`), lines.join("\n"));
  const verts = cursor - 1;
  console.log(
    `${assetName} verts=${verts} tris=${tris} mats=${groups.size} min=(${fmt(min.x)},${fmt(min.y)},${fmt(min.z)}) max=(${fmt(max.x)},${fmt(max.y)},${fmt(max.z)})`,
  );
}

function fmt(n) {
  return Number(n).toFixed(5);
}

for (const race of races) {
  bake(buildHero(race, "male"), race);
  if (gendered.has(race)) bake(buildHero(race, "female"), `${race}_f`);
}
for (const kind of monsters) bake(buildMonster(kind), `mon_${kind}`);
