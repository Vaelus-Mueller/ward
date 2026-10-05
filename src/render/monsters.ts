/**
 * Original Ward monster meshes — hand-authored procedural creatures.
 * Generic fantasy archetypes (wolves, demons, oozes, etc.) built from scratch.
 * No third-party game assets or scraped IP.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { EnemyKind } from "../game/types";
import { MONSTERS } from "../game/monsters";

type Surf = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

function mat(
  color: number,
  metal = 0.12,
  rough = 0.62,
  emissive?: number,
  emit = 0,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: metal,
    roughness: rough,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emit,
    envMapIntensity: 1.05,
    clearcoat: metal > 0.25 ? 0.35 : 0.08,
    clearcoatRoughness: 0.45,
    sheen: rough > 0.7 ? 0.35 : 0,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(color),
  });
}

function part(name: string, geo: THREE.BufferGeometry, material: Surf, y = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = y;
  return mesh;
}

function roundBox(w: number, h: number, d: number, seg = 3): THREE.BufferGeometry {
  const r = Math.min(w, h, d) * 0.16;
  const safe = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  if (safe <= 0.001) return new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  return new RoundedBoxGeometry(w, h, d, seg, safe);
}

function plantFeet(root: THREE.Group, height: number): void {
  const box = new THREE.Box3().setFromObject(root);
  root.position.y -= box.min.y;
  const size = box.getSize(new THREE.Vector3()).y;
  if (Math.abs(size - height) > 0.05) root.scale.setScalar(height / Math.max(0.001, size));
  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;
}

export const PROC_HEIGHT: Partial<Record<EnemyKind, number>> = {
  wolf: 1.15,
  slime: 1.05,
  gargoyle: 1.7,
  wisp: 0.85,
  imp: 1.05,
  spider: 0.85,
  cultist: 1.75,
  sprig: 1.45,
  whelp: 1.55,
  hillock: 2.45,
  lurker: 1.65,
  lumen: 1.85,
  flicker: 0.95,
};

export function isProceduralMonster(kind: string): kind is EnemyKind {
  return kind in MONSTERS && MONSTERS[kind as EnemyKind].model === "procedural";
}

export function buildMonster(kind: EnemyKind): THREE.Group {
  const height = PROC_HEIGHT[kind] ?? 1.5;
  const root = new THREE.Group();
  root.name = `monster-${kind}`;
  switch (kind) {
    case "wolf":
      buildWerewolf(root);
      break;
    case "slime":
      buildSlime(root);
      break;
    case "gargoyle":
      buildGargoyle(root);
      break;
    case "wisp":
      buildWisp(root);
      break;
    case "imp":
      buildDemon(root);
      break;
    case "spider":
      buildSpider(root);
      break;
    case "cultist":
      buildCultist(root);
      break;
    case "sprig":
      buildSprig(root);
      break;
    case "whelp":
      buildWhelp(root);
      break;
    case "hillock":
      buildHillock(root);
      break;
    case "lurker":
      buildLurker(root);
      break;
    case "lumen":
      buildLumen(root);
      break;
    case "flicker":
      buildFlicker(root);
      break;
    default:
      root.add(part("Body", new THREE.CapsuleGeometry(0.25, 0.7, 10, 16), mat(0x8a7a6a), 0.6));
  }
  plantFeet(root, height);
  return root;
}

/** Ash wolf — lean quadruped hunter (original Ward silhouette). */
function buildWerewolf(root: THREE.Group): void {
  const fur = mat(0x5c4a3c, 0.04, 0.88);
  const dark = mat(0x2a221c, 0.06, 0.82);
  const fang = mat(0xe8e0d4, 0.15, 0.35);
  const eye = mat(0xffcc44, 0.2, 0.3, 0xffaa00, 0.65);

  root.add(part("Chest", new THREE.CapsuleGeometry(0.26, 0.42, 10, 18), fur, 0.62));
  const haunch = part("Haunch", new THREE.SphereGeometry(0.28, 18, 14), fur, 0.55);
  haunch.position.z = -0.22;
  root.add(haunch);
  root.add(part("Head", new THREE.SphereGeometry(0.22, 18, 14), fur, 0.95));
  const snout = part("Snout", new THREE.CapsuleGeometry(0.09, 0.2, 8, 12), dark, 0.88);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0, 0.28);
  root.add(snout);
  for (const side of [-1, 1]) {
    const ear = part("Ear", new THREE.ConeGeometry(0.06, 0.16, 8), dark, 1.12);
    ear.position.set(side * 0.12, 0, -0.02);
    ear.rotation.z = side * -0.35;
    root.add(ear);
    const e = part("Eye", new THREE.SphereGeometry(0.035, 10, 8), eye, 0.98);
    e.position.set(side * 0.1, 0.02, 0.16);
    root.add(e);
    for (const z of [-0.2, 0.16]) {
      const upper = part("LegUpper", new THREE.CapsuleGeometry(0.07, 0.22, 8, 12), fur, 0.38);
      upper.position.set(side * 0.16, 0, z);
      root.add(upper);
      const lower = part("LegLower", new THREE.CapsuleGeometry(0.05, 0.2, 8, 10), dark, 0.16);
      lower.position.set(side * 0.16, 0, z + (z > 0 ? 0.04 : -0.04));
      root.add(lower);
      const paw = part("Paw", new THREE.SphereGeometry(0.06, 10, 8), dark, 0.05);
      paw.position.set(side * 0.16, 0, z + (z > 0 ? 0.06 : -0.06));
      root.add(paw);
    }
    const tooth = part("Fang", new THREE.ConeGeometry(0.025, 0.08, 6), fang, 0.82);
    tooth.position.set(side * 0.05, 0, 0.38);
    tooth.rotation.x = Math.PI;
    root.add(tooth);
  }
  const mane = part("Mane", new THREE.SphereGeometry(0.2, 14, 10), dark, 0.78);
  mane.position.set(0, 0.05, -0.05);
  mane.scale.set(1.1, 0.7, 0.9);
  root.add(mane);
  const tail = part("Tail", new THREE.CapsuleGeometry(0.055, 0.38, 8, 12), dark, 0.58);
  tail.position.set(0, 0.08, -0.52);
  tail.rotation.x = 0.55;
  root.add(tail);
}

