/**
 * Original Ward monster meshes — hand-authored procedural creatures.
 * Generic fantasy archetypes (wolves, demons, oozes, etc.) built from scratch.
 * No third-party game assets or scraped IP.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { EnemyKind } from "../game/types";
import { MONSTERS } from "../game/monsters";
import { capsule, cone, cylinder, roundSegs, sphere, torus } from "./meshBudget";

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
  return new RoundedBoxGeometry(w, h, d, roundSegs(seg), safe);
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
  skeleton: 1.72,
  zombie: 1.78,
  zombieF: 1.7,
  wolf: 1.35,
  wolfF: 1.22,
  rat: 1.05,
  roofrat: 0.55,
  packrat: 1.15,
  giantrat: 1.25,
  direrat: 1.55,
  slime: 1.05,
  gargoyle: 1.7,
  wisp: 0.85,
  imp: 1.1,
  slayer: 2.05,
  assassin: 1.9,
  legionnaire: 2.15,
  archdemon: 2.55,
  spider: 0.85,
  cultist: 1.75,
  sprig: 1.45,
  whelp: 1.55,
  wyvern: 1.75,
  drake: 1.35,
  dragon: 2.35,
  wyrm: 2.85,
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
    case "skeleton":
      buildSkeleton(root);
      break;
    case "zombie":
      buildZombie(root, "male");
      break;
    case "zombieF":
      buildZombie(root, "female");
      break;
    case "wolf":
      buildDireWolf(root, "male");
      break;
    case "wolfF":
      buildDireWolf(root, "female");
      break;
    case "rat":
      buildBrownRat(root);
      break;
    case "roofrat":
      buildRoofRat(root);
      break;
    case "packrat":
      buildPackRat(root);
      break;
    case "giantrat":
      buildGiantRat(root);
      break;
    case "direrat":
      buildDireRat(root);
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
    case "slayer":
      buildSlayer(root);
      break;
    case "assassin":
      buildAssassin(root);
      break;
    case "legionnaire":
      buildLegionnaire(root);
      break;
    case "archdemon":
      buildArchdemon(root);
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
    case "wyvern":
      buildWyvern(root);
      break;
    case "drake":
      buildDrake(root);
      break;
    case "dragon":
      buildTrueDragon(root);
      break;
    case "wyrm":
      buildAncientWyrm(root);
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
      root.add(part("Body", capsule(0.25, 0.7, 10, 16), mat(0x8a7a6a), 0.6));
  }
  plantFeet(root, height);
  return root;
}

/**
 * Ward Skeleton (U-SKEL-001) — front A-pose + side spinal curve from the undead schematic.
 * Integrity ~78%, reanimation active; optic sockets empty.
 */
function buildSkeleton(root: THREE.Group): void {
  const bone = mat(0xd8ccb4, 0.06, 0.52);
  bone.clearcoat = 0.18;
  const dark = mat(0x9a8a72, 0.08, 0.6);
  const voidEye = mat(0x0c0a08, 0.02, 0.85);

  // Skull — reduced cranial density
  const skull = part("Skull", sphere(0.15, 16, 12), bone, 1.62);
  skull.scale.set(0.95, 1.05, 1.1);
  root.add(skull);
  const brow = part("Brow", roundBox(0.16, 0.04, 0.06, 1), dark, 1.68);
  brow.position.z = 0.1;
  root.add(brow);
  const jaw = part("Mandible", roundBox(0.13, 0.055, 0.11, 2), dark, 1.46);
  jaw.position.set(0.025, 0, 0.05); // fractured offset
  jaw.rotation.z = 0.1;
  root.add(jaw);
  for (const side of [-1, 1]) {
    const socket = part(side < 0 ? "SocketL" : "SocketR", sphere(0.038, 8, 6), voidEye, 1.64);
    socket.position.set(side * 0.065, 0.015, 0.125);
    root.add(socket);
  }

  // Cervical C1–C7 (slight forward neck from side elevation)
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const v = part(`C${i + 1}`, cylinder(0.032, 0.038, 0.038, 7), bone, 1.52 - i * 0.032);
    v.position.z = -0.02 + t * 0.03;
    root.add(v);
  }

  // Clavicles + scapulae (dense shoulder mesh zone)
  for (const side of [-1, 1]) {
    const clav = part("Clavicle", capsule(0.022, 0.2, 4, 6), bone, 1.26);
    clav.position.set(side * 0.13, 0, 0.04);
    clav.rotation.z = side * 0.18;
    clav.rotation.y = side * -0.1;
    root.add(clav);
    const scap = part("Scapula", roundBox(0.1, 0.14, 0.03, 2), dark, 1.18);
    scap.position.set(side * 0.16, 0, -0.08);
    scap.rotation.y = side * 0.35;
    root.add(scap);
    const joint = part("ShoulderJoint", sphere(0.045, 10, 8), bone, 1.2);
    joint.position.set(side * 0.24, 0, 0.02);
    root.add(joint);
  }

  // Ribcage — barrel from side elevation
  for (let i = 0; i < 7; i++) {
    const y = 1.16 - i * 0.07;
    const w = 0.2 - i * 0.012;
    const depth = 0.04 + Math.sin((i / 6) * Math.PI) * 0.03;
    for (const side of [-1, 1]) {
      const rib = part("Rib", torus(w, 0.011, 4, 12, Math.PI * 0.9), bone, y);
      rib.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      rib.rotation.z = side * 0.12;
      rib.position.z = depth;
      root.add(rib);
    }
  }
  // Sternum
  root.add(part("Sternum", capsule(0.02, 0.28, 4, 6), dark, 1.05));

  // Thoracic + lumbar spine with slight lordosis (side curve)
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const v = part(`Spine${i + 1}`, cylinder(0.028, 0.034, 0.048, 6), i % 2 ? bone : dark, 1.12 - i * 0.048);
    v.position.z = Math.sin(t * Math.PI) * -0.04;
    root.add(v);
  }

  // Pelvis
  root.add(part("Pelvis", roundBox(0.3, 0.13, 0.18, 2), bone, 0.62));
  for (const side of [-1, 1]) {
    const ilium = part("Ilium", roundBox(0.1, 0.12, 0.08, 2), dark, 0.68);
    ilium.position.set(side * 0.12, 0, -0.02);
    root.add(ilium);
  }

  // Arms in slight A-pose (abducted)
  for (const side of [-1, 1]) {
    const ax = side * 0.28;
    const humerus = part("Humerus", capsule(0.032, 0.3, 5, 8), bone, 1.0);
    humerus.position.set(ax, 0, 0.02);
    humerus.rotation.z = side * 0.22;
    root.add(humerus);
    const elbow = part("Elbow", sphere(0.035, 8, 6), dark, 0.78);
    elbow.position.set(side * 0.34, 0, 0.03);
    root.add(elbow);
    const radius = part("Radius", capsule(0.022, 0.24, 4, 6), bone, 0.58);
    radius.position.set(side * 0.38, 0, 0.04);
    radius.rotation.z = side * 0.18;
    root.add(radius);
    const ulna = part("Ulna", capsule(0.018, 0.24, 4, 6), dark, 0.58);
    ulna.position.set(side * 0.36, 0, 0.01);
    ulna.rotation.z = side * 0.18;
    root.add(ulna);
    const palm = part("Palm", roundBox(0.055, 0.025, 0.045, 1), bone, 0.42);
    palm.position.set(side * 0.42, 0, 0.05);
    root.add(palm);
    for (let f = 0; f < 4; f++) {
      const ph = part("Phalanx", capsule(0.009, 0.055, 3, 4), bone, 0.36);
      ph.position.set(side * 0.42 + (f - 1.5) * 0.016, 0, 0.08);
      root.add(ph);
    }
  }

  // Legs — femur / tibia / fibula / foot phalanges
  for (const side of [-1, 1]) {
    const hip = part("HipJoint", sphere(0.05, 10, 8), dark, 0.55);
    hip.position.set(side * 0.11, 0, 0);
    root.add(hip);
    const femur = part("Femur", capsule(0.042, 0.34, 5, 8), bone, 0.38);
    femur.position.set(side * 0.11, 0, 0.01);
    root.add(femur);
    const knee = part("Knee", sphere(0.04, 8, 6), dark, 0.2);
    knee.position.set(side * 0.11, 0, 0.02);
    root.add(knee);
    const tibia = part("Tibia", capsule(0.032, 0.3, 5, 8), bone, 0.05);
    tibia.position.set(side * 0.11, 0, 0.025);
    root.add(tibia);
    const fibula = part("Fibula", capsule(0.018, 0.28, 4, 6), dark, 0.05);
    fibula.position.set(side * 0.13, 0, -0.015);
    root.add(fibula);
    const foot = part("Foot", roundBox(0.075, 0.035, 0.17, 1), bone, 0.02);
    foot.position.set(side * 0.11, 0, 0.07);
    root.add(foot);
    for (let t = 0; t < 3; t++) {
      const toe = part("ToePhalanx", capsule(0.009, 0.04, 3, 4), dark, 0.02);
      toe.position.set(side * 0.11 + (t - 1) * 0.02, 0, 0.15);
      root.add(toe);
    }
  }
}

