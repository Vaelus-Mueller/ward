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
  lizard: 1.74,
  undead: 1.76,
};

type SkinKind = "flesh" | "fur" | "chitin" | "scale" | "stone" | "bone";

interface RaceLook {
  skin: number;
  cloth: number;
  accent: number;
  skinKind: SkinKind;
  emissive?: number;
  emit?: number;
  torso: { w: number; d: number; h: number };
  head: { r: number };
  limb: { arm: number; leg: number; thick: number };
  foot: { w: number; d: number; h: number };
}

const LOOK: Record<RaceId, RaceLook> = {
  human: {
    skin: 0xb8926e,
    cloth: 0x3f3228,
    accent: 0x6a5238,
    skinKind: "flesh",
    torso: { w: 0.34, d: 0.22, h: 0.52 },
    head: { r: 0.16 },
    limb: { arm: 0.46, leg: 0.55, thick: 0.07 },
    foot: { w: 0.12, d: 0.2, h: 0.07 },
  },
  elf: {
    skin: 0xc9b49a,
    cloth: 0x334438,
    accent: 0x6f8a58,
    skinKind: "flesh",
    torso: { w: 0.28, d: 0.18, h: 0.56 },
    head: { r: 0.145 },
    limb: { arm: 0.52, leg: 0.66, thick: 0.055 },
    foot: { w: 0.1, d: 0.18, h: 0.06 },
  },
  dwarf: {
    skin: 0xa67a52,
    cloth: 0x4a3224,
    accent: 0xa8884a,
    skinKind: "flesh",
    torso: { w: 0.42, d: 0.3, h: 0.42 },
    head: { r: 0.17 },
    limb: { arm: 0.34, leg: 0.34, thick: 0.095 },
    foot: { w: 0.14, d: 0.2, h: 0.08 },
  },
  gnome: {
    skin: 0xc4a888,
    cloth: 0x3a3552,
    accent: 0x8a6aa8,
    skinKind: "flesh",
    torso: { w: 0.3, d: 0.22, h: 0.34 },
    head: { r: 0.19 },
    limb: { arm: 0.28, leg: 0.28, thick: 0.06 },
    foot: { w: 0.11, d: 0.16, h: 0.06 },
  },
  hobbit: {
    skin: 0xb8926e,
    cloth: 0x4a5a32,
    accent: 0x8a7a3a,
    skinKind: "flesh",
    torso: { w: 0.36, d: 0.26, h: 0.36 },
    head: { r: 0.16 },
    limb: { arm: 0.3, leg: 0.3, thick: 0.075 },
    foot: { w: 0.16, d: 0.26, h: 0.08 },
  },
  insectoid: {
    skin: 0x5a7240,
    cloth: 0x222c1a,
    accent: 0x7a9a48,
    skinKind: "chitin",
    emissive: 0x243818,
    emit: 0.08,
    torso: { w: 0.3, d: 0.24, h: 0.48 },
    head: { r: 0.15 },
    limb: { arm: 0.5, leg: 0.52, thick: 0.05 },
    foot: { w: 0.1, d: 0.22, h: 0.05 },
  },
  minotaur: {
    skin: 0x5a3e2a,
    cloth: 0x2e2218,
    accent: 0xb09868,
    skinKind: "fur",
    torso: { w: 0.48, d: 0.34, h: 0.6 },
    head: { r: 0.2 },
    limb: { arm: 0.52, leg: 0.58, thick: 0.11 },
    foot: { w: 0.16, d: 0.26, h: 0.1 },
  },
  golem: {
    skin: 0x7a756c,
    cloth: 0x4e5358,
    accent: 0xc4a86a,
    skinKind: "stone",
    emissive: 0x4a3818,
    emit: 0.06,
    torso: { w: 0.5, d: 0.36, h: 0.62 },
    head: { r: 0.18 },
    limb: { arm: 0.48, leg: 0.52, thick: 0.12 },
    foot: { w: 0.18, d: 0.24, h: 0.12 },
  },
  lizard: {
    skin: 0x4a6a48,
    cloth: 0x3a3428,
    accent: 0x8a6a3a,
    skinKind: "scale",
    torso: { w: 0.36, d: 0.26, h: 0.5 },
    head: { r: 0.15 },
    limb: { arm: 0.48, leg: 0.52, thick: 0.065 },
    foot: { w: 0.12, d: 0.22, h: 0.06 },
  },
  undead: {
    skin: 0x8a8a7e,
    cloth: 0x2e2824,
    accent: 0x5a4a3a,
    skinKind: "bone",
    emissive: 0x2a3a2a,
    emit: 0.04,
    torso: { w: 0.32, d: 0.2, h: 0.5 },
    head: { r: 0.155 },
    limb: { arm: 0.48, leg: 0.54, thick: 0.06 },
    foot: { w: 0.11, d: 0.2, h: 0.06 },
  },
};