function buildSlime(root: THREE.Group): void {
  const goo = mat(0x4ecf7a, 0.02, 0.22, 0x1a8a40, 0.4);
  goo.transmission = 0.35;
  goo.thickness = 0.6;
  goo.transparent = true;
  goo.opacity = 0.92;
  root.add(part("Blob", new THREE.SphereGeometry(0.48, 28, 22), goo, 0.42));
  root.add(part("Cap", new THREE.SphereGeometry(0.32, 20, 16), goo, 0.72));
  const core = mat(0xa8ffc0, 0.05, 0.3, 0x60ff90, 0.55);
  root.add(part("Core", new THREE.SphereGeometry(0.14, 14, 12), core, 0.5));
  const eye = mat(0x101808, 0.25, 0.35);
  for (const side of [-1, 1]) {
    const e = part("Eye", new THREE.SphereGeometry(0.07, 12, 10), eye, 0.58);
    e.position.set(side * 0.16, 0.02, 0.38);
    root.add(e);
  }
}

function buildGargoyle(root: THREE.Group): void {
  const stone = mat(0x8e8a84, 0.42, 0.48);
  stone.clearcoat = 0.55;
  const dark = mat(0x4a4640, 0.35, 0.52);
  root.add(part("Torso", roundBox(0.58, 0.78, 0.38, 4), stone, 1.0));
  root.add(part("Head", roundBox(0.34, 0.3, 0.32, 4), stone, 1.55));
  const jaw = part("Jaw", roundBox(0.28, 0.1, 0.22, 3), dark, 1.38);
  jaw.position.z = 0.06;
  root.add(jaw);
  for (const side of [-1, 1]) {
    const horn = part("Horn", new THREE.ConeGeometry(0.06, 0.28, 10), dark, 1.78);
    horn.position.set(side * 0.14, 0, -0.02);
    horn.rotation.z = side * -0.45;
    root.add(horn);
    const wing = part("Wing", roundBox(0.07, 0.65, 0.85, 3), dark, 1.2);
    wing.position.set(side * 0.42, 0, -0.12);
    wing.rotation.z = side * 0.5;
    wing.rotation.y = side * -0.25;
    root.add(wing);
    const arm = part("Arm", new THREE.CapsuleGeometry(0.08, 0.4, 8, 12), stone, 1.05);
    arm.position.set(side * 0.38, 0, 0.05);
    root.add(arm);
    const claw = part("Claw", new THREE.ConeGeometry(0.05, 0.16, 8), dark, 0.78);
    claw.position.set(side * 0.4, 0, 0.12);
    claw.rotation.x = Math.PI;
    root.add(claw);
    const leg = part("Leg", new THREE.CapsuleGeometry(0.1, 0.4, 8, 12), stone, 0.38);
    leg.position.x = side * 0.18;
    root.add(leg);
  }
}

