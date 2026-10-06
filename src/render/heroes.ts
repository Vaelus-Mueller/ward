import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { RaceId } from "../game/types";

export const HERO_HEIGHT: Record<RaceId, number> = {
  human: 1.78,
  elf: 1.92,
  dwarf: 1.28,
  gnome: 1.05,
  hobbit: 1.12,
  insectoid: 1.7,
  minotaur: 2.15,
  golem: 2.05,
};

interface RaceLook {
  skin: number;
  cloth: number;
  accent: number;
  metal: number;
  rough: number;
  emissive?: number;
  emit?: number;
  torso: { w: number; d: number; h: number };
  head: { r: number };
  limb: { arm: number; leg: number; thick: number };
  foot: { w: number; d: number; h: number };
}

const LOOK: Record<RaceId, RaceLook> = {
  human: {
    skin: 0xc9a07a,
    cloth: 0x4a3a2c,
    accent: 0x7a5a3a,
    metal: 0.12,
    rough: 0.62,
    torso: { w: 0.34, d: 0.22, h: 0.52 },
    head: { r: 0.16 },
    limb: { arm: 0.46, leg: 0.55, thick: 0.07 },
    foot: { w: 0.12, d: 0.2, h: 0.07 },
  },
  elf: {
    skin: 0xd8c4a8,
    cloth: 0x3d4f3a,
    accent: 0x8fb070,
    metal: 0.08,
    rough: 0.48,
    torso: { w: 0.28, d: 0.18, h: 0.56 },
    head: { r: 0.145 },
    limb: { arm: 0.52, leg: 0.66, thick: 0.055 },
    foot: { w: 0.1, d: 0.18, h: 0.06 },
  },
  dwarf: {
    skin: 0xb88962,
    cloth: 0x5a3a28,
    accent: 0xc4a05a,
    metal: 0.22,
    rough: 0.7,
    torso: { w: 0.42, d: 0.3, h: 0.42 },
    head: { r: 0.17 },
    limb: { arm: 0.34, leg: 0.34, thick: 0.095 },
    foot: { w: 0.14, d: 0.2, h: 0.08 },
  },
  gnome: {
    skin: 0xd2b090,
    cloth: 0x4a3d66,
    accent: 0xc58bff,
    metal: 0.1,
    rough: 0.55,
    torso: { w: 0.3, d: 0.22, h: 0.34 },
    head: { r: 0.19 },
    limb: { arm: 0.28, leg: 0.28, thick: 0.06 },
    foot: { w: 0.11, d: 0.16, h: 0.06 },
  },
  hobbit: {
    skin: 0xc9a07a,
    cloth: 0x5c6e3a,
    accent: 0xb7a04a,
    metal: 0.06,
    rough: 0.68,
    torso: { w: 0.36, d: 0.26, h: 0.36 },
    head: { r: 0.16 },
    limb: { arm: 0.3, leg: 0.3, thick: 0.075 },
    foot: { w: 0.16, d: 0.26, h: 0.08 },
  },
  insectoid: {
    skin: 0x6e8a48,
    cloth: 0x2a3820,
    accent: 0xa8d45a,
    metal: 0.35,
    rough: 0.35,
    emissive: 0x3a5a18,
    emit: 0.18,
    torso: { w: 0.3, d: 0.24, h: 0.48 },
    head: { r: 0.15 },
    limb: { arm: 0.5, leg: 0.52, thick: 0.05 },
    foot: { w: 0.1, d: 0.22, h: 0.05 },
  },
  minotaur: {
    skin: 0x6a4a32,
    cloth: 0x3a2818,
    accent: 0xd4b07a,
    metal: 0.15,
    rough: 0.72,
    torso: { w: 0.48, d: 0.34, h: 0.6 },
    head: { r: 0.2 },
    limb: { arm: 0.52, leg: 0.58, thick: 0.11 },
    foot: { w: 0.16, d: 0.26, h: 0.1 },
  },
  golem: {
    skin: 0x8a8478,
    cloth: 0x5c6168,
    accent: 0xe4c37a,
    metal: 0.05,
    rough: 0.92,
    emissive: 0x6a5020,
    emit: 0.12,
    torso: { w: 0.5, d: 0.36, h: 0.62 },
    head: { r: 0.18 },
    limb: { arm: 0.48, leg: 0.52, thick: 0.12 },
    foot: { w: 0.18, d: 0.24, h: 0.12 },
  },
};