export function buildHero(race: RaceId): THREE.Group {
  const look = LOOK[race];
  const height = HERO_HEIGHT[race];
  const root = new THREE.Group();
  root.name = `hero-${race}`;

  const skin = skinMat(look);
  const cloth = clothMat(look.cloth);
  const accent = accentMat(look);

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
    abdomen.position.set(0, -0.22, -0.16);
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
    // Lower blade-arms: planted wider/lower/forward so they never hide under the upper pair.
    const lowerX = Math.max(look.torso.w * 0.55 + 0.12, look.torso.w * 0.95);
    addLimb(chest, "ArmLeft2", -lowerX, look.limb.arm * 0.9, look.limb.thick * 0.78, null, skin, cloth, false, "2", -0.26, 0.1);
    addLimb(chest, "ArmRight2", lowerX, look.limb.arm * 0.9, look.limb.thick * 0.78, null, skin, cloth, false, "2", -0.26, 0.1);
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
  const eyeColor =
    race === "insectoid" ? 0x7a9a40 : race === "golem" ? 0xc4a86a : race === "undead" ? 0x4a6a4a : race === "lizard" ? 0xc8b040 : 0x1a1410;
  const glow = race === "insectoid" || race === "golem" || race === "undead";
  const eyeMat = mat(eyeColor, 0.05, 0.55, glow ? eyeColor : undefined, glow ? 0.22 : 0);
  const eyeY = look.head.r * 0.15;
  const eyeZ = look.head.r * 0.85;
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
    muzzle.position.set(0, -0.04, look.head.r * 0.85);
    head.add(muzzle);
  }
  if (race === "dwarf") {
    const beard = part("Beard", new THREE.ConeGeometry(0.12, 0.22, 8), accent);
    beard.position.set(0, -look.head.r * 0.7, look.head.r * 0.35);
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
  if (race === "lizard") {
    const snout = part("Snout", new THREE.CapsuleGeometry(0.06, 0.1, 4, 8), skin);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, look.head.r * 0.9);
    head.add(snout);
    const crest = part("Crest", new THREE.ConeGeometry(0.04, 0.16, 5), accent);
    crest.rotation.x = 0.4;
    crest.position.set(0, look.head.r * 0.7, -0.02);
    head.add(crest);
    const tail = part("Tail", new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), skin);
    tail.rotation.x = 1.1;
    tail.position.set(0, -0.05, -look.torso.d * 0.55);
    hips.add(tail);
  }
  if (race === "undead") {
    for (const side of [-1, 1]) {
      const hollow = part(side < 0 ? "SocketL" : "SocketR", new THREE.SphereGeometry(0.04, 8, 6), accent);
      hollow.position.set(side * look.head.r * 0.35, look.head.r * 0.1, look.head.r * 0.72);
      head.add(hollow);
    }
    const ribs = part("Ribs", box(look.torso.w * 0.7, look.torso.h * 0.35, 0.04), accent);
    ribs.position.set(0, 0.02, look.torso.d * 0.48);
    chest.add(ribs);
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
  zOffset = 0,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, isLeg ? 0 : 0.18 + yOffset, zOffset);
  parent.add(group);

  const upper = part(`${name}Upper`, new THREE.CapsuleGeometry(thick, Math.max(0.08, length * 0.55), 6, 12), isLeg ? cloth : skin);
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
  // Tighter corners — big rounds read as toy plastic.
  const radius = Math.min(w, h, d) * 0.12;
  const safe = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  if (safe <= 0.001) return new THREE.BoxGeometry(w, h, d);
  return new RoundedBoxGeometry(w, h, d, 2, safe);
}