function buildWisp(root: THREE.Group): void {
  const core = mat(0xffa45a, 0.08, 0.28, 0xff6a28, 1.2);
  root.add(part("Core", new THREE.SphereGeometry(0.2, 22, 18), core, 0.75));
  const haze = mat(0xffc090, 0.02, 0.55, 0xff8a40, 0.45);
  haze.transparent = true;
  haze.opacity = 0.55;
  haze.depthWrite = false;
  root.add(part("Haze", new THREE.SphereGeometry(0.42, 18, 14), haze, 0.75));
  for (let i = 0; i < 5; i++) {
    const spark = part("Spark", new THREE.SphereGeometry(0.04, 10, 8), core, 0.75);
    const a = (i / 5) * Math.PI * 2;
    spark.position.set(Math.cos(a) * 0.32, Math.sin(a * 1.3) * 0.12, Math.sin(a) * 0.32);
    root.add(spark);
  }
}

/** Small ward demon — horns, wings, embers (original). */
function buildDemon(root: THREE.Group): void {
  const hide = mat(0x8a2a22, 0.18, 0.55, 0x4a0808, 0.25);
  const horn = mat(0x1a1008, 0.35, 0.4);
  const glow = mat(0xff5520, 0.1, 0.35, 0xff3300, 0.85);
  root.add(part("Torso", new THREE.CapsuleGeometry(0.2, 0.38, 10, 16), hide, 0.58));
  root.add(part("Head", new THREE.SphereGeometry(0.2, 18, 14), hide, 1.0));
  root.add(part("BellyGlow", new THREE.SphereGeometry(0.1, 12, 10), glow, 0.55));
  for (const side of [-1, 1]) {
    const h = part("Horn", new THREE.ConeGeometry(0.05, 0.28, 10), horn, 1.22);
    h.position.set(side * 0.11, 0, -0.02);
    h.rotation.z = side * -0.55;
    h.rotation.x = -0.25;
    root.add(h);
    const wing = part("Wing", roundBox(0.04, 0.36, 0.48, 3), hide, 0.75);
    wing.position.set(side * 0.3, 0, -0.08);
    wing.rotation.z = side * 0.65;
    root.add(wing);
    const arm = part("Arm", new THREE.CapsuleGeometry(0.05, 0.28, 8, 10), hide, 0.7);
    arm.position.set(side * 0.26, 0, 0.05);
    root.add(arm);
    const leg = part("Leg", new THREE.CapsuleGeometry(0.06, 0.28, 8, 10), hide, 0.22);
    leg.position.x = side * 0.1;
    root.add(leg);
    const eye = part("Eye", new THREE.SphereGeometry(0.04, 10, 8), glow, 1.02);
    eye.position.set(side * 0.08, 0.02, 0.16);
    root.add(eye);
  }
  const tail = part("Tail", new THREE.CapsuleGeometry(0.04, 0.35, 8, 10), hide, 0.45);
  tail.position.set(0, 0, -0.28);
  tail.rotation.x = 0.7;
  root.add(tail);
  const tip = part("TailTip", new THREE.ConeGeometry(0.05, 0.12, 8), horn, 0.35);
  tip.position.set(0, 0, -0.48);
  tip.rotation.x = 1.1;
  root.add(tip);
}