/** Zombie specimens — male shambler / female asymmetrical desiccated form. */
function buildZombie(root: THREE.Group, sex: "male" | "female"): void {
  const flesh = mat(sex === "female" ? 0x7a8a6a : 0x6a7a58, 0.04, 0.82, 0x2a3018, 0.12);
  const rot = mat(0x4a3a28, 0.05, 0.88);
  const bone = mat(0xc8bca0, 0.08, 0.55);
  const cloth = mat(sex === "female" ? 0x3a2a38 : 0x2a2820, 0.02, 0.92);
  const rag = mat(0x4a4030, 0.03, 0.9);
  const eye = mat(0x3a2010, 0.1, 0.5, 0x5a2810, 0.25);

  const female = sex === "female";
  const torsoW = female ? 0.34 : 0.42;
  const torsoH = female ? 0.48 : 0.55;
  const lean = female ? 0.06 : 0.1; // slumped / asymmetrical

  // Torso with exposed rib hint
  root.add(part("Torso", roundBox(torsoW, torsoH, 0.26, 3), flesh, female ? 1.15 : 1.2));
  root.add(part("Rags", roundBox(torsoW * 1.05, torsoH * 0.55, 0.28, 2), cloth, female ? 1.05 : 1.1));
  // Visible skeletal structure inside
  for (let i = 0; i < 4; i++) {
    const rib = part("RibBone", torus(0.1 - i * 0.01, 0.012, 4, 8, Math.PI), bone, (female ? 1.25 : 1.3) - i * 0.08);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(lean * 0.5, 0, 0.08);
    root.add(rib);
  }
  if (female) {
    for (const side of [-1, 1]) {
      const breast = part("Breast", sphere(0.07, 8, 6), flesh, 1.28);
      breast.scale.set(1, 0.75, 0.8);
      breast.position.set(side * 0.08 + lean, 0, 0.12);
      root.add(breast);
    }
    // Bite mark on shoulder
    const bite = part("BiteMark", sphere(0.04, 8, 6), rot, 1.35);
    bite.position.set(-0.18, 0, 0.1);
    root.add(bite);
  } else {
    const gut = part("GutTear", sphere(0.08, 8, 6), rot, 1.0);
    gut.position.set(0.06, 0, 0.12);
    root.add(gut);
  }

  // Head — neural decay, tilted
  const headY = female ? 1.52 : 1.58;
  const skull = part("Head", sphere(female ? 0.14 : 0.155, 14, 12), flesh, headY);
  skull.position.set(lean * (female ? 1.5 : 1), 0, 0.02);
  root.add(skull);
  const jaw = part("Mandible", roundBox(0.1, 0.05, 0.08, 1), bone, headY - 0.12);
  jaw.position.set(lean + 0.02, 0, 0.06);
  jaw.rotation.z = female ? -0.15 : 0.12;
  root.add(jaw);
  for (const side of [-1, 1]) {
    const e = part(side < 0 ? "EyeL" : "EyeR", sphere(0.025, 8, 6), eye, headY + 0.02);
    e.position.set(side * 0.06 + lean, 0.01, 0.12);
    root.add(e);
  }
  // Sparse necrotic hair / scalp
  if (female) {
    const hair = part("Hair", sphere(0.15, 10, 8), rot, headY + 0.06);
    hair.scale.set(1, 0.5, 1.1);
    hair.position.set(lean * 1.5, 0, -0.02);
    root.add(hair);
  }

  // Arms — decayed clavicle side droops lower
  for (const side of [-1, 1]) {
    const droop = side < 0 ? (female ? 0.18 : 0.12) : female ? 0.05 : 0.08;
    const upper = part("ArmU", capsule(female ? 0.045 : 0.055, female ? 0.32 : 0.36, 6, 8), flesh, 1.15 - droop);
    upper.position.set(side * (torsoW * 0.55) + lean, 0, 0.02);
    root.add(upper);
    const lower = part("ArmL", capsule(female ? 0.04 : 0.048, female ? 0.28 : 0.3, 5, 8), flesh, 0.85 - droop);
    lower.position.set(side * (torsoW * 0.6) + lean, 0, 0.04);
    root.add(lower);
    const hand = part("Hand", sphere(female ? 0.04 : 0.05, 8, 6), rot, 0.65 - droop);
    hand.position.set(side * (torsoW * 0.62) + lean, 0, 0.05);
    root.add(hand);
  }

  // Hips / tattered pants
  const hipW = female ? 0.38 : 0.36;
  root.add(part("Pelvis", roundBox(hipW, 0.14, 0.22, 2), flesh, 0.82));
  root.add(part("Pants", roundBox(hipW * 1.05, 0.28, 0.24, 2), rag, 0.7));

  // Legs — impaired / asymmetrical gait (one shorter pose)
  for (const side of [-1, 1]) {
    const limp = female ? (side < 0 ? 0.08 : 0) : side > 0 ? 0.06 : 0;
    const thigh = part("Femur", capsule(female ? 0.06 : 0.07, 0.32, 6, 8), flesh, 0.55 - limp * 0.3);
    thigh.position.set(side * 0.1 + lean * 0.3, 0, limp * 0.5);
    root.add(thigh);
    const shin = part("Tibia", capsule(female ? 0.05 : 0.058, 0.3, 5, 8), flesh, 0.25 - limp * 0.2);
    shin.position.set(side * 0.1 + lean * 0.3, 0, limp);
    root.add(shin);
    const foot = part("Foot", roundBox(0.09, 0.05, 0.16, 1), rot, 0.04);
    foot.position.set(side * 0.1 + lean * 0.3, 0, 0.04 + limp);
    root.add(foot);
  }
}

/**
 * Dire wolf canine kit — DW-SPEC-M/F-001.
 * Male: robust cranium + high occipital crest. Female: leaner, symmetrical gait.
 */