/** Soft organic skin — no clearcoat (that’s what made everyone look like vinyl). */
function skinMat(look: RaceLook): THREE.MeshPhysicalMaterial {
  const base = look.skin;
  const warm = new THREE.Color(base).offsetHSL(0.02, 0.04, 0.02);
  switch (look.skinKind) {
    case "chitin":
      return new THREE.MeshPhysicalMaterial({
        color: base,
        metalness: 0.12,
        roughness: 0.48,
        emissive: look.emissive ?? 0x000000,
        emissiveIntensity: look.emit ?? 0,
        envMapIntensity: 0.55,
        clearcoat: 0.22,
        clearcoatRoughness: 0.62,
        sheen: 0.08,
        sheenRoughness: 0.7,
        sheenColor: warm,
      });
    case "scale":
      return new THREE.MeshPhysicalMaterial({
        color: base,
        metalness: 0.06,
        roughness: 0.58,
        envMapIntensity: 0.45,
        clearcoat: 0.14,
        clearcoatRoughness: 0.72,
        sheen: 0.12,
        sheenRoughness: 0.8,
        sheenColor: warm,
      });
    case "stone":
      return new THREE.MeshPhysicalMaterial({
        color: base,
        metalness: 0.02,
        roughness: 0.92,
        emissive: look.emissive ?? 0x000000,
        emissiveIntensity: look.emit ?? 0,
        envMapIntensity: 0.3,
        clearcoat: 0,
        sheen: 0,
      });
    case "bone":
      return new THREE.MeshPhysicalMaterial({
        color: base,
        metalness: 0,
        roughness: 0.78,
        emissive: look.emissive ?? 0x000000,
        emissiveIntensity: look.emit ?? 0,
        envMapIntensity: 0.28,
        clearcoat: 0,
        sheen: 0.05,
        sheenRoughness: 0.9,
        sheenColor: new THREE.Color(0x6a7060),
      });
    case "fur":
      return new THREE.MeshPhysicalMaterial({
        color: base,
        metalness: 0,
        roughness: 0.88,
        envMapIntensity: 0.22,
        clearcoat: 0,
        sheen: 0.55,
        sheenRoughness: 0.85,
        sheenColor: warm,
      });
    default:
      return new THREE.MeshPhysicalMaterial({
        color: base,
        metalness: 0,
        roughness: 0.68,
        envMapIntensity: 0.32,
        clearcoat: 0,
        // Soft subsurface-ish loft without candy gloss.
        sheen: 0.28,
        sheenRoughness: 0.88,
        sheenColor: warm,
        specularIntensity: 0.35,
      });
  }
}

function clothMat(color: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0,
    roughness: 0.9,
    envMapIntensity: 0.2,
    clearcoat: 0,
    sheen: 0.45,
    sheenRoughness: 0.78,
    sheenColor: new THREE.Color(color).offsetHSL(0, -0.05, 0.06),
  });
}

function accentMat(look: RaceLook): THREE.MeshPhysicalMaterial {
  const metallic = look.skinKind === "stone" || look.skinKind === "chitin";
  return new THREE.MeshPhysicalMaterial({
    color: look.accent,
    metalness: metallic ? 0.55 : 0.35,
    roughness: metallic ? 0.42 : 0.55,
    emissive: look.emissive ?? 0x000000,
    emissiveIntensity: look.emit ? look.emit * 0.45 : 0,
    envMapIntensity: 0.65,
    clearcoat: metallic ? 0.12 : 0.04,
    clearcoatRoughness: 0.65,
    sheen: 0,
  });
}

function mat(color: number, metal: number, rough: number, emissive?: number, emit = 0): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: metal,
    roughness: rough,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emit,
    envMapIntensity: 0.4,
    clearcoat: 0,
    sheen: rough > 0.7 ? 0.2 : 0,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(color),
  });
}

export function isHeroRace(kind: string): kind is RaceId {
  return kind in HERO_HEIGHT;
}

/** Full basic-attack window (windup + strike + recover). Keep in sync with sim pending hits. */
export const HERO_ATTACK_DUR = 0.62;
/** Fraction of the attack window when the weapon should connect. */
export const HERO_ATTACK_IMPACT = 0.42;