function buildSpider(root: THREE.Group): void {
  const shell = mat(0x2e221c, 0.28, 0.42);
  shell.clearcoat = 0.7;
  const legMat = mat(0x1a120e, 0.2, 0.55);
  const fang = mat(0xc8b090, 0.2, 0.4);
  root.add(part("Abdomen", new THREE.SphereGeometry(0.32, 20, 16), shell, 0.38));
  const ceph = part("Ceph", new THREE.SphereGeometry(0.2, 18, 14), shell, 0.42);
  ceph.position.z = 0.28;
  root.add(ceph);
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const idx = i % 4;
    const a = (idx - 1.5) * 0.22;
    const upper = part("LegUpper", new THREE.CapsuleGeometry(0.035, 0.28, 6, 10), legMat, 0.4);
    upper.position.set(side * 0.18, 0, a);
    upper.rotation.z = side * 1.05;
    upper.rotation.x = a * 0.4;
    root.add(upper);
    const lower = part("LegLower", new THREE.CapsuleGeometry(0.028, 0.32, 6, 10), legMat, 0.18);
    lower.position.set(side * 0.42, 0, a * 1.1);
    lower.rotation.z = side * 0.35;
    root.add(lower);
  }
  for (const side of [-1, 1]) {
    const f = part("Fang", new THREE.ConeGeometry(0.035, 0.12, 8), fang, 0.35);
    f.position.set(side * 0.06, 0, 0.42);
    f.rotation.x = Math.PI * 0.65;
    root.add(f);
  }
  for (let i = 0; i < 6; i++) {
    const eye = part("Eye", new THREE.SphereGeometry(0.03, 8, 6), mat(0xff2222, 0.2, 0.3, 0xff0000, 0.5), 0.48);
    eye.position.set(((i % 3) - 1) * 0.07, 0.06, 0.4 + Math.floor(i / 3) * 0.05);
    root.add(eye);
  }
}

function buildCultist(root: THREE.Group): void {
  const robe = mat(0x3a241c, 0.04, 0.82);
  const skin = mat(0xb89070, 0.05, 0.68);
  const metal = mat(0x8a7a5a, 0.55, 0.35);
  root.add(part("Robe", new THREE.ConeGeometry(0.38, 1.2, 16), robe, 0.58));
  root.add(part("Shoulders", roundBox(0.55, 0.18, 0.28, 3), robe, 1.15));
  root.add(part("Head", new THREE.SphereGeometry(0.19, 16, 14), skin, 1.35));
  const hood = part("Hood", new THREE.ConeGeometry(0.24, 0.32, 12), robe, 1.55);
  hood.rotation.x = 0.25;
  root.add(hood);
  const mask = part("Mask", roundBox(0.2, 0.12, 0.08, 2), metal, 1.35);
  mask.position.z = 0.14;
  root.add(mask);
  const staff = part("Staff", new THREE.CylinderGeometry(0.028, 0.04, 1.35, 10), mat(0x5a3a22, 0.1, 0.75), 0.75);
  staff.position.x = 0.32;
  root.add(staff);
  const orb = part("Orb", new THREE.SphereGeometry(0.08, 14, 12), mat(0x8866ff, 0.2, 0.3, 0x6644ff, 0.7), 1.45);
  orb.position.set(0.32, 0, 0);
  root.add(orb);
}