function buildDireWolf(root: THREE.Group, sex: "male" | "female"): void {
  const male = sex === "male";
  const fur = mat(male ? 0x4a3a30 : 0x6a5848, 0.04, 0.9);
  const dark = mat(0x1e1612, 0.05, 0.85);
  const fang = mat(0xe8e0d4, 0.2, 0.32);
  const eye = mat(0xffaa33, 0.15, 0.3, 0xff8800, 0.55);
  const pad = mat(0x2a1a14, 0.05, 0.8);

  const s = male ? 1.08 : 0.92;
  const chestY = 0.58 * s;
  root.add(part("Chest", capsule(0.28 * s, 0.5 * s, 12, 16), fur, chestY));
  const haunch = part("Haunch", sphere(0.3 * s, 16, 12), fur, 0.52 * s);
  haunch.position.z = -0.32 * s;
  root.add(haunch);
  const belly = part("Belly", sphere(0.18 * s, 12, 10), dark, 0.42 * s);
  belly.position.z = -0.05;
  root.add(belly);

  // Cranium — male occipital crest high
  const headY = 0.95 * s;
  const skull = part("Cranium", sphere(0.2 * s, 16, 12), fur, headY);
  skull.scale.set(1, male ? 1.1 : 1.0, 1.15);
  skull.position.z = 0.28 * s;
  root.add(skull);
  if (male) {
    const crest = part("OccipitalCrest", cone(0.06 * s, 0.14 * s, 6), dark, headY + 0.14 * s);
    crest.position.set(0, 0, 0.2 * s);
    crest.rotation.x = -0.6;
    root.add(crest);
  }
  const snout = part("Mandible", capsule(0.08 * s, 0.22 * s, 6, 10), dark, headY - 0.06 * s);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0, 0.52 * s);
  root.add(snout);
  // Canine arrays / predator dentition
  for (const side of [-1, 1]) {
    const fangL = part("Canine", cone(0.025 * s, 0.1 * s, 6), fang, headY - 0.1 * s);
    fangL.position.set(side * 0.05 * s, 0, 0.62 * s);
    fangL.rotation.x = Math.PI * 0.85;
    root.add(fangL);
    const ear = part("Ear", cone(0.05 * s, 0.16 * s, 7), dark, headY + 0.16 * s);
    ear.position.set(side * 0.12 * s, 0, 0.22 * s);
    ear.rotation.z = side * -0.4;
    root.add(ear);
    const e = part(side < 0 ? "EyeL" : "EyeR", sphere(0.032 * s, 10, 8), eye, headY + 0.02 * s);
    e.position.set(side * 0.1 * s, 0.02, 0.42 * s);
    root.add(e);
  }

  // Cervical flex hint
  for (let i = 0; i < 3; i++) {
    const v = part(`C${i + 1}`, cylinder(0.04 * s, 0.045 * s, 0.05 * s, 6), dark, 0.82 * s - i * 0.04);
    v.position.z = 0.18 * s - i * 0.02;
    root.add(v);
  }

  // Scapula / powerful forelimb mounts + digitigrade legs
  for (const side of [-1, 1]) {
    const scap = part("Scapula", roundBox(0.1 * s, 0.14 * s, 0.06 * s, 2), dark, 0.7 * s);
    scap.position.set(side * 0.2 * s, 0, 0.12 * s);
    root.add(scap);

    for (const [z, fore] of [
      [0.2 * s, true],
      [-0.28 * s, false],
    ] as const) {
      const thick = fore ? 0.07 * s : 0.075 * s;
      const thigh = part(fore ? "Forelimb" : "Femur", capsule(thick, 0.22 * s, 6, 10), fur, 0.4 * s);
      thigh.position.set(side * 0.18 * s, 0, z);
      root.add(thigh);
      const hock = part("Hock", sphere(thick * 0.9, 8, 6), dark, 0.22 * s);
      hock.position.set(side * 0.18 * s, 0, z + (fore ? 0.04 : -0.04));
      root.add(hock);
      const meta = part("Digitigrade", capsule(thick * 0.65, 0.14 * s, 5, 8), fur, 0.12 * s);
      meta.position.set(side * 0.18 * s, 0, z + (fore ? 0.08 : -0.08));
      root.add(meta);
      // Paw + claw mesh detail
      const paw = part("Paw", roundBox(0.1 * s, 0.05 * s, 0.14 * s, 2), pad, 0.04);
      paw.position.set(side * 0.18 * s, 0, z + (fore ? 0.12 : -0.12));
      root.add(paw);
      for (let c = 0; c < 4; c++) {
        const claw = part("Claw", cone(0.015 * s, 0.07 * s, 5), fang, 0.04);
        claw.rotation.x = Math.PI / 2;
        claw.position.set(side * 0.18 * s + (c - 1.5) * 0.025 * s, 0, z + (fore ? 0.2 : -0.2));
        root.add(claw);
      }
    }
  }

  const mane = part("Mane", sphere(0.22 * s, 12, 10), dark, 0.75 * s);
  mane.position.set(0, 0.04, 0.08 * s);
  mane.scale.set(1.15, 0.65, 1.0);
  root.add(mane);

  // Tail
  let tz = -0.48 * s;
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const seg = part(`Tail${i}`, capsule(0.05 * s * (1 - t * 0.4), 0.12 * s, 4, 8), i % 2 ? fur : dark, 0.55 * s + t * 0.04);
    seg.position.set(0, 0, tz);
    seg.rotation.x = 0.45 + t * 0.2;
    root.add(seg);
    tz -= 0.11 * s;
  }
}

/** Shared Muridae palette — brown fur, pink extremities, dark eyes. */
function ratMats(tint = 0x6a4a38): { fur: Surf; dark: Surf; pink: Surf; fang: Surf; eye: Surf; core: Surf } {
  return {
    fur: mat(tint, 0.04, 0.9),
    dark: mat(0x2a1e18, 0.05, 0.85),
    pink: mat(0xc48a7a, 0.05, 0.7),
    fang: mat(0xe8e0d4, 0.15, 0.35),
    eye: mat(0x1a120c, 0.2, 0.4),
    core: mat(0xc05040, 0.1, 0.4, 0x801818, 0.45),
  };
}

function addRatHead(
  root: THREE.Group,
  fur: Surf,
  dark: Surf,
  pink: Surf,
  fang: Surf,
  eye: Surf,
  y: number,
  size: number,
  earSpread = 1,
): void {
  root.add(part("Head", sphere(size, 16, 12), fur, y));
  const snout = part("Snout", capsule(size * 0.4, size * 0.7, 5, 8), pink, y - size * 0.1);
  snout.rotation.x = Math.PI / 2;
  snout.position.z = size * 0.85;
  root.add(snout);
  for (const side of [-1, 1]) {
    const ear = part("Ear", sphere(size * 0.45, 10, 8), pink, y + size * 0.55);
    ear.scale.set(0.55, 1, 0.2);
    ear.position.set(side * size * 0.75 * earSpread, 0, -size * 0.1);
    ear.rotation.z = side * -0.35;
    root.add(ear);
    const e = part(side < 0 ? "EyeL" : "EyeR", sphere(size * 0.16, 8, 6), eye, y + size * 0.1);
    e.position.set(side * size * 0.4, 0.02, size * 0.65);
    root.add(e);
    const tooth = part("Incisor", new THREE.BoxGeometry(size * 0.12, size * 0.35, size * 0.1), fang, y - size * 0.35);
    tooth.position.set(side * size * 0.12, 0, size * 1.15);
    root.add(tooth);
  }
  // Whiskers
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const w = part("Whisker", capsule(0.008, size * 0.55, 2, 4), dark, y - size * 0.05);
      w.position.set(side * size * 0.5, i * size * 0.12, size * 0.9);
      w.rotation.z = side * (0.9 + i * 0.2);
      root.add(w);
    }
  }
}

function addPrehensileTail(
  root: THREE.Group,
  pink: Surf,
  dark: Surf,
  hipY: number,
  segs: number,
  thick: number,
  curl = 0.45,
): void {
  let z = -0.16;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    const seg = part(`Tail${i}`, capsule(thick * (1 - t * 0.55), 0.12 - t * 0.015, 4, 6), i % 2 ? pink : dark, hipY + t * 0.04);
    seg.position.set(Math.sin(t * 1.2) * thick * 0.8, 0, z);
    seg.rotation.x = curl + t * 0.25;
    root.add(seg);
    z -= 0.1 - t * 0.01;
  }
}

/** Urban Brown Rat — agile bipedal stance. */
function buildBrownRat(root: THREE.Group): void {
  const { fur, dark, pink, fang, eye, core } = ratMats(0x6a4a38);
  root.add(part("Torso", capsule(0.18, 0.38, 10, 12), fur, 0.65));
  root.add(part("Belly", sphere(0.12, 10, 8), pink, 0.58));
  root.add(part("Heart", sphere(0.05, 8, 6), core, 0.68));
  addRatHead(root, fur, dark, pink, fang, eye, 0.98, 0.16);
  addDemonArms(root, fur, dark, pink, 0.75, 0.32, 0.04, 0.2);
  addDigitigradeLegs(root, fur, dark, pink, 0.42, 0.42, 0.05, 0.1);
  addPrehensileTail(root, pink, dark, 0.5, 5, 0.035, 0.55);
}

/** Agile Roof Rat — low quadruped skitter. */
function buildRoofRat(root: THREE.Group): void {
  const { fur, dark, pink, fang, eye } = ratMats(0x5a4030);
  root.add(part("Body", capsule(0.14, 0.38, 10, 12), fur, 0.28));
  const haunch = part("Haunch", sphere(0.14, 12, 10), fur, 0.26);
  haunch.position.z = -0.18;
  root.add(haunch);
  addRatHead(root, fur, dark, pink, fang, eye, 0.42, 0.12, 1.1);
  for (const side of [-1, 1]) {
    for (const [z, y] of [
      [0.14, 0.2],
      [-0.16, 0.18],
    ] as const) {
      const leg = part("Leg", capsule(0.035, 0.14, 5, 8), fur, y);
      leg.position.set(side * 0.12, 0, z);
      root.add(leg);
      const paw = part("Paw", sphere(0.04, 8, 6), pink, 0.06);
      paw.position.set(side * 0.12, 0, z + (z > 0 ? 0.04 : -0.04));
      root.add(paw);
    }
  }
  addPrehensileTail(root, pink, dark, 0.28, 6, 0.028, 0.7);
}