export function buildHero(race: RaceId): THREE.Group {
  const look = LOOK[race];
  const height = HERO_HEIGHT[race];
  const root = new THREE.Group();
  root.name = `hero-${race}`;

  const skin = mat(look.skin, look.metal, look.rough, look.emissive, look.emit);
  const cloth = mat(look.cloth, look.metal * 0.5, Math.min(0.95, look.rough + 0.08));
  const accent = mat(look.accent, 0.45, 0.4, look.emissive, look.emit ? look.emit * 0.6 : 0);

  const hips = new THREE.Group();
  hips.name = "hips";
  hips.position.y = look.limb.leg + look.foot.h;
  root.add(hips);

  const pelvis = part("Hips", box(look.torso.w * 0.9, 0.14, look.torso.d * 0.95), cloth);
  hips.add(pelvis);

  const spine = new THREE.Group();
  spine.name = "spine";
  spine.position.y = 0.08;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = "chest";
  chest.position.y = look.torso.h * 0.5;
  spine.add(chest);

  const body = part("Body", box(look.torso.w, look.torso.h, look.torso.d), cloth);
  chest.add(body);

  if (race === "insectoid") {
    const plate = part("Chitin", box(look.torso.w * 1.05, look.torso.h * 0.55, look.torso.d * 1.12), accent);
    plate.position.set(0, 0.05, 0.02);
    chest.add(plate);
    const abdomen = part("Abdomen", new THREE.SphereGeometry(0.16, 10, 8), skin);
    abdomen.scale.set(1.1, 0.85, 1.35);
    abdomen.position.set(0, -0.22, 0.16);
    hips.add(abdomen);
  }

  if (race === "golem") {
    for (const [dx, dy] of [
      [-0.16, 0.12],
      [0.16, -0.05],
      [0, 0.22],
    ] as const) {
      const slab = part("Stone", box(0.18, 0.14, 0.08), accent);
      slab.position.set(dx, dy, look.torso.d * 0.42);
      chest.add(slab);
    }
  }

  const neck = part("Neck", new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skin);
  neck.position.y = look.torso.h * 0.5 + 0.06;
  chest.add(neck);

  const head = new THREE.Group();
  head.name = "head";
  head.position.y = look.torso.h * 0.5 + 0.16 + look.head.r * 0.2;
  chest.add(head);

  const skull = part(
    "Head",
    race === "golem" ? box(look.head.r * 1.7, look.head.r * 1.8, look.head.r * 1.6) : new THREE.SphereGeometry(look.head.r, 24, 18),
    skin,
  );
  head.add(skull);

  addFace(head, race, look, skin, accent);
  addRaceFeatures(root, head, chest, hips, race, look, skin, cloth, accent);

  addLimb(hips, "LegLeft", -look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, cloth, true);
  addLimb(hips, "LegRight", look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, cloth, true);
  addLimb(chest, "ArmLeft", -look.torso.w * 0.55, look.limb.arm, look.limb.thick * 0.9, null, skin, cloth, false);
  addLimb(chest, "ArmRight", look.torso.w * 0.55, look.limb.arm, look.limb.thick * 0.9, null, skin, cloth, false);
  if (race === "insectoid") {
    // Lower blade-arms for the third and fourth weapons.
    addLimb(chest, "ArmLeft2", -look.torso.w * 0.48, look.limb.arm * 0.88, look.limb.thick * 0.8, null, skin, cloth, false, "2", -0.12);
    addLimb(chest, "ArmRight2", look.torso.w * 0.48, look.limb.arm * 0.88, look.limb.thick * 0.8, null, skin, cloth, false, "2", -0.12);
  }

  // Plant feet on the ground after assembly.
  const box3 = new THREE.Box3().setFromObject(root);
  root.position.y -= box3.min.y;
  const size = box3.getSize(new THREE.Vector3()).y;
  if (Math.abs(size - height) > 0.05) root.scale.setScalar(height / Math.max(0.001, size));
  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;

  return root;
}

function addFace(head: THREE.Group, race: RaceId, look: RaceLook, skin: THREE.Material, accent: THREE.Material): void {
  const eyeColor = race === "insectoid" ? 0xa8d45a : race === "golem" ? 0xe4c37a : 0x1a1410;
  const eyeMat = mat(eyeColor, 0.2, 0.35, race === "insectoid" || race === "golem" ? eyeColor : undefined, race === "insectoid" ? 0.45 : race === "golem" ? 0.35 : 0);
  const eyeY = look.head.r * 0.15;
  const eyeZ = -look.head.r * 0.85;
  const eyeX = look.head.r * 0.35;
  const eyeGeo = race === "insectoid" ? new THREE.SphereGeometry(0.045, 8, 6) : new THREE.SphereGeometry(0.028, 8, 6);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", eyeGeo, eyeMat);
    eye.position.set(side * eyeX, eyeY, eyeZ);
    head.add(eye);
  }
  if (race === "minotaur") {
    const muzzle = part("Muzzle", new THREE.CapsuleGeometry(0.08, 0.12, 4, 8), skin);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, -0.04, -look.head.r * 0.85);
    head.add(muzzle);
  }
  if (race === "dwarf") {
    const beard = part("Beard", new THREE.ConeGeometry(0.12, 0.22, 8), accent);
    beard.position.set(0, -look.head.r * 0.7, -look.head.r * 0.35);
    head.add(beard);
  }
}

