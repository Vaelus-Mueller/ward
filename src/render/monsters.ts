/**
 * Procedural / kitbashed monster meshes for wave-1 kinds without KayKit GLBs.
 * CC0-style original geometry — no scraped D&D assets.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { EnemyKind } from "../game/types";
import { MONSTERS, monsterOf } from "../game/monsters";

function mat(color: number, metal = 0.1, rough = 0.7, emissive?: number, emit = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: metal,
    roughness: rough,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emit,
    envMapIntensity: 0.85,
  });
}

function part(name: string, geo: THREE.BufferGeometry, material: THREE.Material, y = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = y;
  return mesh;
}

function roundBox(w: number, h: number, d: number): THREE.BufferGeometry {
  const r = Math.min(w, h, d) * 0.18;
  const safe = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  if (safe <= 0.001) return new THREE.BoxGeometry(w, h, d);
  return new RoundedBoxGeometry(w, h, d, 2, safe);
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
  wolf: 1.05,
  slime: 0.95,
  gargoyle: 1.55,
  wisp: 0.7,
  imp: 0.95,
  spider: 0.7,
  cultist: 1.65,
  sprig: 1.35,
  whelp: 1.45,
  hillock: 2.35,
  lurker: 1.5,
  lumen: 1.7,
  flicker: 0.85,
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
      buildWolf(root);
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
      buildImp(root);
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
      root.add(part("Body", new THREE.CapsuleGeometry(0.25, 0.7, 6, 10), mat(0x8a7a6a), 0.6));
  }
  plantFeet(root, height);
  return root;
}

function buildWolf(root: THREE.Group): void {
  const fur = mat(0x6a5a4a, 0.05, 0.85);
  const dark = mat(0x3a3028, 0.05, 0.9);
  root.add(part("Body", new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), fur, 0.55));
  root.add(part("Head", new THREE.SphereGeometry(0.2, 14, 12), fur, 0.85));
  const snout = part("Snout", new THREE.CapsuleGeometry(0.08, 0.16, 4, 8), dark, 0.78);
  snout.rotation.x = Math.PI / 2;
  snout.position.z = 0.22;
  root.add(snout);
  for (const side of [-1, 1]) {
    for (const z of [-0.18, 0.18]) {
      const leg = part("Leg", new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), fur, 0.22);
      leg.position.set(side * 0.14, 0, z);
      root.add(leg);
    }
  }
  const tail = part("Tail", new THREE.CapsuleGeometry(0.05, 0.28, 4, 8), dark, 0.55);
  tail.position.set(0, 0.1, -0.4);
  tail.rotation.x = 0.6;
  root.add(tail);
}

function buildSlime(root: THREE.Group): void {
  const goo = mat(0x5ecf7a, 0.05, 0.35, 0x2a8a40, 0.25);
  root.add(part("Blob", new THREE.SphereGeometry(0.42, 18, 14), goo, 0.38));
  root.add(part("Cap", new THREE.SphereGeometry(0.28, 14, 10), goo, 0.62));
  const eye = mat(0x1a2018, 0.2, 0.4);
  for (const side of [-1, 1]) {
    const e = part("Eye", new THREE.SphereGeometry(0.06, 8, 6), eye, 0.55);
    e.position.set(side * 0.14, 0, 0.32);
    root.add(e);
  }
}

function buildGargoyle(root: THREE.Group): void {
  const stone = mat(0x8a8680, 0.25, 0.55);
  const dark = mat(0x5a5650, 0.3, 0.5);
  root.add(part("Torso", roundBox(0.55, 0.7, 0.35), stone, 0.95));
  root.add(part("Head", roundBox(0.32, 0.28, 0.3), stone, 1.45));
  for (const side of [-1, 1]) {
    const wing = part("Wing", roundBox(0.08, 0.55, 0.7), dark, 1.15);
    wing.position.set(side * 0.4, 0, -0.1);
    wing.rotation.z = side * 0.45;
    root.add(wing);
    const leg = part("Leg", new THREE.CapsuleGeometry(0.09, 0.35, 4, 8), stone, 0.35);
    leg.position.x = side * 0.16;
    root.add(leg);
  }
}

function buildWisp(root: THREE.Group): void {
  const core = mat(0xffa45a, 0.1, 0.4, 0xff6a28, 0.9);
  root.add(part("Core", new THREE.SphereGeometry(0.22, 16, 12), core, 0.7));
  const haze = mat(0xffc090, 0.05, 0.6, 0xff8a40, 0.35);
  root.add(part("Haze", new THREE.SphereGeometry(0.38, 12, 10), haze, 0.7));
}

function buildImp(root: THREE.Group): void {
  const hide = mat(0x8a3a2a, 0.1, 0.7, 0x4a1010, 0.15);
  const horn = mat(0x2a1810, 0.2, 0.55);
  root.add(part("Body", new THREE.CapsuleGeometry(0.18, 0.4, 6, 10), hide, 0.55));
  root.add(part("Head", new THREE.SphereGeometry(0.18, 12, 10), hide, 0.95));
  for (const side of [-1, 1]) {
    const h = part("Horn", new THREE.ConeGeometry(0.04, 0.18, 6), horn, 1.12);
    h.position.x = side * 0.1;
    h.rotation.z = side * -0.4;
    root.add(h);
    const wing = part("Wing", roundBox(0.05, 0.28, 0.35), hide, 0.7);
    wing.position.set(side * 0.28, 0, -0.05);
    wing.rotation.z = side * 0.5;
    root.add(wing);
  }
}

function buildSpider(root: THREE.Group): void {
  const shell = mat(0x3a2a22, 0.15, 0.55);
  const legMat = mat(0x2a1c16, 0.1, 0.7);
  root.add(part("Abdomen", new THREE.SphereGeometry(0.28, 14, 12), shell, 0.35));
  root.add(part("Ceph", new THREE.SphereGeometry(0.18, 12, 10), shell, 0.4));
  const ceph = root.children[1]!;
  ceph.position.z = 0.22;
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const idx = i % 4;
    const leg = part("Leg", new THREE.CapsuleGeometry(0.03, 0.42, 3, 6), legMat, 0.28);
    leg.position.set(side * 0.2, 0, (idx - 1.5) * 0.12);
    leg.rotation.z = side * 0.85;
    root.add(leg);
  }
}

function buildCultist(root: THREE.Group): void {
  const robe = mat(0x4a3028, 0.05, 0.8);
  const skin = mat(0xc4a48a, 0.05, 0.7);
  root.add(part("Robe", new THREE.ConeGeometry(0.35, 1.1, 10), robe, 0.55));
  root.add(part("Head", new THREE.SphereGeometry(0.18, 12, 10), skin, 1.25));
  const hood = part("Hood", new THREE.ConeGeometry(0.22, 0.28, 8), robe, 1.42);
  hood.rotation.x = 0.2;
  root.add(hood);
  const staff = part("Staff", new THREE.CylinderGeometry(0.03, 0.04, 1.2, 6), mat(0x6a4a2a, 0.1, 0.75), 0.7);
  staff.position.x = 0.28;
  root.add(staff);
}

function buildSprig(root: THREE.Group): void {
  const wood = mat(0x5a6a3a, 0.05, 0.85);
  const leaf = mat(0x6ecf5a, 0.05, 0.7, 0x3a8a2a, 0.15);
  root.add(part("Trunk", new THREE.CylinderGeometry(0.12, 0.18, 0.9, 8), wood, 0.55));
  root.add(part("Crown", new THREE.IcosahedronGeometry(0.35, 0), leaf, 1.2));
  for (const side of [-1, 1]) {
    const arm = part("Branch", new THREE.CapsuleGeometry(0.05, 0.35, 4, 8), wood, 0.85);
    arm.position.x = side * 0.25;
    arm.rotation.z = side * 0.7;
    root.add(arm);
  }
}

function buildWhelp(root: THREE.Group): void {
  const scale = mat(0xb84a2a, 0.2, 0.55, 0x6a2010, 0.2);
  const belly = mat(0xd4a06a, 0.1, 0.65);
  root.add(part("Body", new THREE.CapsuleGeometry(0.28, 0.55, 6, 12), scale, 0.7));
  root.add(part("Belly", new THREE.SphereGeometry(0.22, 12, 10), belly, 0.55));
  root.add(part("Head", new THREE.SphereGeometry(0.24, 14, 12), scale, 1.15));
  for (const side of [-1, 1]) {
    const wing = part("Wing", roundBox(0.06, 0.45, 0.7), scale, 0.95);
    wing.position.set(side * 0.35, 0, -0.05);
    wing.rotation.z = side * 0.55;
    root.add(wing);
    const leg = part("Leg", new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), scale, 0.28);
    leg.position.x = side * 0.14;
    root.add(leg);
  }
  const tail = part("Tail", new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), scale, 0.55);
  tail.position.z = -0.45;
  tail.rotation.x = 0.4;
  root.add(tail);
}

function buildHillock(root: THREE.Group): void {
  const skin = mat(0xa88868, 0.05, 0.8);
  const cloth = mat(0x5a4a3a, 0.05, 0.85);
  root.add(part("Torso", roundBox(0.85, 0.95, 0.5), skin, 1.35));
  root.add(part("Head", new THREE.SphereGeometry(0.32, 14, 12), skin, 2.05));
  root.add(part("Skirt", new THREE.CylinderGeometry(0.45, 0.5, 0.5, 10), cloth, 0.55));
  for (const side of [-1, 1]) {
    const arm = part("Arm", new THREE.CapsuleGeometry(0.12, 0.55, 5, 10), skin, 1.35);
    arm.position.x = side * 0.55;
    root.add(arm);
    const leg = part("Leg", new THREE.CapsuleGeometry(0.14, 0.45, 5, 10), skin, 0.35);
    leg.position.x = side * 0.22;
    root.add(leg);
  }
}

function buildLurker(root: THREE.Group): void {
  const flesh = mat(0x6a5a78, 0.1, 0.65, 0x3a2040, 0.2);
  root.add(part("Body", new THREE.SphereGeometry(0.45, 16, 12), flesh, 0.55));
  for (let i = 0; i < 5; i++) {
    const eye = part("Eye", new THREE.SphereGeometry(0.08, 8, 6), mat(0xe8d060, 0.2, 0.4, 0xc0a020, 0.5), 0.7);
    const a = (i / 5) * Math.PI * 2;
    eye.position.set(Math.cos(a) * 0.32, 0.1, Math.sin(a) * 0.32);
    root.add(eye);
  }
  for (let i = 0; i < 4; i++) {
    const tent = part("Tentacle", new THREE.CapsuleGeometry(0.05, 0.5, 4, 8), flesh, 0.25);
    tent.position.set((i - 1.5) * 0.18, 0, 0.35);
    tent.rotation.x = 0.8;
    root.add(tent);
  }
}

function buildLumen(root: THREE.Group): void {
  const light = mat(0xe7c39a, 0.3, 0.4, 0xffe0b0, 0.55);
  const crack = mat(0x8a7060, 0.2, 0.55);
  root.add(part("Body", new THREE.CapsuleGeometry(0.28, 0.8, 8, 12), light, 0.9));
  root.add(part("Halo", new THREE.TorusGeometry(0.35, 0.04, 8, 20), light, 1.75));
  root.add(part("Crack", roundBox(0.12, 0.5, 0.08), crack, 0.95));
}

function buildFlicker(root: THREE.Group): void {
  const glow = mat(0xa8d4e8, 0.15, 0.45, 0x60a0c0, 0.45);
  root.add(part("Body", new THREE.SphereGeometry(0.2, 14, 12), glow, 0.55));
  for (let i = 0; i < 3; i++) {
    const orb = part("Orb", new THREE.SphereGeometry(0.08, 10, 8), glow, 0.7 + i * 0.12);
    orb.position.set(Math.cos(i * 2.1) * 0.28, 0, Math.sin(i * 2.1) * 0.28);
    root.add(orb);
  }
}