/** Decorator Pack Rat — biped with scavenged armor mounts. */
function buildPackRat(root: THREE.Group): void {
  const { fur, dark, pink, fang, eye, core } = ratMats(0x7a5a40);
  const scrap = mat(0x6a6a58, 0.45, 0.45);
  root.add(part("Torso", capsule(0.2, 0.42, 10, 12), fur, 0.72));
  root.add(part("Belly", sphere(0.13, 10, 8), pink, 0.64));
  root.add(part("Heart", sphere(0.05, 8, 6), core, 0.74));
  // Integrated armor mounts (gnome-sim scavenged plates)
  for (let i = 0; i < 3; i++) {
    const plate = part(`Scrap${i}`, roundBox(0.22 - i * 0.02, 0.06, 0.14, 2), scrap, 0.85 - i * 0.12);
    plate.position.z = 0.12;
    root.add(plate);
  }
  // Segmented decorator appendages — junk strapped to the back
  for (const side of [-1, 1]) {
    const pouch = part("Pouch", roundBox(0.1, 0.14, 0.12, 2), dark, 0.78);
    pouch.position.set(side * 0.18, 0, -0.12);
    root.add(pouch);
  }
  addRatHead(root, fur, dark, pink, fang, eye, 1.08, 0.15);
  addDemonArms(root, fur, dark, pink, 0.82, 0.34, 0.042, 0.22);
  addDigitigradeLegs(root, fur, dark, pink, 0.48, 0.45, 0.055, 0.11);
  addPrehensileTail(root, pink, dark, 0.55, 5, 0.038, 0.5);
}

/** Titan Giant Rat — bulky quadruped. */
function buildGiantRat(root: THREE.Group): void {
  const { fur, dark, pink, fang, eye, core } = ratMats(0x5a3828);
  root.add(part("Chest", capsule(0.35, 0.55, 12, 14), fur, 0.7));
  const haunch = part("Haunch", sphere(0.38, 16, 12), fur, 0.62);
  haunch.position.z = -0.35;
  root.add(haunch);
  root.add(part("Belly", sphere(0.24, 12, 10), pink, 0.5));
  root.add(part("Heart", sphere(0.09, 10, 8), core, 0.68));
  addRatHead(root, fur, dark, pink, fang, eye, 1.05, 0.26, 0.95);
  for (const side of [-1, 1]) {
    for (const [z, y] of [
      [0.22, 0.45],
      [-0.32, 0.4],
    ] as const) {
      const thigh = part("Leg", capsule(0.09, 0.28, 6, 10), fur, y);
      thigh.position.set(side * 0.24, 0, z);
      root.add(thigh);
      const paw = part("Paw", roundBox(0.16, 0.08, 0.2, 2), pink, 0.1);
      paw.position.set(side * 0.24, 0, z + (z > 0 ? 0.06 : -0.06));
      root.add(paw);
      for (let t = 0; t < 3; t++) {
        const claw = part("Claw", cone(0.02, 0.07, 5), fang, 0.08);
        claw.rotation.x = Math.PI / 2;
        claw.position.set(side * 0.24 + (t - 1) * 0.04, 0, z + (z > 0 ? 0.16 : -0.16));
        root.add(claw);
      }
    }
  }
  addPrehensileTail(root, pink, dark, 0.55, 6, 0.06, 0.4);
}

/** Elite Abyssal Dire Rat — corrupted biped elite. */
function buildDireRat(root: THREE.Group): void {
  const { fur, dark, pink, fang } = ratMats(0x3a2430);
  const eye = mat(0xff4466, 0.15, 0.35, 0xff2244, 0.7);
  const core = mat(0x882040, 0.15, 0.35, 0x601028, 0.85);
  root.add(part("Torso", roundBox(0.42, 0.55, 0.32, 3), fur, 0.95));
  root.add(part("Belly", sphere(0.16, 12, 10), pink, 0.85));
  root.add(part("CorruptCore", new THREE.OctahedronGeometry(0.09, 0), core, 0.95));
  addRatHead(root, fur, dark, pink, fang, eye, 1.4, 0.22, 1.05);
  // Longer dire fangs
  for (const side of [-1, 1]) {
    const fangL = part("DireFang", cone(0.03, 0.14, 6), fang, 1.22);
    fangL.position.set(side * 0.06, 0, 0.32);
    fangL.rotation.x = Math.PI * 0.85;
    root.add(fangL);
  }
  addDemonArms(root, fur, dark, fang, 1.05, 0.5, 0.065, 0.28);
  addDigitigradeLegs(root, fur, dark, fang, 0.6, 0.6, 0.075, 0.14);
  addPrehensileTail(root, pink, dark, 0.7, 6, 0.05, 0.6);
  // Spine ridges
  for (let i = 0; i < 4; i++) {
    const spike = part("Spine", cone(0.03, 0.12, 5), dark, 1.15 - i * 0.1);
    spike.position.z = -0.16;
    spike.rotation.x = -0.5;
    root.add(spike);
  }
}

function buildSlime(root: THREE.Group): void {
  const goo = mat(0x4ecf7a, 0.02, 0.22, 0x1a8a40, 0.4);
  goo.transmission = 0.35;
  goo.thickness = 0.6;
  goo.transparent = true;
  goo.opacity = 0.92;
  root.add(part("Blob", sphere(0.48, 28, 22), goo, 0.42));
  root.add(part("Cap", sphere(0.32, 20, 16), goo, 0.72));
  const core = mat(0xa8ffc0, 0.05, 0.3, 0x60ff90, 0.55);
  root.add(part("Core", sphere(0.14, 14, 12), core, 0.5));
  const eye = mat(0x101808, 0.25, 0.35);
  for (const side of [-1, 1]) {
    const e = part("Eye", sphere(0.07, 12, 10), eye, 0.58);
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
    const horn = part("Horn", cone(0.06, 0.28, 10), dark, 1.78);
    horn.position.set(side * 0.14, 0, -0.02);
    horn.rotation.z = side * -0.45;
    root.add(horn);
    const wing = part("Wing", roundBox(0.07, 0.65, 0.85, 3), dark, 1.2);
    wing.position.set(side * 0.42, 0, -0.12);
    wing.rotation.z = side * 0.5;
    wing.rotation.y = side * -0.25;
    root.add(wing);
    const arm = part("Arm", capsule(0.08, 0.4, 8, 12), stone, 1.05);
    arm.position.set(side * 0.38, 0, 0.05);
    root.add(arm);
    const claw = part("Claw", cone(0.05, 0.16, 8), dark, 0.78);
    claw.position.set(side * 0.4, 0, 0.12);
    claw.rotation.x = Math.PI;
    root.add(claw);
    const leg = part("Leg", capsule(0.1, 0.4, 8, 12), stone, 0.38);
    leg.position.x = side * 0.18;
    root.add(leg);
  }
}

function buildWisp(root: THREE.Group): void {
  const core = mat(0xffa45a, 0.08, 0.28, 0xff6a28, 1.2);
  root.add(part("Core", sphere(0.2, 22, 18), core, 0.75));
  const haze = mat(0xffc090, 0.02, 0.55, 0xff8a40, 0.45);
  haze.transparent = true;
  haze.opacity = 0.55;
  haze.depthWrite = false;
  root.add(part("Haze", sphere(0.42, 18, 14), haze, 0.75));
  for (let i = 0; i < 5; i++) {
    const spark = part("Spark", sphere(0.04, 10, 8), core, 0.75);
    const a = (i / 5) * Math.PI * 2;
    spark.position.set(Math.cos(a) * 0.32, Math.sin(a * 1.3) * 0.12, Math.sin(a) * 0.32);
    root.add(spark);
  }
}