function buildSprig(root: THREE.Group): void {
  const wood = mat(0x4a5a32, 0.05, 0.88);
  const leaf = mat(0x6ecf5a, 0.04, 0.55, 0x3a8a2a, 0.2);
  const bark = mat(0x3a2a18, 0.08, 0.9);
  root.add(part("Trunk", new THREE.CylinderGeometry(0.11, 0.2, 1.0, 12), wood, 0.55));
  root.add(part("Knot", new THREE.SphereGeometry(0.14, 12, 10), bark, 0.85));
  root.add(part("Crown", new THREE.IcosahedronGeometry(0.4, 1), leaf, 1.3));
  root.add(part("CrownB", new THREE.IcosahedronGeometry(0.28, 1), leaf, 1.5));
  for (const side of [-1, 1]) {
    const arm = part("Branch", new THREE.CapsuleGeometry(0.05, 0.4, 8, 12), wood, 0.9);
    arm.position.x = side * 0.28;
    arm.rotation.z = side * 0.75;
    root.add(arm);
    const tuft = part("Tuft", new THREE.IcosahedronGeometry(0.12, 0), leaf, 1.05);
    tuft.position.set(side * 0.48, 0, 0);
    root.add(tuft);
  }
}

function buildWhelp(root: THREE.Group): void {
  const scale = mat(0xb84a2a, 0.28, 0.42, 0x6a1808, 0.22);
  scale.clearcoat = 0.45;
  const belly = mat(0xd4a06a, 0.08, 0.62);
  const horn = mat(0x2a1810, 0.3, 0.45);
  root.add(part("Body", new THREE.CapsuleGeometry(0.3, 0.55, 10, 16), scale, 0.72));
  root.add(part("Belly", new THREE.SphereGeometry(0.24, 16, 12), belly, 0.55));
  root.add(part("Head", new THREE.SphereGeometry(0.26, 18, 14), scale, 1.2));
  const jaw = part("Jaw", roundBox(0.22, 0.08, 0.2, 2), belly, 1.05);
  jaw.position.z = 0.12;
  root.add(jaw);
  for (const side of [-1, 1]) {
    const wing = part("Wing", roundBox(0.05, 0.5, 0.8, 3), scale, 1.0);
    wing.position.set(side * 0.38, 0, -0.08);
    wing.rotation.z = side * 0.6;
    root.add(wing);
    const leg = part("Leg", new THREE.CapsuleGeometry(0.08, 0.3, 8, 12), scale, 0.28);
    leg.position.x = side * 0.16;
    root.add(leg);
    const h = part("Horn", new THREE.ConeGeometry(0.045, 0.18, 8), horn, 1.42);
    h.position.set(side * 0.1, 0, -0.05);
    h.rotation.z = side * -0.4;
    root.add(h);
  }
  const tail = part("Tail", new THREE.CapsuleGeometry(0.08, 0.5, 8, 12), scale, 0.55);
  tail.position.z = -0.5;
  tail.rotation.x = 0.45;
  root.add(tail);
  const tip = part("TailSpike", new THREE.ConeGeometry(0.07, 0.16, 8), horn, 0.45);
  tip.position.set(0, 0, -0.78);
  tip.rotation.x = 1.0;
  root.add(tip);
}

function buildHillock(root: THREE.Group): void {
  const skin = mat(0xa88868, 0.05, 0.78);
  const cloth = mat(0x4a3a2a, 0.04, 0.88);
  const stone = mat(0x7a7468, 0.25, 0.55);
  root.add(part("Torso", roundBox(0.9, 1.0, 0.55, 4), skin, 1.4));
  root.add(part("Head", new THREE.SphereGeometry(0.34, 18, 14), skin, 2.15));
  root.add(part("Brow", roundBox(0.4, 0.08, 0.12, 2), stone, 2.28));
  root.add(part("Skirt", new THREE.CylinderGeometry(0.48, 0.55, 0.55, 14), cloth, 0.55));
  for (const side of [-1, 1]) {
    const arm = part("Arm", new THREE.CapsuleGeometry(0.14, 0.6, 10, 14), skin, 1.4);
    arm.position.x = side * 0.58;
    root.add(arm);
    const fist = part("Fist", new THREE.SphereGeometry(0.14, 12, 10), skin, 1.0);
    fist.position.x = side * 0.62;
    root.add(fist);
    const leg = part("Leg", new THREE.CapsuleGeometry(0.15, 0.5, 10, 14), skin, 0.35);
    leg.position.x = side * 0.24;
    root.add(leg);
  }
  const club = part("Club", new THREE.CylinderGeometry(0.08, 0.14, 0.9, 10), stone, 1.1);
  club.position.set(0.7, 0, 0.1);
  club.rotation.z = 0.4;
  root.add(club);
}