function addRaceFeatures(
  root: THREE.Group,
  head: THREE.Group,
  chest: THREE.Group,
  hips: THREE.Group,
  race: RaceId,
  look: RaceLook,
  skin: THREE.Material,
  cloth: THREE.Material,
  accent: THREE.Material,
): void {
  if (race === "elf") {
    for (const side of [-1, 1]) {
      const ear = part(side < 0 ? "EarLeft" : "EarRight", new THREE.ConeGeometry(0.04, 0.18, 6), skin);
      ear.rotation.z = side * 0.7;
      ear.rotation.x = -0.35;
      ear.position.set(side * look.head.r * 0.9, 0.04, 0);
      head.add(ear);
    }
  }
  if (race === "gnome") {
    const hat = part("Hat", new THREE.ConeGeometry(0.16, 0.34, 10), cloth);
    hat.position.y = look.head.r + 0.12;
    head.add(hat);
  }
  if (race === "hobbit") {
    // Feet already oversized via look.foot; add curly hair cap.
    const hair = part("Hair", new THREE.SphereGeometry(look.head.r * 1.05, 10, 8), accent);
    hair.scale.y = 0.55;
    hair.position.y = look.head.r * 0.45;
    head.add(hair);
  }
  if (race === "insectoid") {
    for (const side of [-1, 1]) {
      const base = new THREE.Group();
      base.position.set(side * 0.06, look.head.r * 0.7, 0);
      const shaft = part("Antenna", new THREE.CylinderGeometry(0.012, 0.016, 0.28, 6), accent);
      shaft.rotation.z = side * 0.35;
      shaft.position.y = 0.14;
      const tip = part("AntennaTip", new THREE.SphereGeometry(0.03, 8, 6), accent);
      tip.position.set(side * 0.08, 0.28, 0);
      base.add(shaft, tip);
      head.add(base);
    }
  }
  if (race === "minotaur") {
    for (const side of [-1, 1]) {
      const horn = part(side < 0 ? "HornLeft" : "HornRight", new THREE.ConeGeometry(0.05, 0.32, 7), accent);
      horn.rotation.z = side * -0.85;
      horn.rotation.x = -0.25;
      horn.position.set(side * look.head.r * 0.75, look.head.r * 0.55, -0.02);
      head.add(horn);
    }
  }
  if (race === "golem") {
    const joint = part("Core", new THREE.OctahedronGeometry(0.08, 0), accent);
    joint.position.set(0, 0.05, look.torso.d * 0.52);
    chest.add(joint);
  }
  if (race === "dwarf" || race === "human") {
    const beltLine = part("BeltLine", box(look.torso.w * 0.95, 0.05, look.torso.d * 1.02), accent);
    beltLine.position.y = 0.02;
    hips.add(beltLine);
  }
  void root;
}

function addLimb(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  foot: { w: number; d: number; h: number } | null,
  skin: THREE.Material,
  cloth: THREE.Material,
  isLeg: boolean,
  handSuffix = "",
  yOffset = 0,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, isLeg ? 0 : 0.18 + yOffset, 0);
  parent.add(group);

  const upper = part(name, new THREE.CapsuleGeometry(thick, Math.max(0.08, length * 0.55), 6, 12), isLeg ? cloth : skin);
  upper.position.y = isLeg ? -length * 0.35 : -length * 0.28;
  group.add(upper);

  const lower = part(`${name}Lower`, new THREE.CapsuleGeometry(thick * 0.9, Math.max(0.08, length * 0.4), 6, 12), skin);
  lower.position.y = isLeg ? -length * 0.78 : -length * 0.72;
  group.add(lower);

  if (foot) {
    const shoe = part(name === "LegLeft" ? "FootLeft" : "FootRight", box(foot.w, foot.h, foot.d), cloth);
    shoe.position.set(0, -length - foot.h * 0.2, foot.d * 0.15);
    group.add(shoe);
  } else {
    const left = name.startsWith("ArmLeft");
    const handName = left ? `hand.l${handSuffix}` : `hand.r${handSuffix}`;
    const hand = part(handName, new THREE.SphereGeometry(thick * 1.15, 12, 10), skin);
    hand.position.y = -length * 0.95;
    group.add(hand);
    const slot = new THREE.Group();
    slot.name = left ? `handslot.l${handSuffix}` : `handslot.r${handSuffix}`;
    slot.position.copy(hand.position);
    group.add(slot);
  }
}