/** Shared demon palette — ash-crimson hide, bone horn, ember core. */
function demonMats(tint = 0x8a2a22): { hide: Surf; dark: Surf; horn: Surf; glow: Surf; claw: Surf } {
  return {
    hide: mat(tint, 0.16, 0.58, 0x3a0808, 0.22),
    dark: mat(0x2a1410, 0.2, 0.65),
    horn: mat(0x1a120c, 0.4, 0.38),
    glow: mat(0xff5520, 0.1, 0.32, 0xff3300, 0.9),
    claw: mat(0xc4a060, 0.35, 0.4),
  };
}

function addDemonEyes(root: THREE.Group, glow: Surf, y: number, z: number, spread: number, r = 0.035): void {
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeL" : "EyeR", sphere(r, 10, 8), glow, y);
    eye.position.set(side * spread, 0.02, z);
    root.add(eye);
  }
}

function addDemonHorns(
  root: THREE.Group,
  horn: Surf,
  y: number,
  spread: number,
  size: number,
  curl = 0.55,
  count = 1,
): void {
  for (let i = 0; i < count; i++) {
    const lift = i * size * 0.55;
    for (const side of [-1, 1]) {
      const h = part("Horn", cone(size * 0.22, size, 8), horn, y + lift);
      h.position.set(side * (spread + i * 0.04), 0, -0.02 - i * 0.03);
      h.rotation.z = side * -curl;
      h.rotation.x = -0.3 - i * 0.1;
      root.add(h);
    }
  }
}

function addBatWings(
  root: THREE.Group,
  hide: Surf,
  dark: Surf,
  y: number,
  span: number,
  height: number,
  thick = 0.04,
): void {
  for (const side of [-1, 1]) {
    const rootBone = part("WingRoot", capsule(thick * 1.2, height * 0.35, 6, 8), dark, y);
    rootBone.position.set(side * span * 0.35, 0, -0.06);
    rootBone.rotation.z = side * 0.85;
    root.add(rootBone);
    const membrane = part("WingMem", roundBox(thick, height, span, 3), hide, y + height * 0.05);
    membrane.position.set(side * span * 0.55, 0, -0.1);
    membrane.rotation.z = side * 0.55;
    membrane.rotation.y = side * -0.2;
    root.add(membrane);
    // Segmented wing actuators
    for (let i = 0; i < 3; i++) {
      const spar = part("WingSpar", capsule(thick * 0.5, height * 0.55, 4, 6), dark, y);
      spar.position.set(side * (span * 0.35 + i * span * 0.12), height * 0.08, -0.08 - i * 0.02);
      spar.rotation.z = side * (0.7 + i * 0.15);
      root.add(spar);
    }
  }
}

function addDigitigradeLegs(
  root: THREE.Group,
  hide: Surf,
  dark: Surf,
  claw: Surf,
  hipY: number,
  length: number,
  thick: number,
  stance: number,
): void {
  for (const side of [-1, 1]) {
    const thigh = part("Thigh", capsule(thick * 1.15, length * 0.35, 6, 10), hide, hipY - length * 0.18);
    thigh.position.set(side * stance, 0, 0.02);
    root.add(thigh);
    const shin = part("Shin", capsule(thick * 0.9, length * 0.28, 6, 10), hide, hipY - length * 0.52);
    shin.position.set(side * stance, 0, 0.1);
    root.add(shin);
    const hock = part("Hock", sphere(thick * 0.95, 8, 6), dark, hipY - length * 0.72);
    hock.position.set(side * stance, 0, 0.14);
    root.add(hock);
    const meta = part("Meta", capsule(thick * 0.65, length * 0.14, 5, 8), hide, hipY - length * 0.88);
    meta.position.set(side * stance, 0, 0.2);
    root.add(meta);
    const foot = part("Foot", roundBox(thick * 2.2, thick * 0.7, thick * 2.8, 2), dark, hipY - length - thick * 0.2);
    foot.position.set(side * stance, 0, 0.28);
    root.add(foot);
    for (let t = 0; t < 3; t++) {
      const talon = part("Talon", cone(thick * 0.22, thick * 0.9, 5), claw, hipY - length - thick * 0.1);
      talon.rotation.x = Math.PI / 2;
      talon.position.set(side * stance + (t - 1) * thick * 0.7, 0, 0.42);
      root.add(talon);
    }
  }
}

function addDemonArms(
  root: THREE.Group,
  hide: Surf,
  dark: Surf,
  claw: Surf,
  shoulderY: number,
  length: number,
  thick: number,
  spread: number,
  zOff = 0.04,
  namePrefix = "",
): void {
  for (const side of [-1, 1]) {
    const upper = part(`${namePrefix}ArmU`, capsule(thick, length * 0.42, 6, 10), hide, shoulderY - length * 0.2);
    upper.position.set(side * spread, 0, zOff);
    root.add(upper);
    const lower = part(`${namePrefix}ArmL`, capsule(thick * 0.85, length * 0.36, 6, 10), hide, shoulderY - length * 0.58);
    lower.position.set(side * (spread + 0.02), 0, zOff + 0.04);
    root.add(lower);
    const hand = part(`${namePrefix}Hand`, sphere(thick * 1.15, 8, 6), dark, shoulderY - length * 0.88);
    hand.position.set(side * (spread + 0.04), 0, zOff + 0.06);
    root.add(hand);
    for (let i = 0; i < 3; i++) {
      const finger = part("Claw", cone(thick * 0.2, thick * 0.7, 5), claw, shoulderY - length * 1.05);
      finger.rotation.x = Math.PI;
      finger.position.set(side * (spread + 0.04) + (i - 1) * thick * 0.45, 0, zOff + 0.08);
      root.add(finger);
    }
  }
}

function addCaudalTail(
  root: THREE.Group,
  hide: Surf,
  tipMat: Surf,
  hipY: number,
  segs: number,
  thick: number,
  tip: "stinger" | "blade" | "club",
): void {
  let z = -0.18;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    const seg = part(`Tail${i}`, capsule(thick * (1 - t * 0.55), 0.14 - t * 0.02, 4, 8), hide, hipY - t * 0.08);
    seg.position.set(0, 0, z);
    seg.rotation.x = 0.55 + t * 0.35;
    root.add(seg);
    z -= 0.12 - t * 0.01;
  }
  if (tip === "stinger") {
    const sting = part("Stinger", cone(thick * 0.7, thick * 2.2, 6), tipMat, hipY - 0.12);
    sting.rotation.x = 1.2;
    sting.position.set(0, 0, z - 0.04);
    root.add(sting);
  } else if (tip === "blade") {
    const blade = part("TailBlade", roundBox(thick * 0.35, thick * 1.8, thick * 2.4, 2), tipMat, hipY - 0.1);
    blade.position.set(0, 0, z - 0.06);
    blade.rotation.x = 0.9;
    root.add(blade);
  } else {
    const club = part("TailClub", sphere(thick * 1.4, 10, 8), tipMat, hipY - 0.06);
    club.position.set(0, 0, z - 0.02);
    root.add(club);
  }
}

/** Swarm-class Imp — small, winged, stinger tail, digitigrade. */
function buildImp(root: THREE.Group): void {
  const { hide, dark, horn, glow, claw } = demonMats(0x9a3028);
  root.add(part("Torso", capsule(0.16, 0.32, 10, 14), hide, 0.62));
  root.add(part("Belly", sphere(0.09, 12, 10), glow, 0.58));
  root.add(part("Head", sphere(0.16, 16, 12), hide, 0.98));
  const snout = part("Snout", capsule(0.05, 0.08, 4, 8), dark, 0.92);
  snout.rotation.x = Math.PI / 2;
  snout.position.z = 0.14;
  root.add(snout);
  addDemonEyes(root, glow, 1.0, 0.13, 0.07, 0.03);
  addDemonHorns(root, horn, 1.16, 0.09, 0.2, 0.65);
  addBatWings(root, hide, dark, 0.72, 0.42, 0.32, 0.03);
  addDemonArms(root, hide, dark, claw, 0.72, 0.32, 0.045, 0.22);
  addDigitigradeLegs(root, hide, dark, claw, 0.42, 0.4, 0.05, 0.1);
  addCaudalTail(root, hide, horn, 0.48, 4, 0.035, "stinger");
}