function buildLurker(root: THREE.Group): void {
  const flesh = mat(0x6a5a78, 0.12, 0.55, 0x3a1848, 0.28);
  flesh.sheen = 0.5;
  root.add(part("Body", new THREE.SphereGeometry(0.5, 24, 18), flesh, 0.58));
  root.add(part("Dome", new THREE.SphereGeometry(0.35, 18, 14), flesh, 0.95));
  for (let i = 0; i < 7; i++) {
    const eye = part(
      "Eye",
      new THREE.SphereGeometry(0.07, 12, 10),
      mat(0xe8d060, 0.25, 0.3, 0xffee88, 0.7),
      0.75,
    );
    const a = (i / 7) * Math.PI * 2;
    eye.position.set(Math.cos(a) * 0.36, 0.12, Math.sin(a) * 0.36);
    root.add(eye);
  }
  for (let i = 0; i < 6; i++) {
    const tent = part("Tentacle", new THREE.CapsuleGeometry(0.055, 0.55, 8, 12), flesh, 0.22);
    const a = (i / 6) * Math.PI * 2;
    tent.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25 + 0.15);
    tent.rotation.x = 0.9;
    tent.rotation.z = Math.cos(a) * 0.35;
    root.add(tent);
  }
}

function buildLumen(root: THREE.Group): void {
  const light = mat(0xe7c39a, 0.35, 0.32, 0xffe0b0, 0.75);
  light.clearcoat = 0.8;
  const crack = mat(0x6a5040, 0.25, 0.5);
  root.add(part("Body", new THREE.CapsuleGeometry(0.3, 0.85, 12, 18), light, 0.95));
  root.add(part("Halo", new THREE.TorusGeometry(0.4, 0.045, 12, 32), light, 1.85));
  root.add(part("HaloInner", new THREE.TorusGeometry(0.28, 0.025, 10, 24), light, 1.85));
  root.add(part("Crack", roundBox(0.1, 0.55, 0.08, 2), crack, 1.0));
  for (const side of [-1, 1]) {
    const arm = part("Arm", new THREE.CapsuleGeometry(0.07, 0.45, 8, 12), light, 1.05);
    arm.position.x = side * 0.38;
    root.add(arm);
  }
}

function buildFlicker(root: THREE.Group): void {
  const glow = mat(0xa8d4e8, 0.2, 0.35, 0x60b0e0, 0.65);
  glow.transparent = true;
  glow.opacity = 0.9;
  root.add(part("Body", new THREE.SphereGeometry(0.22, 20, 16), glow, 0.58));
  for (let i = 0; i < 5; i++) {
    const orb = part("Orb", new THREE.SphereGeometry(0.07, 14, 12), glow, 0.7 + (i % 3) * 0.1);
    const a = (i / 5) * Math.PI * 2;
    orb.position.set(Math.cos(a) * 0.32, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.32);
    root.add(orb);
  }
  const trail = mat(0xd0e8ff, 0.05, 0.5, 0x88c0ff, 0.35);
  trail.transparent = true;
  trail.opacity = 0.4;
  trail.depthWrite = false;
  root.add(part("Trail", new THREE.SphereGeometry(0.35, 14, 10), trail, 0.58));
}