/** Procedural clips so every arm (incl. insectoid blade-arms) walks and swings. */
export function heroAnimationClips(race: RaceId): THREE.AnimationClip[] {
  const arms = ["ArmLeft", "ArmRight"];
  if (race === "insectoid") arms.push("ArmLeft2", "ArmRight2");
  const legs = ["LegLeft", "LegRight"];

  const idle = limbClip("Idle", 1.6, (t, name) => {
    const breath = Math.sin(t * Math.PI * 2) * 0.04;
    if (name === "ArmLeft2") return { x: breath * 0.4, y: 0.1, z: 0.32 };
    if (name === "ArmRight2") return { x: breath * 0.4, y: -0.1, z: -0.32 };
    if (name.startsWith("Arm")) return { x: breath * 0.35, z: name.includes("Left") ? 0.08 : -0.08 };
    if (name.startsWith("Leg")) return { x: 0, z: 0 };
    return { x: breath * 0.15, z: 0 };
  }, [...arms, ...legs, "spine", "chest"]);

  // Guard stance for character select — weapons up, weight forward, light breath.
  const battle = limbClip("Idle_Combat", 2.2, (t, name) => {
    const breath = Math.sin(t * Math.PI * 2) * 0.03;
    if (name === "ArmRight") return { x: -1.05 + breath * 0.08, y: 0.55, z: -0.55 };
    if (name === "ArmLeft") return { x: -0.55 + breath * 0.06, y: -0.35, z: 0.75 };
    if (name === "ArmRight2") return { x: -0.95 + breath * 0.1, y: 0.7, z: -0.85 };
    if (name === "ArmLeft2") return { x: -0.7 + breath * 0.1, y: -0.55, z: 0.95 };
    if (name === "LegLeft") return { x: -0.18, z: 0.06 };
    if (name === "LegRight") return { x: 0.22, z: -0.05 };
    if (name === "spine") return { x: 0.08 + breath * 0.04, y: -0.12, z: 0 };
    if (name === "chest") return { x: 0.06 + breath * 0.05, y: 0.18, z: 0 };
    return { x: breath * 0.1, z: 0 };
  }, [...arms, ...legs, "spine", "chest"]);

  const walk = limbClip("Running_A", 0.7, (t, name) => {
    const swing = Math.sin(t * Math.PI * 2);
    if (name === "ArmLeft") return { x: swing * 0.55, z: 0.12 };
    if (name === "ArmRight") return { x: -swing * 0.55, z: -0.12 };
    // Lower blade-arms counter-phase and stay a little more flared.
    if (name === "ArmLeft2") return { x: -swing * 0.7, y: 0.08, z: 0.28 };
    if (name === "ArmRight2") return { x: swing * 0.7, y: -0.08, z: -0.28 };
    if (name === "LegLeft") return { x: -swing * 0.7, z: 0 };
    if (name === "LegRight") return { x: swing * 0.7, z: 0 };
    return { x: Math.sin(t * Math.PI * 4) * 0.03, z: 0 };
  }, [...arms, ...legs, "spine"]);

  // Wind → accelerate through impact → follow-through (weapons on handslots ride this).
  const attack = limbClip("1H_Melee_Attack_Slice_Horizontal", HERO_ATTACK_DUR, (t, name) => {
    const wind =
      t < 0.38
        ? Math.pow(t / 0.38, 1.65)
        : t < 0.48
          ? 1 + (t - 0.38) * 0.35
          : Math.max(0, 1.12 - Math.pow((t - 0.48) / 0.52, 1.25) * 1.12);
    if (name === "spine") return { x: wind * 0.18, y: -wind * 0.22, z: 0 };
    if (name === "chest") return { x: wind * 0.12, y: wind * 0.28, z: 0 };
    if (name === "LegLeft") return { x: -wind * 0.12, z: 0.04 };
    if (name === "LegRight") return { x: wind * 0.18, z: -0.04 };
    if (!name.startsWith("Arm")) return { x: wind * 0.1, z: 0 };
    const left = name.includes("Left");
    const lower = name.endsWith("2");
    const lag = lower ? 0.72 : 1;
    const lead = left ? 0.55 : 1;
    return {
      x: -wind * (lower ? 1.55 : 1.35) * lag * lead,
      y: (left ? -1 : 1) * wind * (lower ? 0.95 : 0.72) * lag,
      z: (left ? 1 : -1) * (0.2 + wind * (lower ? 0.75 : 0.55)),
    };
  }, [...arms, ...legs, "spine", "chest"]);

  const hit = limbClip("Hit_A", 0.28, (t, name) => {
    const flinch = Math.sin(Math.min(1, t) * Math.PI) * 0.45;
    if (name.startsWith("Arm")) return { x: flinch * 0.4, z: name.includes("Left") ? 0.2 : -0.2 };
    if (name.startsWith("Leg")) return { x: -flinch * 0.15, z: 0 };
    return { x: -flinch * 0.25, z: 0 };
  }, [...arms, ...legs, "spine", "chest"]);

  return [idle, battle, walk, attack, hit];
}

function limbClip(
  name: string,
  duration: number,
  sample: (t: number, bone: string) => { x?: number; y?: number; z?: number },
  bones: string[],
): THREE.AnimationClip {
  const steps = 12;
  const times: number[] = [];
  for (let i = 0; i <= steps; i++) times.push((i / steps) * duration);
  const tracks: THREE.KeyframeTrack[] = [];
  for (const bone of bones) {
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (const time of times) {
      const pose = sample(time / duration, bone);
      xs.push(pose.x ?? 0);
      ys.push(pose.y ?? 0);
      zs.push(pose.z ?? 0);
    }
    tracks.push(new THREE.NumberKeyframeTrack(`${bone}.rotation[x]`, times, xs));
    tracks.push(new THREE.NumberKeyframeTrack(`${bone}.rotation[y]`, times, ys));
    tracks.push(new THREE.NumberKeyframeTrack(`${bone}.rotation[z]`, times, zs));
  }
  return new THREE.AnimationClip(name, duration, tracks);
}