/** Warrior-class Slayer — hulking, no wings, thick club tail. */
function buildSlayer(root: THREE.Group): void {
  const { hide, dark, horn, glow, claw } = demonMats(0x6a221c);
  root.add(part("Torso", roundBox(0.62, 0.72, 0.42, 4), hide, 1.25));
  root.add(part("Pec", roundBox(0.58, 0.28, 0.2, 3), hide, 1.45));
  root.add(part("Core", sphere(0.1, 12, 10), glow, 1.2));
  root.add(part("Head", sphere(0.22, 16, 12), hide, 1.82));
  const jaw = part("Jaw", roundBox(0.2, 0.08, 0.16, 2), dark, 1.68);
  jaw.position.z = 0.1;
  root.add(jaw);
  addDemonEyes(root, glow, 1.84, 0.18, 0.1, 0.038);
  addDemonHorns(root, horn, 2.05, 0.14, 0.32, 0.45);
  addDemonArms(root, hide, dark, claw, 1.45, 0.7, 0.09, 0.42);
  addDigitigradeLegs(root, hide, dark, claw, 0.85, 0.85, 0.1, 0.2);
  addCaudalTail(root, hide, dark, 0.95, 5, 0.07, "club");
}

/** Shadow-class Assassin — tall, lean, long wings. */
function buildAssassin(root: THREE.Group): void {
  const { hide, dark, horn, glow, claw } = demonMats(0x4a1828);
  root.add(part("Torso", capsule(0.2, 0.62, 10, 14), hide, 1.15));
  root.add(part("Head", sphere(0.17, 16, 12), hide, 1.7));
  addDemonEyes(root, glow, 1.72, 0.14, 0.08, 0.028);
  addDemonHorns(root, horn, 1.88, 0.1, 0.22, 0.75);
  addBatWings(root, hide, dark, 1.25, 0.7, 0.55, 0.035);
  addDemonArms(root, hide, dark, claw, 1.3, 0.58, 0.055, 0.28);
  addDigitigradeLegs(root, hide, dark, claw, 0.75, 0.72, 0.065, 0.14);
  addCaudalTail(root, hide, horn, 0.85, 5, 0.04, "blade");
}

/** Rank Legionnaire — plated gut, heavy claws, moderate bulk. */
function buildLegionnaire(root: THREE.Group): void {
  const { hide, dark, horn, glow, claw } = demonMats(0x7a2820);
  const plate = mat(0x3a2a22, 0.45, 0.4);
  root.add(part("Torso", roundBox(0.55, 0.7, 0.4, 4), hide, 1.3));
  for (let i = 0; i < 4; i++) {
    const band = part(`Plate${i}`, roundBox(0.5 - i * 0.04, 0.08, 0.36, 2), plate, 1.5 - i * 0.14);
    root.add(band);
  }
  root.add(part("Core", sphere(0.08, 10, 8), glow, 1.25));
  root.add(part("Head", sphere(0.2, 16, 12), hide, 1.85));
  addDemonEyes(root, glow, 1.87, 0.16, 0.09, 0.032);
  addDemonHorns(root, horn, 2.08, 0.12, 0.28, 0.4);
  // Crest helm spike
  const crest = part("Crest", cone(0.04, 0.22, 6), horn, 2.12);
  crest.position.z = -0.04;
  root.add(crest);
  addDemonArms(root, hide, dark, claw, 1.45, 0.65, 0.08, 0.38);
  addDigitigradeLegs(root, hide, dark, claw, 0.9, 0.88, 0.09, 0.18);
  addCaudalTail(root, hide, plate, 1.0, 4, 0.055, "blade");
}

/** Superior Archfiend — quad arms, crown horns, large wings, blade tail. */
function buildArchdemon(root: THREE.Group): void {
  const { hide, dark, horn, glow, claw } = demonMats(0x5a1818);
  root.add(part("Torso", roundBox(0.7, 0.85, 0.48, 4), hide, 1.55));
  root.add(part("Abs", roundBox(0.55, 0.35, 0.38, 3), hide, 1.15));
  for (let i = 0; i < 3; i++) {
    const rib = part(`AbPlate${i}`, roundBox(0.48 - i * 0.04, 0.06, 0.32, 2), dark, 1.25 - i * 0.1);
    root.add(rib);
  }
  root.add(part("DaemonHeart", new THREE.OctahedronGeometry(0.12, 0), glow, 1.45));
  root.add(part("Head", sphere(0.26, 18, 14), hide, 2.2));
  const brow = part("Brow", roundBox(0.28, 0.08, 0.14, 2), dark, 2.32);
  brow.position.z = 0.12;
  root.add(brow);
  addDemonEyes(root, glow, 2.22, 0.22, 0.12, 0.045);
  // Cranial spire complex
  addDemonHorns(root, horn, 2.48, 0.16, 0.42, 0.5, 2);
  const spire = part("Spire", cone(0.06, 0.38, 7), horn, 2.65);
  spire.position.z = -0.06;
  root.add(spire);
  addBatWings(root, hide, dark, 1.7, 1.05, 0.85, 0.05);
  // Primary + secondary arm banks
  addDemonArms(root, hide, dark, claw, 1.75, 0.85, 0.095, 0.48, 0.04, "Pri");
  addDemonArms(root, hide, dark, claw, 1.35, 0.72, 0.075, 0.42, 0.12, "Sec");
  addDigitigradeLegs(root, hide, dark, claw, 1.0, 1.0, 0.11, 0.22);
  addCaudalTail(root, hide, horn, 1.1, 6, 0.065, "blade");
}

function buildSpider(root: THREE.Group): void {
  const shell = mat(0x2e221c, 0.28, 0.42);
  shell.clearcoat = 0.7;
  const legMat = mat(0x1a120e, 0.2, 0.55);
  const fang = mat(0xc8b090, 0.2, 0.4);
  root.add(part("Abdomen", sphere(0.32, 20, 16), shell, 0.38));
  const ceph = part("Ceph", sphere(0.2, 18, 14), shell, 0.42);
  ceph.position.z = 0.28;
  root.add(ceph);
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const idx = i % 4;
    const a = (idx - 1.5) * 0.22;
    const upper = part("LegUpper", capsule(0.035, 0.28, 6, 10), legMat, 0.4);
    upper.position.set(side * 0.18, 0, a);
    upper.rotation.z = side * 1.05;
    upper.rotation.x = a * 0.4;
    root.add(upper);
    const lower = part("LegLower", capsule(0.028, 0.32, 6, 10), legMat, 0.18);
    lower.position.set(side * 0.42, 0, a * 1.1);
    lower.rotation.z = side * 0.35;
    root.add(lower);
  }
  for (const side of [-1, 1]) {
    const f = part("Fang", cone(0.035, 0.12, 8), fang, 0.35);
    f.position.set(side * 0.06, 0, 0.42);
    f.rotation.x = Math.PI * 0.65;
    root.add(f);
  }
  for (let i = 0; i < 6; i++) {
    const eye = part("Eye", sphere(0.03, 8, 6), mat(0xff2222, 0.2, 0.3, 0xff0000, 0.5), 0.48);
    eye.position.set(((i % 3) - 1) * 0.07, 0.06, 0.4 + Math.floor(i / 3) * 0.05);
    root.add(eye);
  }
}

function buildCultist(root: THREE.Group): void {
  const robe = mat(0x3a241c, 0.04, 0.82);
  const skin = mat(0xb89070, 0.05, 0.68);
  const metal = mat(0x8a7a5a, 0.55, 0.35);
  root.add(part("Robe", cone(0.38, 1.2, 16), robe, 0.58));
  root.add(part("Shoulders", roundBox(0.55, 0.18, 0.28, 3), robe, 1.15));
  root.add(part("Head", sphere(0.19, 16, 14), skin, 1.35));
  const hood = part("Hood", cone(0.24, 0.32, 12), robe, 1.55);
  hood.rotation.x = 0.25;
  root.add(hood);
  const mask = part("Mask", roundBox(0.2, 0.12, 0.08, 2), metal, 1.35);
  mask.position.z = 0.14;
  root.add(mask);
  const staff = part("Staff", cylinder(0.028, 0.04, 1.35, 10), mat(0x5a3a22, 0.1, 0.75), 0.75);
  staff.position.x = 0.32;
  root.add(staff);
  const orb = part("Orb", sphere(0.08, 14, 12), mat(0x8866ff, 0.2, 0.3, 0x6644ff, 0.7), 1.45);
  orb.position.set(0.32, 0, 0);
  root.add(orb);
}