function part(name: string, geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  const radius = Math.min(w, h, d) * 0.22;
  const safe = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  if (safe <= 0.001) return new THREE.BoxGeometry(w, h, d);
  return new RoundedBoxGeometry(w, h, d, 3, safe);
}

function mat(color: number, metal: number, rough: number, emissive?: number, emit = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: metal,
    roughness: rough,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emit,
    envMapIntensity: 0.9,
  });
}

export function isHeroRace(kind: string): kind is RaceId {
  return kind in HERO_HEIGHT;
}

/**
 * Procedural limb posing for heroes (no GLB clips).
 * Each armed hand swings independently; 2H commits both paired arms together.
 * Dodge/hit react must not interrupt a committed attack (caller keeps attack mode).
 */
export function poseHeroLimbs(
  root: THREE.Object3D,
  opts: {
    time: number;
    moving: boolean;
    attackT: number; // 0..1 during attack, or -1
    race: RaceId;
    hands: { slot: "weapon" | "offhand" | "weapon3" | "weapon4"; twoHand: boolean; empty: boolean }[];
  },
): void {
  const walk = opts.moving ? Math.sin(opts.time * 7.2) : Math.sin(opts.time * 1.4) * 0.15;
  const legL = root.getObjectByName("LegLeft");
  const legR = root.getObjectByName("LegRight");
  if (legL) legL.rotation.x = walk * 0.55;
  if (legR) legR.rotation.x = -walk * 0.55;

  const spine = root.getObjectByName("spine");
  const chest = root.getObjectByName("chest");
  const attacking = opts.attackT >= 0;
  // Anticipation → strike → follow-through curve.
  const swing = (phase: number, weight = 1) => {
    const t = ((phase % 1) + 1) % 1;
    const wind = t < 0.22 ? -(t / 0.22) * 0.55 : t < 0.55 ? -0.55 + ((t - 0.22) / 0.33) * 2.1 : 1.55 - ((t - 0.55) / 0.45) * 1.55;
    return wind * weight;
  };

  const armBySlot: Record<string, string> = {
    weapon: "ArmRight",
    offhand: "ArmLeft",
    weapon3: "ArmRight2",
    weapon4: "ArmLeft2",
  };
  const pairOf: Record<string, string> = {
    weapon: "ArmLeft",
    offhand: "ArmRight",
    weapon3: "ArmLeft2",
    weapon4: "ArmRight2",
  };

  // Idle breathe / walk arm sway baselines.
  for (const name of ["ArmLeft", "ArmRight", "ArmLeft2", "ArmRight2"]) {
    const arm = root.getObjectByName(name);
    if (!arm) continue;
    const side = name.includes("Left") ? -1 : 1;
    arm.rotation.x = opts.moving ? -walk * 0.35 * side : Math.sin(opts.time * 1.6) * 0.04;
    arm.rotation.z = side * 0.12;
    arm.rotation.y = 0;
  }

  if (!attacking) {
    if (spine) spine.rotation.x = Math.sin(opts.time * 1.5) * 0.03;
    if (chest) chest.rotation.y = 0;
    return;
  }

  // Weight shift into the strike.
  if (spine) spine.rotation.x = -0.08 + Math.sin(opts.attackT * Math.PI) * 0.12;
  if (chest) chest.rotation.y = Math.sin(opts.attackT * Math.PI) * 0.18;

  const armed = opts.hands.filter((hand) => !hand.empty);
  const twoHand = armed.find((hand) => hand.twoHand);
  if (twoHand) {
    const main = root.getObjectByName(armBySlot[twoHand.slot]!);
    const other = root.getObjectByName(pairOf[twoHand.slot]!);
    const arc = swing(opts.attackT, 1.15);
    if (main) {
      main.rotation.x = arc;
      main.rotation.z = 0.05;
      main.rotation.y = -0.25 + opts.attackT * 0.4;
    }
    if (other) {
      other.rotation.x = arc * 0.92;
      other.rotation.z = -0.08;
      other.rotation.y = 0.2 - opts.attackT * 0.25;
    }
    return;
  }

  // Independent staggered swings per armed limb.
  armed.forEach((hand, index) => {
    const arm = root.getObjectByName(armBySlot[hand.slot]!);
    if (!arm) return;
    const phase = opts.attackT + index * 0.18;
    const arc = swing(phase, 1 - index * 0.08);
    const side = hand.slot === "offhand" || hand.slot === "weapon4" ? -1 : 1;
    arm.rotation.x = arc;
    arm.rotation.y = side * (-0.2 + opts.attackT * 0.35);
    arm.rotation.z = side * (0.15 + Math.sin(phase * Math.PI) * 0.2);
  });
}