function buildSprig(root: THREE.Group): void {
  const wood = mat(0x4a5a32, 0.05, 0.88);
  const leaf = mat(0x6ecf5a, 0.04, 0.55, 0x3a8a2a, 0.2);
  const bark = mat(0x3a2a18, 0.08, 0.9);
  root.add(part("Trunk", cylinder(0.11, 0.2, 1.0, 12), wood, 0.55));
  root.add(part("Knot", sphere(0.14, 12, 10), bark, 0.85));
  root.add(part("Crown", new THREE.IcosahedronGeometry(0.4, 1), leaf, 1.3));
  root.add(part("CrownB", new THREE.IcosahedronGeometry(0.28, 1), leaf, 1.5));
  for (const side of [-1, 1]) {
    const arm = part("Branch", capsule(0.05, 0.4, 8, 12), wood, 0.9);
    arm.position.x = side * 0.28;
    arm.rotation.z = side * 0.75;
    root.add(arm);
    const tuft = part("Tuft", new THREE.IcosahedronGeometry(0.12, 0), leaf, 1.05);
    tuft.position.set(side * 0.48, 0, 0);
    root.add(tuft);
  }
}

/** Shared draconic palette — scale, cream belly, bone horn, elemental core. */
function dragonMats(tint = 0xb84a2a): { scale: Surf; belly: Surf; horn: Surf; core: Surf; claw: Surf } {
  const scale = mat(tint, 0.28, 0.42, 0x4a1208, 0.2);
  scale.clearcoat = 0.4;
  return {
    scale,
    belly: mat(0xd4a86a, 0.06, 0.65),
    horn: mat(0x2a1810, 0.35, 0.42),
    core: mat(0xff6a28, 0.12, 0.3, 0xff4400, 0.95),
    claw: mat(0xc8a870, 0.4, 0.38),
  };
}

function addDragonWings(
  root: THREE.Group,
  scale: Surf,
  horn: Surf,
  y: number,
  span: number,
  height: number,
  fold = 0.55,
): void {
  for (const side of [-1, 1]) {
    const rootBone = part("WingRoot", capsule(0.045, height * 0.4, 6, 8), horn, y);
    rootBone.position.set(side * span * 0.28, 0, -0.08);
    rootBone.rotation.z = side * fold;
    root.add(rootBone);
    const membrane = part("WingMem", roundBox(0.04, height, span, 3), scale, y + height * 0.08);
    membrane.position.set(side * span * 0.55, 0, -0.12);
    membrane.rotation.z = side * (fold * 0.75);
    membrane.rotation.y = side * -0.18;
    root.add(membrane);
    for (let i = 0; i < 3; i++) {
      const spar = part("WingSpar", capsule(0.025, height * 0.6, 4, 6), horn, y);
      spar.position.set(side * (span * 0.32 + i * span * 0.14), height * 0.1, -0.1 - i * 0.02);
      spar.rotation.z = side * (fold * 0.85 + i * 0.12);
      root.add(spar);
    }
  }
}

function addDragonHead(
  root: THREE.Group,
  scale: Surf,
  belly: Surf,
  horn: Surf,
  core: Surf,
  y: number,
  size: number,
  spires = 1,
): void {
  root.add(part("Head", sphere(size, 18, 14), scale, y));
  const snout = part("Snout", capsule(size * 0.45, size * 0.7, 6, 10), scale, y - size * 0.15);
  snout.rotation.x = Math.PI / 2;
  snout.position.z = size * 0.85;
  root.add(snout);
  const jaw = part("Jaw", roundBox(size * 0.9, size * 0.35, size * 0.8, 2), belly, y - size * 0.45);
  jaw.position.z = size * 0.45;
  root.add(jaw);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeL" : "EyeR", sphere(size * 0.18, 10, 8), core, y + size * 0.1);
    eye.position.set(side * size * 0.45, 0.02, size * 0.7);
    root.add(eye);
    // Sensory horn / ear spines
    const ear = part("EarSpine", cone(size * 0.12, size * 0.55, 6), horn, y + size * 0.35);
    ear.position.set(side * size * 0.85, 0, -size * 0.1);
    ear.rotation.z = side * -0.7;
    root.add(ear);
  }
  for (let i = 0; i < spires; i++) {
    for (const side of [-1, 1]) {
      const h = part("Horn", cone(size * 0.14, size * (0.7 + i * 0.25), 7), horn, y + size * (0.7 + i * 0.35));
      h.position.set(side * size * (0.35 + i * 0.08), 0, -size * (0.15 + i * 0.1));
      h.rotation.z = side * -(0.4 + i * 0.1);
      h.rotation.x = -0.25;
      root.add(h);
    }
  }
  // Cranial spire
  const spire = part("Spire", cone(size * 0.12, size * 0.9, 6), horn, y + size * 1.1);
  spire.position.z = -size * 0.2;
  root.add(spire);
}

function addCaudalFlukes(
  root: THREE.Group,
  scale: Surf,
  horn: Surf,
  hipY: number,
  segs: number,
  thick: number,
): void {
  let z = -0.22;
  for (let i = 0; i < segs; i++) {
    const t = i / Math.max(1, segs - 1);
    const seg = part(`Tail${i}`, capsule(thick * (1 - t * 0.5), 0.16 - t * 0.02, 5, 8), scale, hipY - t * 0.06);
    seg.position.set(0, 0, z);
    seg.rotation.x = 0.4 + t * 0.3;
    root.add(seg);
    if (i % 2 === 0) {
      for (const side of [-1, 1]) {
        const fluke = part("Fluke", cone(thick * 0.35, thick * 1.1, 5), horn, hipY - t * 0.04);
        fluke.position.set(side * thick * 0.9, 0, z);
        fluke.rotation.z = side * 1.2;
        root.add(fluke);
      }
    }
    z -= 0.14 - t * 0.015;
  }
  const tip = part("TailSpike", cone(thick * 0.7, thick * 2.2, 6), horn, hipY - 0.1);
  tip.rotation.x = 1.05;
  tip.position.set(0, 0, z - 0.04);
  root.add(tip);
}

/** Hatchling — compact bipedal true-dragon stub. */
function buildWhelp(root: THREE.Group): void {
  const { scale, belly, horn, core, claw } = dragonMats(0xc05028);
  root.add(part("Torso", capsule(0.26, 0.42, 10, 14), scale, 0.85));
  root.add(part("Belly", sphere(0.18, 14, 10), belly, 0.72));
  root.add(part("Core", sphere(0.08, 10, 8), core, 0.82));
  addDragonHead(root, scale, belly, horn, core, 1.25, 0.2, 1);
  addDragonWings(root, scale, horn, 0.95, 0.55, 0.4, 0.7);
  addDemonArms(root, scale, horn, claw, 0.95, 0.4, 0.055, 0.28);
  addDigitigradeLegs(root, scale, horn, claw, 0.55, 0.52, 0.07, 0.14);
  addCaudalFlukes(root, scale, horn, 0.65, 4, 0.055);
}

/** Light-class Wyvern — lean biped, large segmented wings. */
function buildWyvern(root: THREE.Group): void {
  const { scale, belly, horn, core, claw } = dragonMats(0x8a6a3a);
  root.add(part("Torso", capsule(0.22, 0.55, 10, 14), scale, 1.05));
  root.add(part("Belly", sphere(0.14, 12, 10), belly, 0.95));
  addDragonHead(root, scale, belly, horn, core, 1.55, 0.18, 1);
  addDragonWings(root, scale, horn, 1.15, 0.85, 0.65, 0.5);
  // Wyverns: vestigial forelimbs / wing-hands only — short arms
  addDemonArms(root, scale, horn, claw, 1.15, 0.35, 0.045, 0.22, -0.02);
  addDigitigradeLegs(root, scale, horn, claw, 0.7, 0.68, 0.075, 0.15);
  addCaudalFlukes(root, scale, horn, 0.8, 5, 0.05);
}

/** Medium-class Drake — quadrupedal, folded wings. */
function buildDrake(root: THREE.Group): void {
  const { scale, belly, horn, core, claw } = dragonMats(0xa03820);
  root.add(part("Chest", capsule(0.32, 0.55, 10, 16), scale, 0.72));
  const haunch = part("Haunch", sphere(0.34, 16, 12), scale, 0.65);
  haunch.position.z = -0.35;
  root.add(haunch);
  root.add(part("Belly", sphere(0.22, 14, 10), belly, 0.55));
  root.add(part("Core", sphere(0.1, 10, 8), core, 0.7));
  addDragonHead(root, scale, belly, horn, core, 1.05, 0.24, 1);
  const neck = part("Neck", capsule(0.12, 0.28, 6, 10), scale, 0.95);
  neck.position.z = 0.2;
  neck.rotation.x = -0.4;
  root.add(neck);
  // Folded wing sails along the back
  addDragonWings(root, scale, horn, 0.85, 0.5, 0.35, 1.15);
  for (const side of [-1, 1]) {
    for (const [z, y] of [
      [0.22, 0.55],
      [-0.32, 0.5],
    ] as const) {
      const thigh = part("Leg", capsule(0.08, 0.28, 6, 10), scale, y);
      thigh.position.set(side * 0.22, 0, z);
      root.add(thigh);
      const foot = part("Foot", roundBox(0.14, 0.08, 0.22, 2), claw, 0.12);
      foot.position.set(side * 0.22, 0, z + 0.08);
      root.add(foot);
    }
  }
  addCaudalFlukes(root, scale, horn, 0.55, 5, 0.07);
}

/** Heavy-class True Dragon — upright biped, armored thorax, hand actuators. */
function buildTrueDragon(root: THREE.Group): void {
  const { scale, belly, horn, core, claw } = dragonMats(0xb04022);
  root.add(part("Torso", roundBox(0.65, 0.85, 0.48, 4), scale, 1.45));
  // Integrated armor mounts
  for (let i = 0; i < 3; i++) {
    const plate = part(`Armor${i}`, roundBox(0.58 - i * 0.04, 0.12, 0.2, 2), horn, 1.7 - i * 0.2);
    plate.position.z = 0.22;
    root.add(plate);
  }
  root.add(part("Belly", roundBox(0.42, 0.55, 0.12, 3), belly, 1.35));
  root.add(part("DragonHeart", new THREE.OctahedronGeometry(0.12, 0), core, 1.45));
  // Elongated thoracic / neck
  const neck = part("Neck", capsule(0.14, 0.35, 8, 10), scale, 2.0);
  root.add(neck);
  addDragonHead(root, scale, belly, horn, core, 2.35, 0.26, 2);
  addDragonWings(root, scale, horn, 1.7, 1.1, 0.85, 0.45);
  addDemonArms(root, scale, horn, claw, 1.65, 0.75, 0.09, 0.42);
  addDigitigradeLegs(root, scale, horn, claw, 0.95, 0.95, 0.11, 0.2);
  addCaudalFlukes(root, scale, horn, 1.05, 6, 0.08);
}

/** Titanic Ancient Wyrm — bulk, crown spines, wide wings. */
function buildAncientWyrm(root: THREE.Group): void {
  const { scale, belly, horn, core, claw } = dragonMats(0x6a2818);
  root.add(part("Torso", roundBox(0.95, 1.05, 0.65, 4), scale, 1.7));
  root.add(part("Abs", roundBox(0.75, 0.45, 0.55, 3), scale, 1.15));
  for (let i = 0; i < 4; i++) {
    const plate = part(`ScalePlate${i}`, roundBox(0.85 - i * 0.06, 0.14, 0.22, 2), horn, 2.0 - i * 0.22);
    plate.position.z = 0.28;
    root.add(plate);
  }
  root.add(part("Belly", roundBox(0.55, 0.7, 0.14, 3), belly, 1.5));
  root.add(part("ElementalCore", new THREE.OctahedronGeometry(0.16, 0), core, 1.6));
  const neck = part("Neck", capsule(0.2, 0.45, 8, 12), scale, 2.4);
  root.add(neck);
  addDragonHead(root, scale, belly, horn, core, 2.85, 0.34, 3);
  // Crown ring of spines
  for (let i = 0; i < 5; i++) {
    const a = ((i - 2) / 2) * 0.35;
    const crown = part("CrownSpine", cone(0.05, 0.35 + Math.abs(i - 2) * 0.05, 6), horn, 3.25);
    crown.position.set(a * 0.4, 0, -0.15);
    crown.rotation.z = a;
    root.add(crown);
  }
  addDragonWings(root, scale, horn, 2.0, 1.45, 1.1, 0.4);
  addDemonArms(root, scale, horn, claw, 1.9, 0.9, 0.12, 0.55);
  addDigitigradeLegs(root, scale, horn, claw, 1.1, 1.1, 0.14, 0.28);
  addCaudalFlukes(root, scale, horn, 1.2, 7, 0.1);
}

function buildHillock(root: THREE.Group): void {
  const skin = mat(0xa88868, 0.05, 0.78);
  const cloth = mat(0x4a3a2a, 0.04, 0.88);
  const stone = mat(0x7a7468, 0.25, 0.55);
  root.add(part("Torso", roundBox(0.9, 1.0, 0.55, 4), skin, 1.4));
  root.add(part("Head", sphere(0.34, 18, 14), skin, 2.15));
  root.add(part("Brow", roundBox(0.4, 0.08, 0.12, 2), stone, 2.28));
  root.add(part("Skirt", cylinder(0.48, 0.55, 0.55, 14), cloth, 0.55));
  for (const side of [-1, 1]) {
    const arm = part("Arm", capsule(0.14, 0.6, 10, 14), skin, 1.4);
    arm.position.x = side * 0.58;
    root.add(arm);
    const fist = part("Fist", sphere(0.14, 12, 10), skin, 1.0);
    fist.position.x = side * 0.62;
    root.add(fist);
    const leg = part("Leg", capsule(0.15, 0.5, 10, 14), skin, 0.35);
    leg.position.x = side * 0.24;
    root.add(leg);
  }
  const club = part("Club", cylinder(0.08, 0.14, 0.9, 10), stone, 1.1);
  club.position.set(0.7, 0, 0.1);
  club.rotation.z = 0.4;
  root.add(club);
}

function buildLurker(root: THREE.Group): void {
  const flesh = mat(0x6a5a78, 0.12, 0.55, 0x3a1848, 0.28);
  flesh.sheen = 0.5;
  root.add(part("Body", sphere(0.5, 24, 18), flesh, 0.58));
  root.add(part("Dome", sphere(0.35, 18, 14), flesh, 0.95));
  for (let i = 0; i < 7; i++) {
    const eye = part(
      "Eye",
      sphere(0.07, 12, 10),
      mat(0xe8d060, 0.25, 0.3, 0xffee88, 0.7),
      0.75,
    );
    const a = (i / 7) * Math.PI * 2;
    eye.position.set(Math.cos(a) * 0.36, 0.12, Math.sin(a) * 0.36);
    root.add(eye);
  }
  for (let i = 0; i < 6; i++) {
    const tent = part("Tentacle", capsule(0.055, 0.55, 8, 12), flesh, 0.22);
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
  root.add(part("Body", capsule(0.3, 0.85, 12, 18), light, 0.95));
  root.add(part("Halo", torus(0.4, 0.045, 12, 32), light, 1.85));
  root.add(part("HaloInner", torus(0.28, 0.025, 10, 24), light, 1.85));
  root.add(part("Crack", roundBox(0.1, 0.55, 0.08, 2), crack, 1.0));
  for (const side of [-1, 1]) {
    const arm = part("Arm", capsule(0.07, 0.45, 8, 12), light, 1.05);
    arm.position.x = side * 0.38;
    root.add(arm);
  }
}

function buildFlicker(root: THREE.Group): void {
  const glow = mat(0xa8d4e8, 0.2, 0.35, 0x60b0e0, 0.65);
  glow.transparent = true;
  glow.opacity = 0.9;
  root.add(part("Body", sphere(0.22, 20, 16), glow, 0.58));
  for (let i = 0; i < 5; i++) {
    const orb = part("Orb", sphere(0.07, 14, 12), glow, 0.7 + (i % 3) * 0.1);
    const a = (i / 5) * Math.PI * 2;
    orb.position.set(Math.cos(a) * 0.32, Math.sin(a * 2) * 0.08, Math.sin(a) * 0.32);
    root.add(orb);
  }
  const trail = mat(0xd0e8ff, 0.05, 0.5, 0x88c0ff, 0.35);
  trail.transparent = true;
  trail.opacity = 0.4;
  trail.depthWrite = false;
  root.add(part("Trail", sphere(0.35, 14, 10), trail, 0.58));
}
