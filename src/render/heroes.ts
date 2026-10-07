import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { raceHasGender } from "../game/races";
import type { Gender, RaceId } from "../game/types";

export const HERO_HEIGHT: Record<RaceId, number> = {
  human: 1.8,
  elf: 1.95,
  dwarf: 1.28,
  gnome: 1.05,
  hobbit: 1.12,
  insectoid: 1.82,
  minotaur: 2.28,
  golem: 2.12,
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
    // Blueprint male base — female overrides in lookFor().
    skin: 0xc4a07a,
    cloth: 0x3f3228,
    accent: 0x6a5238,
    skinKind: "flesh",
    torso: { w: 0.38, d: 0.24, h: 0.54 },
    head: { r: 0.155 },
    limb: { arm: 0.48, leg: 0.58, thick: 0.075 },
    foot: { w: 0.12, d: 0.2, h: 0.07 },
  },
  elf: {
    // Blueprint male base — taller, leaner; female overrides in lookFor().
    skin: 0xd2c0a8,
    cloth: 0x2e3a32,
    accent: 0x7a9a68,
    skinKind: "flesh",
    torso: { w: 0.3, d: 0.19, h: 0.58 },
    head: { r: 0.14 },
    limb: { arm: 0.54, leg: 0.68, thick: 0.055 },
    foot: { w: 0.1, d: 0.18, h: 0.055 },
  },
  dwarf: {
    // Blueprint: broad barrel chest, short powerful limbs.
    skin: 0xa67a52,
    cloth: 0x4a3224,
    accent: 0xc4a060,
    skinKind: "flesh",
    torso: { w: 0.44, d: 0.32, h: 0.42 },
    head: { r: 0.17 },
    limb: { arm: 0.34, leg: 0.34, thick: 0.095 },
    foot: { w: 0.14, d: 0.2, h: 0.08 },
  },
  gnome: {
    // Blueprint: oversized head, stocky compact tinkerer.
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
    // Blueprint: round torso, oversized hairy feet, compact biped.
    skin: 0xc4a07a,
    cloth: 0x4a5a32,
    accent: 0x6a4a28,
    skinKind: "flesh",
    torso: { w: 0.36, d: 0.26, h: 0.36 },
    head: { r: 0.16 },
    limb: { arm: 0.3, leg: 0.3, thick: 0.075 },
    foot: { w: 0.16, d: 0.26, h: 0.08 },
  },
  insectoid: {
    // Blueprint: olive chitin, bright plate ridges, long digitigrade reach.
    skin: 0x4e6636,
    cloth: 0x1a2412,
    accent: 0x8eb84a,
    skinKind: "chitin",
    emissive: 0x2a4018,
    emit: 0.1,
    torso: { w: 0.34, d: 0.3, h: 0.54 },
    head: { r: 0.145 },
    limb: { arm: 0.5, leg: 0.62, thick: 0.055 },
    foot: { w: 0.12, d: 0.3, h: 0.055 },
  },
  minotaur: {
    // Blueprint: broad bovine thorax, digitigrade hocks, horned juggernaut.
    skin: 0x6a4828,
    cloth: 0x2a1c12,
    accent: 0xc4a878,
    skinKind: "fur",
    torso: { w: 0.56, d: 0.4, h: 0.64 },
    head: { r: 0.22 },
    limb: { arm: 0.54, leg: 0.68, thick: 0.12 },
    foot: { w: 0.18, d: 0.32, h: 0.1 },
  },
  golem: {
    // Blueprint: interlocking stone blocks, recessed head, heavy impact fists.
    skin: 0x6e6860,
    cloth: 0x454038,
    accent: 0xd4b060,
    skinKind: "stone",
    emissive: 0x6a4818,
    emit: 0.14,
    torso: { w: 0.58, d: 0.42, h: 0.68 },
    head: { r: 0.14 },
    limb: { arm: 0.5, leg: 0.48, thick: 0.14 },
    foot: { w: 0.22, d: 0.26, h: 0.14 },
  },
  lizard: {
    // Lacerta blueprint: swamp-green scale, cream underbelly, gold crest accents.
    skin: 0x3d6a42,
    cloth: 0xc4b896,
    accent: 0xb8923a,
    skinKind: "scale",
    torso: { w: 0.38, d: 0.28, h: 0.52 },
    head: { r: 0.16 },
    limb: { arm: 0.5, leg: 0.56, thick: 0.07 },
    foot: { w: 0.14, d: 0.28, h: 0.08 },
  },
  undead: {
    // Blueprint: gaunt necrotic flesh over visible ribs/bone.
    skin: 0x7a8470,
    cloth: 0x2a2420,
    accent: 0x9ab070,
    skinKind: "bone",
    emissive: 0x2a4018,
    emit: 0.1,
    torso: { w: 0.34, d: 0.22, h: 0.52 },
    head: { r: 0.15 },
    limb: { arm: 0.48, leg: 0.54, thick: 0.058 },
    foot: { w: 0.11, d: 0.2, h: 0.06 },
  },
};

export function heroHeightFor(race: RaceId, gender: Gender = "male"): number {
  const base = HERO_HEIGHT[race];
  if (raceHasGender(race) && gender === "female") return base * 0.95;
  return base;
}

function lookFor(race: RaceId, gender: Gender): RaceLook {
  const base = LOOK[race];
  if (gender !== "female") return base;
  if (race === "human") {
    return {
      ...base,
      torso: { w: 0.3, d: 0.2, h: 0.5 },
      head: { r: 0.148 },
      limb: { arm: 0.44, leg: 0.55, thick: 0.06 },
      foot: { w: 0.1, d: 0.18, h: 0.06 },
    };
  }
  if (race === "elf") {
    return {
      ...base,
      torso: { w: 0.25, d: 0.16, h: 0.55 },
      head: { r: 0.132 },
      limb: { arm: 0.52, leg: 0.66, thick: 0.048 },
      foot: { w: 0.09, d: 0.16, h: 0.05 },
    };
  }
  if (race === "gnome") {
    return {
      ...base,
      torso: { w: 0.28, d: 0.2, h: 0.32 },
      head: { r: 0.18 },
      limb: { arm: 0.26, leg: 0.26, thick: 0.055 },
      foot: { w: 0.1, d: 0.15, h: 0.055 },
    };
  }
  if (race === "dwarf") {
    return {
      ...base,
      torso: { w: 0.4, d: 0.28, h: 0.4 },
      head: { r: 0.165 },
      limb: { arm: 0.32, leg: 0.32, thick: 0.09 },
      foot: { w: 0.13, d: 0.18, h: 0.075 },
    };
  }
  if (race === "hobbit") {
    return {
      ...base,
      torso: { w: 0.34, d: 0.24, h: 0.34 },
      head: { r: 0.155 },
      limb: { arm: 0.28, leg: 0.28, thick: 0.07 },
      foot: { w: 0.15, d: 0.24, h: 0.075 },
    };
  }
  if (race === "undead") {
    return {
      ...base,
      torso: { w: 0.28, d: 0.18, h: 0.5 },
      head: { r: 0.142 },
      limb: { arm: 0.46, leg: 0.52, thick: 0.052 },
      foot: { w: 0.1, d: 0.18, h: 0.055 },
    };
  }
  if (race === "lizard") {
    return {
      ...base,
      torso: { w: 0.3, d: 0.22, h: 0.5 },
      head: { r: 0.145 },
      limb: { arm: 0.46, leg: 0.54, thick: 0.058 },
      foot: { w: 0.12, d: 0.24, h: 0.07 },
    };
  }
  return base;
}

export function buildHero(race: RaceId, gender: Gender = "male"): THREE.Group {
  // Minotaur / golem are unisex — always the same form regardless of stored gender.
  const sex: Gender = raceHasGender(race) && gender === "female" ? "female" : "male";
  const look = lookFor(race, sex);
  const height = heroHeightFor(race, sex);
  const root = new THREE.Group();
  root.name = raceHasGender(race) ? `hero-${race}-${sex}` : `hero-${race}`;

  const skin = skinMat(look);
  const cloth = clothMat(look.cloth);
  const accent = accentMat(look);

  const hips = new THREE.Group();
  hips.name = "hips";
  hips.position.y = look.limb.leg + look.foot.h;
  root.add(hips);

  const bipedKit =
    race === "human" ||
    race === "elf" ||
    race === "gnome" ||
    race === "dwarf" ||
    race === "hobbit" ||
    race === "undead" ||
    race === "lizard";
  const wideHips = sex === "female" && bipedKit;
  const pelvis = part(
    "Hips",
    box(look.torso.w * (wideHips ? 1.12 : race === "dwarf" || race === "hobbit" ? 1.0 : 0.9), 0.14, look.torso.d * 0.95),
    bipedKit ? skin : cloth,
  );
  hips.add(pelvis);

  const spine = new THREE.Group();
  spine.name = "spine";
  spine.position.y = 0.08;
  hips.add(spine);

  const chest = new THREE.Group();
  chest.name = "chest";
  chest.position.y = look.torso.h * 0.5;
  spine.add(chest);

  const fleshy =
    race === "insectoid" ||
    race === "minotaur" ||
    race === "golem" ||
    race === "human" ||
    race === "elf" ||
    race === "gnome" ||
    race === "dwarf" ||
    race === "hobbit" ||
    race === "undead" ||
    race === "lizard";
  const body = part("Body", box(look.torso.w, look.torso.h, look.torso.d), fleshy ? skin : cloth);
  chest.add(body);

  if (race === "insectoid") buildInsectoidThorax(chest, hips, look, skin, accent);
  if (race === "minotaur") buildMinotaurThorax(chest, hips, look, skin, accent, cloth);
  if (race === "golem") buildGolemThorax(chest, hips, look, skin, accent);
  if (race === "human") buildHumanThorax(chest, hips, look, skin, accent, cloth, sex);
  if (race === "elf") buildElfThorax(chest, hips, look, skin, accent, cloth, sex);
  if (race === "gnome") buildGnomeThorax(chest, hips, look, skin, accent, cloth, sex);
  if (race === "dwarf") buildDwarfThorax(chest, hips, look, skin, accent, cloth, sex);
  if (race === "hobbit") buildHobbitThorax(chest, hips, look, skin, accent, cloth, sex);
  if (race === "undead") buildUndeadThorax(chest, hips, look, skin, accent, cloth, sex);
  if (race === "lizard") buildLizardThorax(chest, hips, look, skin, accent, cloth, sex);

  if (race === "insectoid") {
    for (let i = 0; i < 2; i++) {
      const ring = part(`NeckSeg${i}`, new THREE.CylinderGeometry(0.045 + i * 0.008, 0.055 + i * 0.006, 0.055, 8), i === 0 ? accent : skin);
      ring.position.y = look.torso.h * 0.5 + 0.04 + i * 0.05;
      chest.add(ring);
    }
  } else if (race === "minotaur") {
    const neck = part("Neck", new THREE.CylinderGeometry(0.1, 0.14, 0.16, 10), skin);
    neck.position.y = look.torso.h * 0.5 + 0.08;
    chest.add(neck);
  } else if (race === "golem") {
    // Recessed head sits in the shoulder shelf — short stone collar only.
    const collar = part("Neck", box(0.22, 0.08, 0.2), accent);
    collar.position.y = look.torso.h * 0.48;
    chest.add(collar);
  } else if (race === "elf") {
    // Cervical elongation — longer, thinner neck.
    const neck = part("Neck", new THREE.CylinderGeometry(0.038, 0.048, 0.16, 8), skin);
    neck.position.y = look.torso.h * 0.5 + 0.1;
    chest.add(neck);
  } else if (race === "undead") {
    // Cervical decay — thin, patchy vertebrae column.
    const neck = part("Neck", new THREE.CylinderGeometry(0.035, 0.045, 0.14, 6), accent);
    neck.position.y = look.torso.h * 0.5 + 0.08;
    chest.add(neck);
  } else if (race === "lizard") {
    // Cervical elongation array — longer reptilian neck.
    const neck = part("Neck", new THREE.CylinderGeometry(0.042, 0.055, 0.18, 8), skin);
    neck.position.y = look.torso.h * 0.5 + 0.1;
    chest.add(neck);
  } else {
    const neck = part("Neck", new THREE.CylinderGeometry(0.05, 0.06, race === "human" ? 0.12 : 0.1, 8), skin);
    neck.position.y = look.torso.h * 0.5 + (race === "human" ? 0.08 : 0.06);
    chest.add(neck);
  }

  const head = new THREE.Group();
  head.name = "head";
  head.position.y =
    race === "golem"
      ? look.torso.h * 0.42
      : race === "elf" || race === "lizard"
        ? look.torso.h * 0.5 + 0.22 + look.head.r * 0.2
        : look.torso.h * 0.5 + 0.16 + look.head.r * 0.2;
  if (race === "golem") head.position.z = -0.04;
  chest.add(head);

  if (race === "insectoid") {
    buildInsectoidHead(head, look, skin, accent);
  } else if (race === "minotaur") {
    buildMinotaurHead(head, look, skin, accent);
  } else if (race === "golem") {
    buildGolemHead(head, look, skin, accent);
  } else if (race === "human") {
    buildHumanHead(head, look, skin, accent, sex);
  } else if (race === "elf") {
    buildElfHead(head, look, skin, accent, sex);
  } else if (race === "gnome") {
    buildGnomeHead(head, look, skin, accent, cloth, sex);
  } else if (race === "dwarf") {
    buildDwarfHead(head, look, skin, accent, sex);
  } else if (race === "hobbit") {
    buildHobbitHead(head, look, skin, accent, sex);
  } else if (race === "undead") {
    buildUndeadHead(head, look, skin, accent, sex);
  } else if (race === "lizard") {
    buildLizardHead(head, look, skin, accent, sex);
  } else {
    const skull = part("Head", new THREE.SphereGeometry(look.head.r, 24, 18), skin);
    head.add(skull);
    addFace(head, race, look, skin, accent);
  }
  addRaceFeatures(root, head, chest, hips, race, look, skin, cloth, accent);

  if (race === "insectoid") {
    // Primary (upper) + secondary (lower thoracic) manipulators — keep handslot names for gear.
    addInsectoidArm(chest, "ArmLeft", -look.torso.w * 0.58, look.limb.arm, look.limb.thick, skin, accent, "", 0.2, 0.02);
    addInsectoidArm(chest, "ArmRight", look.torso.w * 0.58, look.limb.arm, look.limb.thick, skin, accent, "", 0.2, 0.02);
    const lowerX = look.torso.w * 0.72;
    addInsectoidArm(chest, "ArmLeft2", -lowerX, look.limb.arm * 0.88, look.limb.thick * 0.86, skin, accent, "2", -0.2, 0.12);
    addInsectoidArm(chest, "ArmRight2", lowerX, look.limb.arm * 0.88, look.limb.thick * 0.86, skin, accent, "2", -0.2, 0.12);
    addInsectoidLeg(hips, "LegLeft", -look.torso.w * 0.26, look.limb.leg, look.limb.thick * 1.05, look.foot, skin, accent);
    addInsectoidLeg(hips, "LegRight", look.torso.w * 0.26, look.limb.leg, look.limb.thick * 1.05, look.foot, skin, accent);
  } else if (race === "minotaur") {
    addMinotaurArm(chest, "ArmLeft", -look.torso.w * 0.58, look.limb.arm, look.limb.thick, skin, accent);
    addMinotaurArm(chest, "ArmRight", look.torso.w * 0.58, look.limb.arm, look.limb.thick, skin, accent);
    addMinotaurLeg(hips, "LegLeft", -look.torso.w * 0.3, look.limb.leg, look.limb.thick, look.foot, skin, accent);
    addMinotaurLeg(hips, "LegRight", look.torso.w * 0.3, look.limb.leg, look.limb.thick, look.foot, skin, accent);
  } else if (race === "golem") {
    addGolemArm(chest, "ArmLeft", -look.torso.w * 0.62, look.limb.arm, look.limb.thick, skin, accent);
    addGolemArm(chest, "ArmRight", look.torso.w * 0.62, look.limb.arm, look.limb.thick, skin, accent);
    addGolemLeg(hips, "LegLeft", -look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, accent);
    addGolemLeg(hips, "LegRight", look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, accent);
  } else if (race === "lizard") {
    addLizardArm(chest, "ArmLeft", -look.torso.w * 0.55, look.limb.arm, look.limb.thick, skin, accent);
    addLizardArm(chest, "ArmRight", look.torso.w * 0.55, look.limb.arm, look.limb.thick, skin, accent);
    addLizardLeg(hips, "LegLeft", -look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, accent);
    addLizardLeg(hips, "LegRight", look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, accent);
  } else if (race === "human" || race === "elf" || race === "gnome" || race === "dwarf" || race === "hobbit" || race === "undead") {
    const lean = race === "elf" || race === "undead";
    const stout = race === "dwarf" || race === "gnome" || race === "hobbit";
    const hairyFeet = race === "hobbit";
    addHumanoidArm(chest, "ArmLeft", -look.torso.w * (stout ? 0.58 : 0.55), look.limb.arm, look.limb.thick, skin, accent, lean);
    addHumanoidArm(chest, "ArmRight", look.torso.w * (stout ? 0.58 : 0.55), look.limb.arm, look.limb.thick, skin, accent, lean);
    addHumanoidLeg(hips, "LegLeft", -look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, cloth, lean, hairyFeet);
    addHumanoidLeg(hips, "LegRight", look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, cloth, lean, hairyFeet);
  } else {
    addLimb(hips, "LegLeft", -look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, cloth, true);
    addLimb(hips, "LegRight", look.torso.w * 0.28, look.limb.leg, look.limb.thick, look.foot, skin, cloth, true);
    addLimb(chest, "ArmLeft", -look.torso.w * 0.55, look.limb.arm, look.limb.thick * 0.9, null, skin, cloth, false);
    addLimb(chest, "ArmRight", look.torso.w * 0.55, look.limb.arm, look.limb.thick * 0.9, null, skin, cloth, false);
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
  // Biped kit races use dedicated blueprint helpers.
  void root;
  void head;
  void chest;
  void hips;
  void race;
  void look;
  void skin;
  void cloth;
  void accent;
}

/** Segmented thorax + trailing gaster from the insectoid fighter blueprint. */
function buildInsectoidThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const plate = part(
      `ThoraxPlate${i}`,
      box(look.torso.w * (1.08 - t * 0.08), look.torso.h * 0.16, look.torso.d * (1.18 - t * 0.06)),
      i % 2 === 0 ? accent : skin,
    );
    plate.position.set(0, look.torso.h * (0.28 - t * 0.52), 0.015);
    chest.add(plate);
  }
  // Modified thoracic mounts where the secondary arms attach.
  for (const side of [-1, 1]) {
    const mount = part("ThoraxMount", new THREE.SphereGeometry(0.055, 10, 8), accent);
    mount.position.set(side * look.torso.w * 0.62, -0.12, 0.06);
    chest.add(mount);
    const ridge = part("ThoraxRidge", box(0.04, 0.12, 0.08), accent);
    ridge.position.set(side * look.torso.w * 0.52, 0.08, look.torso.d * 0.48);
    chest.add(ridge);
  }
  const carapace = part("Carapace", box(look.torso.w * 0.7, 0.1, look.torso.d * 0.55), accent);
  carapace.position.set(0, look.torso.h * 0.42, -look.torso.d * 0.15);
  carapace.rotation.x = -0.35;
  chest.add(carapace);

  const gaster = new THREE.Group();
  gaster.name = "Abdomen";
  gaster.position.set(0, -0.08, -look.torso.d * 0.55);
  hips.add(gaster);
  for (let i = 0; i < 3; i++) {
    const seg = part(
      `Gaster${i}`,
      new THREE.SphereGeometry(0.14 - i * 0.018, 12, 10),
      i === 1 ? accent : skin,
    );
    seg.scale.set(1.15 - i * 0.08, 0.78, 1.25 - i * 0.1);
    seg.position.set(0, -0.02 - i * 0.04, -0.1 - i * 0.14);
    gaster.add(seg);
  }
}

/** Compound eyes, mandibles, and multi-segment antennae. */
function buildInsectoidHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 20, 16), skin);
  skull.scale.set(1.05, 0.95, 1.2);
  head.add(skull);
  const brow = part("BrowPlate", box(r * 1.6, r * 0.35, r * 0.7), accent);
  brow.position.set(0, r * 0.35, r * 0.55);
  head.add(brow);

  const eyeMat = mat(0xa8e050, 0.08, 0.35, 0x6a9a28, 0.45);
  const facetMat = mat(0x3a5020, 0.15, 0.4, 0x243818, 0.15);
  for (const side of [-1, 1]) {
    const socket = part(side < 0 ? "EyeSocketL" : "EyeSocketR", new THREE.SphereGeometry(0.06, 10, 8), facetMat);
    socket.position.set(side * r * 0.48, r * 0.12, r * 0.78);
    socket.scale.set(1.15, 1.05, 0.85);
    head.add(socket);
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.IcosahedronGeometry(0.048, 1), eyeMat);
    eye.position.copy(socket.position);
    eye.position.z += 0.02;
    head.add(eye);
  }

  for (const side of [-1, 1]) {
    const jaw = part(side < 0 ? "MandibleL" : "MandibleR", new THREE.ConeGeometry(0.035, 0.14, 6), accent);
    jaw.rotation.set(1.15, 0, side * 0.55);
    jaw.position.set(side * r * 0.28, -r * 0.45, r * 0.7);
    head.add(jaw);
    const tip = part("MandibleTip", new THREE.ConeGeometry(0.018, 0.07, 5), skin);
    tip.rotation.copy(jaw.rotation);
    tip.position.set(side * r * 0.38, -r * 0.62, r * 0.88);
    head.add(tip);
  }

  for (const side of [-1, 1]) {
    const base = new THREE.Group();
    base.name = side < 0 ? "AntennaL" : "AntennaR";
    base.position.set(side * r * 0.35, r * 0.75, r * 0.15);
    head.add(base);
    let y = 0;
    for (let i = 0; i < 3; i++) {
      const segLen = 0.1 - i * 0.012;
      const seg = part(`AntennaSeg${i}`, new THREE.CylinderGeometry(0.014 - i * 0.002, 0.018 - i * 0.002, segLen, 6), i === 1 ? accent : skin);
      seg.rotation.z = side * (0.28 + i * 0.12);
      seg.rotation.x = -0.15 * i;
      seg.position.set(side * i * 0.02, y + segLen * 0.5, i * 0.01);
      base.add(seg);
      y += segLen * 0.85;
    }
    const tip = part("AntennaTip", new THREE.SphereGeometry(0.028, 8, 6), accent);
    tip.position.set(side * 0.08, y + 0.04, 0.04);
    base.add(tip);
  }
}

/** Primary / secondary manipulator with actuator joints and a three-digit claw. */
function addInsectoidArm(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  skin: THREE.Material,
  accent: THREE.Material,
  handSuffix: string,
  yOffset: number,
  zOffset: number,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0.16 + yOffset, zOffset);
  parent.add(group);

  const shoulder = part(`${name}Shoulder`, new THREE.SphereGeometry(thick * 1.55, 10, 8), accent);
  shoulder.position.y = 0.02;
  group.add(shoulder);

  const upper = part(`${name}Upper`, new THREE.CapsuleGeometry(thick, Math.max(0.08, length * 0.42), 6, 10), skin);
  upper.position.y = -length * 0.28;
  group.add(upper);
  const upperPlate = part(`${name}Plate`, box(thick * 2.2, length * 0.28, thick * 1.4), accent);
  upperPlate.position.set(0, -length * 0.24, thick * 0.6);
  group.add(upperPlate);

  const elbow = part(`${name}Elbow`, new THREE.SphereGeometry(thick * 1.25, 10, 8), accent);
  elbow.position.y = -length * 0.52;
  group.add(elbow);

  const lower = part(`${name}Lower`, new THREE.CapsuleGeometry(thick * 0.88, Math.max(0.08, length * 0.36), 6, 10), skin);
  lower.position.y = -length * 0.74;
  group.add(lower);

  const left = name.startsWith("ArmLeft");
  const handY = -length * 0.96;
  const palm = part(left ? `hand.l${handSuffix}` : `hand.r${handSuffix}`, new THREE.SphereGeometry(thick * 1.2, 10, 8), skin);
  palm.position.y = handY;
  group.add(palm);
  for (let i = 0; i < 3; i++) {
    const claw = part("Claw", new THREE.ConeGeometry(thick * 0.35, thick * 1.8, 5), accent);
    claw.rotation.x = Math.PI;
    claw.position.set((i - 1) * thick * 1.1, handY - thick * 1.4, thick * (i === 1 ? 0.6 : 0.15));
    group.add(claw);
  }
  const slot = new THREE.Group();
  slot.name = left ? `handslot.l${handSuffix}` : `handslot.r${handSuffix}`;
  slot.position.set(0, handY - thick * 0.4, thick * 0.35);
  group.add(slot);
}

/** Digitigrade leg: raised heel, forward metatarsal, clawed toes. */
function addInsectoidLeg(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  foot: { w: number; d: number; h: number },
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, 0);
  parent.add(group);

  const hip = part(`${name}Hip`, new THREE.SphereGeometry(thick * 1.5, 10, 8), accent);
  group.add(hip);

  const thigh = part(`${name}Upper`, new THREE.CapsuleGeometry(thick, Math.max(0.08, length * 0.38), 6, 10), skin);
  thigh.position.set(0, -length * 0.28, 0.02);
  group.add(thigh);

  const knee = part(`${name}Knee`, new THREE.SphereGeometry(thick * 1.3, 10, 8), accent);
  knee.position.set(0, -length * 0.5, 0.06);
  group.add(knee);

  const shin = part(`${name}Lower`, new THREE.CapsuleGeometry(thick * 0.9, Math.max(0.08, length * 0.32), 6, 10), skin);
  shin.position.set(0, -length * 0.72, 0.1);
  group.add(shin);

  const ankle = part(`${name}Ankle`, new THREE.SphereGeometry(thick * 1.05, 8, 6), accent);
  ankle.position.set(0, -length * 0.9, 0.16);
  group.add(ankle);

  const metatarsal = part(name === "LegLeft" ? "FootLeft" : "FootRight", box(foot.w * 0.85, foot.h, foot.d * 0.7), skin);
  metatarsal.position.set(0, -length - foot.h * 0.15, foot.d * 0.35);
  metatarsal.rotation.x = -0.35;
  group.add(metatarsal);

  for (let i = 0; i < 3; i++) {
    const toe = part("ToeClaw", new THREE.ConeGeometry(0.02, 0.09, 5), accent);
    toe.rotation.x = Math.PI / 2;
    toe.position.set((i - 1) * foot.w * 0.32, -length - foot.h * 0.05, foot.d * 0.72);
    group.add(toe);
  }
}

/** Broad bovine thorax — juggernaut silhouette from the minotaur blueprint. */
function buildMinotaurThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
): void {
  const pec = part("BovinePecs", box(look.torso.w * 1.08, look.torso.h * 0.42, look.torso.d * 1.12), skin);
  pec.position.set(0, look.torso.h * 0.12, 0.04);
  chest.add(pec);
  for (const side of [-1, 1]) {
    const deltoid = part("Deltoid", new THREE.SphereGeometry(0.12, 10, 8), skin);
    deltoid.scale.set(1.15, 0.9, 1.05);
    deltoid.position.set(side * look.torso.w * 0.55, look.torso.h * 0.28, 0.02);
    chest.add(deltoid);
  }
  const sternum = part("Sternum", box(0.08, look.torso.h * 0.45, 0.06), accent);
  sternum.position.set(0, 0.04, look.torso.d * 0.55);
  chest.add(sternum);
  const belt = part("WaistWrap", box(look.torso.w * 0.95, 0.1, look.torso.d * 1.05), cloth);
  belt.position.y = -look.torso.h * 0.35;
  chest.add(belt);
  const rump = part("Haunch", box(look.torso.w * 0.85, 0.18, look.torso.d * 1.05), skin);
  rump.position.set(0, 0.02, -0.04);
  hips.add(rump);
}

/** Bull head with reinforced upward-curving horns and broad muzzle. */
function buildMinotaurHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 18, 14), skin);
  skull.scale.set(1.15, 1.05, 1.2);
  head.add(skull);
  const muzzle = part("Muzzle", new THREE.CapsuleGeometry(0.09, 0.16, 5, 10), skin);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, -r * 0.25, r * 0.95);
  head.add(muzzle);
  const nose = part("NoseRing", new THREE.TorusGeometry(0.04, 0.01, 6, 12), accent);
  nose.position.set(0, -r * 0.35, r * 1.25);
  nose.rotation.x = Math.PI / 2;
  head.add(nose);
  const eyeMat = mat(0x1a120c, 0.05, 0.55);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.SphereGeometry(0.032, 8, 6), eyeMat);
    eye.position.set(side * r * 0.42, r * 0.15, r * 0.85);
    head.add(eye);
    const brow = part("Brow", box(0.1, 0.04, 0.06), skin);
    brow.position.set(side * r * 0.4, r * 0.32, r * 0.75);
    brow.rotation.z = side * -0.25;
    head.add(brow);
  }
  for (const side of [-1, 1]) {
    const base = part(side < 0 ? "HornLeft" : "HornRight", new THREE.CylinderGeometry(0.045, 0.06, 0.14, 8), accent);
    base.rotation.z = side * -0.55;
    base.rotation.x = -0.35;
    base.position.set(side * r * 0.7, r * 0.55, -0.02);
    head.add(base);
    const mid = part("HornMid", new THREE.CylinderGeometry(0.028, 0.042, 0.18, 7), accent);
    mid.rotation.z = side * -0.95;
    mid.rotation.x = -0.15;
    mid.position.set(side * r * 0.95, r * 0.85, -0.04);
    head.add(mid);
    const tip = part("HornTip", new THREE.ConeGeometry(0.028, 0.16, 7), accent);
    tip.rotation.z = side * -1.15;
    tip.rotation.x = 0.1;
    tip.position.set(side * r * 1.12, r * 1.12, -0.02);
    head.add(tip);
  }
  const earL = part("EarLeft", new THREE.ConeGeometry(0.05, 0.1, 6), skin);
  earL.rotation.set(0.4, 0, 1.1);
  earL.position.set(-r * 0.95, r * 0.15, 0);
  const earR = part("EarRight", new THREE.ConeGeometry(0.05, 0.1, 6), skin);
  earR.rotation.set(0.4, 0, -1.1);
  earR.position.set(r * 0.95, r * 0.15, 0);
  head.add(earL, earR);
}

function addMinotaurArm(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0.22, 0.02);
  parent.add(group);

  const shoulder = part(`${name}Shoulder`, new THREE.SphereGeometry(thick * 1.7, 10, 8), skin);
  group.add(shoulder);
  const upper = part(`${name}Upper`, new THREE.CapsuleGeometry(thick * 1.15, Math.max(0.08, length * 0.4), 6, 10), skin);
  upper.position.y = -length * 0.28;
  group.add(upper);
  const elbow = part(`${name}Elbow`, new THREE.SphereGeometry(thick * 1.2, 8, 6), accent);
  elbow.position.y = -length * 0.52;
  group.add(elbow);
  const lower = part(`${name}Lower`, new THREE.CapsuleGeometry(thick, Math.max(0.08, length * 0.34), 6, 10), skin);
  lower.position.y = -length * 0.74;
  group.add(lower);

  const left = name.startsWith("ArmLeft");
  const handY = -length * 0.96;
  const palm = part(left ? "hand.l" : "hand.r", new THREE.SphereGeometry(thick * 1.25, 10, 8), skin);
  palm.position.y = handY;
  group.add(palm);
  for (let i = 0; i < 4; i++) {
    const finger = part("Finger", new THREE.CapsuleGeometry(thick * 0.28, thick * 0.7, 3, 6), skin);
    finger.position.set((i - 1.5) * thick * 0.7, handY - thick * 1.35, thick * 0.2);
    group.add(finger);
  }
  const slot = new THREE.Group();
  slot.name = left ? "handslot.l" : "handslot.r";
  slot.position.set(0, handY - thick * 0.3, thick * 0.25);
  group.add(slot);
}

/** Digitigrade hocks ending in cloven hooves. */
function addMinotaurLeg(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  foot: { w: number; d: number; h: number },
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, 0);
  parent.add(group);

  const thigh = part(`${name}Upper`, new THREE.CapsuleGeometry(thick * 1.2, Math.max(0.08, length * 0.36), 6, 10), skin);
  thigh.position.set(0, -length * 0.26, 0.02);
  group.add(thigh);
  const knee = part(`${name}Knee`, new THREE.SphereGeometry(thick * 1.25, 8, 6), accent);
  knee.position.set(0, -length * 0.48, 0.05);
  group.add(knee);
  const shin = part(`${name}Lower`, new THREE.CapsuleGeometry(thick * 0.95, Math.max(0.08, length * 0.28), 6, 10), skin);
  shin.position.set(0, -length * 0.68, 0.1);
  group.add(shin);
  const hock = part(`${name}Hock`, new THREE.SphereGeometry(thick * 1.05, 8, 6), accent);
  hock.position.set(0, -length * 0.86, 0.14);
  group.add(hock);
  const cannon = part(`${name}Cannon`, new THREE.CapsuleGeometry(thick * 0.7, Math.max(0.06, length * 0.12), 5, 8), skin);
  cannon.position.set(0, -length * 0.96, 0.2);
  group.add(cannon);

  const hoof = part(name === "LegLeft" ? "FootLeft" : "FootRight", box(foot.w, foot.h, foot.d * 0.55), accent);
  hoof.position.set(0, -length - foot.h * 0.2, foot.d * 0.28);
  group.add(hoof);
  for (const side of [-1, 1]) {
    const cleft = part("HoofCleft", box(foot.w * 0.38, foot.h * 0.9, foot.d * 0.35), accent);
    cleft.position.set(side * foot.w * 0.28, -length - foot.h * 0.15, foot.d * 0.55);
    group.add(cleft);
  }
}

/** Interlocking stone torso with a glowing runic core. */
function buildGolemThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const blocks: Array<[number, number, number, number, number, number]> = [
    [0, 0.18, 0.02, 1.05, 0.38, 1.08],
    [-0.14, -0.02, 0.04, 0.55, 0.28, 0.9],
    [0.14, -0.02, 0.04, 0.55, 0.28, 0.9],
    [0, -0.2, 0, 0.9, 0.22, 0.95],
  ];
  for (const [dx, dy, dz, sw, sh, sd] of blocks) {
    const block = part("StoneBlock", box(look.torso.w * sw, look.torso.h * sh, look.torso.d * sd), skin);
    block.position.set(dx, dy * look.torso.h, dz);
    chest.add(block);
  }
  for (const side of [-1, 1]) {
    const pauldron = part("Pauldron", box(0.2, 0.16, 0.22), accent);
    pauldron.position.set(side * look.torso.w * 0.55, look.torso.h * 0.32, 0);
    pauldron.rotation.z = side * -0.2;
    chest.add(pauldron);
  }
  const coreGlow = mat(look.accent, 0.4, 0.35, look.emissive ?? 0x6a4818, 0.85);
  const core = part("Core", new THREE.OctahedronGeometry(0.1, 0), coreGlow);
  core.position.set(0, 0.02, look.torso.d * 0.55);
  chest.add(core);
  const rune = part("RuneRing", new THREE.TorusGeometry(0.14, 0.018, 6, 16), coreGlow);
  rune.position.copy(core.position);
  rune.position.z += 0.02;
  chest.add(rune);
  const pelvis = part("StonePelvis", box(look.torso.w * 0.85, 0.16, look.torso.d * 0.9), skin);
  pelvis.position.y = 0.02;
  hips.add(pelvis);
}

function buildGolemHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material): void {
  const r = look.head.r;
  const skull = part("Head", box(r * 1.9, r * 2.0, r * 1.7), skin);
  head.add(skull);
  const brow = part("BrowPlate", box(r * 1.7, r * 0.35, r * 0.5), accent);
  brow.position.set(0, r * 0.55, r * 0.7);
  head.add(brow);
  const jaw = part("JawBlock", box(r * 1.5, r * 0.45, r * 0.9), skin);
  jaw.position.set(0, -r * 0.55, r * 0.25);
  head.add(jaw);
  const eyeMat = mat(0xe0c060, 0.2, 0.35, 0xc4a040, 0.7);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", box(0.05, 0.035, 0.04), eyeMat);
    eye.position.set(side * r * 0.4, r * 0.15, r * 0.9);
    head.add(eye);
  }
}

function addGolemArm(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0.18, 0);
  parent.add(group);

  const shoulder = part(`${name}Shoulder`, box(thick * 2.4, thick * 2.2, thick * 2.4), accent);
  group.add(shoulder);
  const upper = part(`${name}Upper`, box(thick * 2.0, length * 0.42, thick * 2.0), skin);
  upper.position.y = -length * 0.28;
  group.add(upper);
  const elbow = part(`${name}Elbow`, box(thick * 1.8, thick * 1.5, thick * 1.8), accent);
  elbow.position.y = -length * 0.52;
  group.add(elbow);
  const lower = part(`${name}Lower`, box(thick * 1.9, length * 0.34, thick * 1.9), skin);
  lower.position.y = -length * 0.74;
  group.add(lower);

  const left = name.startsWith("ArmLeft");
  const handY = -length * 0.98;
  // Heavy impact fist — blocky, not fingered.
  const fist = part(left ? "hand.l" : "hand.r", box(thick * 2.6, thick * 2.4, thick * 2.8), accent);
  fist.position.y = handY;
  group.add(fist);
  const knuckle = part("Knuckle", box(thick * 2.8, thick * 0.7, thick * 1.2), skin);
  knuckle.position.set(0, handY - thick * 0.6, thick * 1.1);
  group.add(knuckle);
  const slot = new THREE.Group();
  slot.name = left ? "handslot.l" : "handslot.r";
  slot.position.set(0, handY - thick * 0.2, thick * 0.9);
  group.add(slot);
}

function addGolemLeg(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  foot: { w: number; d: number; h: number },
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, 0);
  parent.add(group);

  const upper = part(`${name}Upper`, box(thick * 2.2, length * 0.42, thick * 2.2), skin);
  upper.position.y = -length * 0.28;
  group.add(upper);
  const joint = part(`${name}Knee`, box(thick * 2.0, thick * 1.4, thick * 2.0), accent);
  joint.position.y = -length * 0.52;
  group.add(joint);
  const lower = part(`${name}Lower`, box(thick * 2.1, length * 0.36, thick * 2.1), skin);
  lower.position.y = -length * 0.78;
  group.add(lower);
  const boot = part(name === "LegLeft" ? "FootLeft" : "FootRight", box(foot.w * 1.15, foot.h, foot.d), accent);
  boot.position.set(0, -length - foot.h * 0.15, foot.d * 0.12);
  group.add(boot);
}

/** Shared articulated arm with fingered hands for biped kit races. */
function addHumanoidArm(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  skin: THREE.Material,
  accent: THREE.Material,
  lean: boolean,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, lean ? 0.2 : 0.18, 0);
  parent.add(group);
  const shoulder = part(`${name}Shoulder`, new THREE.SphereGeometry(thick * (lean ? 1.25 : 1.45), 10, 8), skin);
  group.add(shoulder);
  const upper = part(`${name}Upper`, new THREE.CapsuleGeometry(thick, Math.max(0.08, length * 0.42), 6, 10), skin);
  upper.position.y = -length * 0.28;
  group.add(upper);
  const elbow = part(`${name}Elbow`, new THREE.SphereGeometry(thick * 1.1, 8, 6), accent);
  elbow.position.y = -length * 0.52;
  group.add(elbow);
  const lower = part(`${name}Lower`, new THREE.CapsuleGeometry(thick * 0.9, Math.max(0.08, length * 0.34), 6, 10), skin);
  lower.position.y = -length * 0.74;
  group.add(lower);
  const left = name.startsWith("ArmLeft");
  const handY = -length * 0.96;
  const palm = part(left ? "hand.l" : "hand.r", new THREE.SphereGeometry(thick * 1.15, 10, 8), skin);
  palm.position.y = handY;
  group.add(palm);
  for (let i = 0; i < 4; i++) {
    const finger = part("Finger", new THREE.CapsuleGeometry(thick * 0.22, thick * 0.55, 3, 5), skin);
    finger.position.set((i - 1.5) * thick * 0.65, handY - thick * 1.2, thick * 0.15);
    group.add(finger);
  }
  const slot = new THREE.Group();
  slot.name = left ? "handslot.l" : "handslot.r";
  slot.position.set(0, handY - thick * 0.25, thick * 0.2);
  group.add(slot);
}

function addHumanoidLeg(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  foot: { w: number; d: number; h: number },
  skin: THREE.Material,
  cloth: THREE.Material,
  lean: boolean,
  hairyFeet = false,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, 0);
  parent.add(group);
  const thigh = part(`${name}Upper`, new THREE.CapsuleGeometry(thick * (lean ? 0.95 : 1.1), Math.max(0.08, length * 0.4), 6, 10), skin);
  thigh.position.y = -length * 0.3;
  group.add(thigh);
  const knee = part(`${name}Knee`, new THREE.SphereGeometry(thick * 1.05, 8, 6), cloth);
  knee.position.y = -length * 0.55;
  group.add(knee);
  const shin = part(`${name}Lower`, new THREE.CapsuleGeometry(thick * 0.9, Math.max(0.08, length * 0.34), 6, 10), skin);
  shin.position.y = -length * 0.78;
  group.add(shin);
  const shoe = part(name === "LegLeft" ? "FootLeft" : "FootRight", box(foot.w, foot.h, foot.d), hairyFeet ? skin : cloth);
  shoe.position.set(0, -length - foot.h * 0.2, foot.d * 0.15);
  group.add(shoe);
  if (hairyFeet) {
    const fur = part("FootFur", new THREE.SphereGeometry(foot.w * 0.45, 8, 6), cloth);
    fur.scale.set(1.2, 0.45, 1.4);
    fur.position.set(0, -length - foot.h * 0.05, foot.d * 0.2);
    group.add(fur);
  }
}

function buildHumanThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
  sex: Gender,
): void {
  const pecH = sex === "female" ? 0.28 : 0.38;
  const pec = part("Pecs", box(look.torso.w * (sex === "female" ? 0.95 : 1.05), look.torso.h * pecH, look.torso.d * 1.05), skin);
  pec.position.set(0, look.torso.h * (sex === "female" ? 0.14 : 0.1), 0.03);
  chest.add(pec);
  if (sex === "female") {
    for (const side of [-1, 1]) {
      const breast = part("Breast", new THREE.SphereGeometry(0.07, 10, 8), skin);
      breast.scale.set(1.1, 0.85, 0.9);
      breast.position.set(side * 0.08, look.torso.h * 0.08, look.torso.d * 0.45);
      chest.add(breast);
    }
  } else {
    for (const side of [-1, 1]) {
      const deltoid = part("Deltoid", new THREE.SphereGeometry(0.08, 8, 6), skin);
      deltoid.position.set(side * look.torso.w * 0.5, look.torso.h * 0.22, 0);
      chest.add(deltoid);
    }
  }
  const abs = part("Abs", box(look.torso.w * 0.7, look.torso.h * 0.28, look.torso.d * 0.85), skin);
  abs.position.set(0, -look.torso.h * 0.18, 0.02);
  chest.add(abs);
  const belt = part("BeltLine", box(look.torso.w * 0.95, 0.05, look.torso.d * 1.02), accent);
  belt.position.y = 0.02;
  hips.add(belt);
  void cloth;
}

function buildHumanHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material, sex: Gender): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 20, 16), skin);
  skull.scale.set(sex === "female" ? 0.95 : 1.05, 1, sex === "female" ? 0.95 : 1.05);
  head.add(skull);
  const eyeMat = mat(0x1a1410, 0.05, 0.55);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.SphereGeometry(0.026, 8, 6), eyeMat);
    eye.position.set(side * r * 0.35, r * 0.12, r * 0.85);
    head.add(eye);
  }
  const nose = part("Nose", new THREE.ConeGeometry(0.02, 0.05, 5), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0, r * 0.95);
  head.add(nose);
  if (sex === "male") {
    const jaw = part("Jaw", box(r * 1.1, r * 0.35, r * 0.7), skin);
    jaw.position.set(0, -r * 0.45, r * 0.15);
    head.add(jaw);
  } else {
    const cheek = part("CheekSoft", new THREE.SphereGeometry(r * 0.9, 12, 10), skin);
    cheek.scale.set(1.05, 0.85, 0.95);
    cheek.position.y = -r * 0.1;
    head.add(cheek);
  }
  void accent;
}

function buildElfThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
  sex: Gender,
): void {
  const rib = part("ElfRibs", box(look.torso.w * 0.95, look.torso.h * 0.5, look.torso.d * 1.02), skin);
  rib.position.set(0, look.torso.h * 0.05, 0.02);
  chest.add(rib);
  if (sex === "female") {
    for (const side of [-1, 1]) {
      const breast = part("Breast", new THREE.SphereGeometry(0.055, 10, 8), skin);
      breast.scale.set(1.05, 0.8, 0.85);
      breast.position.set(side * 0.065, look.torso.h * 0.1, look.torso.d * 0.48);
      chest.add(breast);
    }
  }
  const waist = part("FeyWaist", box(look.torso.w * 0.7, 0.08, look.torso.d * 0.9), accent);
  waist.position.y = -look.torso.h * 0.28;
  chest.add(waist);
  const sash = part("Sash", box(look.torso.w * 0.85, 0.04, look.torso.d * 1.05), cloth);
  sash.position.y = 0.02;
  hips.add(sash);
}

function buildElfHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material, sex: Gender): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 20, 16), skin);
  skull.scale.set(0.95, 1.08, 1.05);
  head.add(skull);
  const eyeMat = mat(0x3a5a48, 0.08, 0.45, 0x2a4030, 0.12);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
    eye.scale.set(1, sex === "female" ? 1.15 : 1, 1);
    eye.position.set(side * r * 0.32, r * 0.14, r * 0.88);
    head.add(eye);
    const ear = part(side < 0 ? "EarLeft" : "EarRight", new THREE.ConeGeometry(0.035, sex === "female" ? 0.2 : 0.24, 6), skin);
    ear.rotation.z = side * 0.85;
    ear.rotation.x = -0.4;
    ear.position.set(side * r * 0.95, r * 0.1, -0.02);
    head.add(ear);
  }
  void accent;
}

function buildGnomeThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
  sex: Gender,
): void {
  const belly = part("GnomeBelly", new THREE.SphereGeometry(look.torso.w * 0.55, 12, 10), skin);
  belly.scale.set(1.1, 0.85, 1.15);
  belly.position.set(0, -look.torso.h * 0.05, 0.04);
  chest.add(belly);
  if (sex === "female") {
    for (const side of [-1, 1]) {
      const breast = part("Breast", new THREE.SphereGeometry(0.05, 8, 6), skin);
      breast.position.set(side * 0.06, look.torso.h * 0.12, look.torso.d * 0.5);
      chest.add(breast);
    }
  }
  const vest = part("Vest", box(look.torso.w * 1.02, look.torso.h * 0.55, look.torso.d * 1.05), cloth);
  vest.position.set(0, look.torso.h * 0.05, 0);
  chest.add(vest);
  const belt = part("ToolBelt", box(look.torso.w * 1.05, 0.06, look.torso.d * 1.1), accent);
  belt.position.y = 0.02;
  hips.add(belt);
}

function buildGnomeHead(
  head: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
  sex: Gender,
): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 18, 14), skin);
  skull.scale.set(1.1, 1.05, 1.1);
  head.add(skull);
  const eyeMat = mat(0x2a2418, 0.05, 0.55);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.SphereGeometry(0.032, 8, 6), eyeMat);
    eye.position.set(side * r * 0.38, r * 0.08, r * 0.82);
    head.add(eye);
    const ear = part(side < 0 ? "EarLeft" : "EarRight", new THREE.ConeGeometry(0.04, 0.14, 6), skin);
    ear.rotation.z = side * 0.75;
    ear.position.set(side * r * 0.95, r * 0.05, 0);
    head.add(ear);
  }
  if (sex === "male") {
    const beard = part("Beard", new THREE.SphereGeometry(r * 0.7, 10, 8), accent);
    beard.scale.set(1.1, 0.85, 0.7);
    beard.position.set(0, -r * 0.55, r * 0.35);
    head.add(beard);
    const hat = part("Hat", new THREE.ConeGeometry(0.16, 0.34, 10), cloth);
    hat.position.y = r + 0.12;
    head.add(hat);
  } else {
    const bun = part("HairBun", new THREE.SphereGeometry(0.07, 10, 8), accent);
    bun.position.set(0, r * 0.85, -r * 0.3);
    head.add(bun);
    const fringe = part("Fringe", new THREE.SphereGeometry(r * 1.05, 10, 8), accent);
    fringe.scale.y = 0.45;
    fringe.position.y = r * 0.4;
    head.add(fringe);
  }
}

function buildDwarfThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
  sex: Gender,
): void {
  const barrel = part("DwarfBarrel", box(look.torso.w * 1.08, look.torso.h * 0.7, look.torso.d * 1.1), skin);
  barrel.position.set(0, 0.02, 0.02);
  chest.add(barrel);
  if (sex === "female") {
    for (const side of [-1, 1]) {
      const breast = part("Breast", new THREE.SphereGeometry(0.075, 10, 8), skin);
      breast.scale.set(1.15, 0.85, 0.9);
      breast.position.set(side * 0.1, look.torso.h * 0.1, look.torso.d * 0.48);
      chest.add(breast);
    }
  }
  const plate = part("ChestPlate", box(look.torso.w * 0.85, look.torso.h * 0.35, 0.06), accent);
  plate.position.set(0, look.torso.h * 0.08, look.torso.d * 0.55);
  chest.add(plate);
  const belt = part("BeltLine", box(look.torso.w * 1.05, 0.07, look.torso.d * 1.08), cloth);
  belt.position.y = 0.02;
  hips.add(belt);
}

function buildDwarfHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material, sex: Gender): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 18, 14), skin);
  skull.scale.set(1.15, 1.0, 1.1);
  head.add(skull);
  const eyeMat = mat(0x1a1410, 0.05, 0.55);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
    eye.position.set(side * r * 0.35, r * 0.1, r * 0.85);
    head.add(eye);
    const ear = part(side < 0 ? "EarLeft" : "EarRight", new THREE.ConeGeometry(0.035, 0.1, 5), skin);
    ear.rotation.z = side * 0.5;
    ear.position.set(side * r * 0.95, 0, 0);
    head.add(ear);
  }
  if (sex === "male") {
    const beard = part("Beard", new THREE.ConeGeometry(0.14, 0.28, 8), accent);
    beard.position.set(0, -r * 0.75, r * 0.35);
    head.add(beard);
    const braid = part("BeardBraid", new THREE.CylinderGeometry(0.03, 0.04, 0.16, 6), accent);
    braid.position.set(0, -r * 1.15, r * 0.4);
    head.add(braid);
  } else {
    for (const side of [-1, 1]) {
      const braid = part("HairBraid", new THREE.CylinderGeometry(0.025, 0.035, 0.28, 6), accent);
      braid.position.set(side * r * 0.55, -r * 0.2, -r * 0.15);
      braid.rotation.z = side * 0.25;
      head.add(braid);
    }
    const crown = part("HairCrown", new THREE.SphereGeometry(r * 1.05, 10, 8), accent);
    crown.scale.y = 0.5;
    crown.position.y = r * 0.45;
    head.add(crown);
  }
}

function buildHobbitThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
  sex: Gender,
): void {
  const round = part("HobbitTorso", new THREE.SphereGeometry(look.torso.w * 0.62, 12, 10), skin);
  round.scale.set(1.05, 0.9, 1.15);
  round.position.set(0, 0, 0.03);
  chest.add(round);
  if (sex === "female") {
    for (const side of [-1, 1]) {
      const breast = part("Breast", new THREE.SphereGeometry(0.055, 8, 6), skin);
      breast.position.set(side * 0.07, look.torso.h * 0.1, look.torso.d * 0.5);
      chest.add(breast);
    }
  }
  const vest = part("Waistcoat", box(look.torso.w * 1.02, look.torso.h * 0.5, look.torso.d * 1.05), cloth);
  vest.position.set(0, look.torso.h * 0.02, 0);
  chest.add(vest);
  const belt = part("Belt", box(look.torso.w * 1.0, 0.05, look.torso.d * 1.05), accent);
  belt.position.y = 0.02;
  hips.add(belt);
}

function buildHobbitHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material, sex: Gender): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 18, 14), skin);
  skull.scale.set(1.08, 1.0, 1.05);
  head.add(skull);
  const eyeMat = mat(0x2a2018, 0.05, 0.55);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
    eye.position.set(side * r * 0.34, r * 0.1, r * 0.85);
    head.add(eye);
    const ear = part(side < 0 ? "EarLeft" : "EarRight", new THREE.ConeGeometry(0.03, 0.09, 5), skin);
    ear.rotation.z = side * 0.45;
    ear.position.set(side * r * 0.92, 0.02, 0);
    head.add(ear);
  }
  const hair = part("Hair", new THREE.SphereGeometry(r * 1.08, 12, 10), accent);
  hair.scale.y = sex === "female" ? 0.65 : 0.5;
  hair.position.y = r * (sex === "female" ? 0.35 : 0.45);
  head.add(hair);
  if (sex === "male") {
    const sideburns = part("Sideburns", new THREE.SphereGeometry(r * 0.45, 8, 6), accent);
    sideburns.scale.set(1.3, 0.6, 0.5);
    sideburns.position.set(0, -r * 0.15, r * 0.2);
    head.add(sideburns);
  }
}

/** Gaunt necrotic torso — exposed ribs, rot patches, gender silhouette. */
function buildUndeadThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
  sex: Gender,
): void {
  const ribs = part("Ribs", box(look.torso.w * 0.75, look.torso.h * 0.42, 0.05), accent);
  ribs.position.set(0, look.torso.h * 0.02, look.torso.d * 0.52);
  chest.add(ribs);
  for (let i = 0; i < 4; i++) {
    const band = part(`RibBand${i}`, box(look.torso.w * (0.85 - i * 0.05), 0.03, 0.04), accent);
    band.position.set(0, look.torso.h * (0.18 - i * 0.1), look.torso.d * 0.5);
    chest.add(band);
  }
  if (sex === "female") {
    for (const side of [-1, 1]) {
      const breast = part("Breast", new THREE.SphereGeometry(0.055, 8, 6), skin);
      breast.scale.set(1.05, 0.75, 0.8);
      breast.position.set(side * 0.07, look.torso.h * 0.1, look.torso.d * 0.42);
      chest.add(breast);
    }
  } else {
    const sternum = part("Sternum", box(0.06, look.torso.h * 0.4, 0.04), accent);
    sternum.position.set(0, 0.04, look.torso.d * 0.55);
    chest.add(sternum);
  }
  const rot = part("RotPatch", new THREE.SphereGeometry(0.08, 8, 6), cloth);
  rot.position.set(0.08, -look.torso.h * 0.12, look.torso.d * 0.4);
  chest.add(rot);
  const shreds = part("Shroud", box(look.torso.w * 0.9, 0.08, look.torso.d * 1.05), cloth);
  shreds.position.y = 0.02;
  hips.add(shreds);
  // Corrupted core — "resilient heart"
  const heart = part("CorruptHeart", new THREE.OctahedronGeometry(0.05, 0), mat(0x6a8a40, 0.2, 0.4, 0x3a5018, 0.55));
  heart.position.set(0.04, 0.02, look.torso.d * 0.35);
  chest.add(heart);
}

function buildUndeadHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material, sex: Gender): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 16, 12), skin);
  skull.scale.set(sex === "female" ? 0.95 : 1.05, 1.0, 1.05);
  head.add(skull);
  const jaw = part("JawBone", box(r * (sex === "female" ? 0.9 : 1.1), r * 0.3, r * 0.7), accent);
  jaw.position.set(0, -r * 0.5, r * 0.2);
  head.add(jaw);
  const eyeMat = mat(0x7a9a40, 0.1, 0.4, 0x4a6820, 0.55);
  for (const side of [-1, 1]) {
    const socket = part(side < 0 ? "SocketL" : "SocketR", new THREE.SphereGeometry(0.04, 8, 6), accent);
    socket.position.set(side * r * 0.35, r * 0.12, r * 0.72);
    head.add(socket);
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.SphereGeometry(0.022, 8, 6), eyeMat);
    eye.position.set(side * r * 0.35, r * 0.12, r * 0.88);
    head.add(eye);
    if (sex === "female") {
      const ear = part(side < 0 ? "EarLeft" : "EarRight", new THREE.ConeGeometry(0.028, 0.1, 5), skin);
      ear.rotation.z = side * 0.55;
      ear.position.set(side * r * 0.92, 0.02, 0);
      head.add(ear);
    }
  }
  // Sparse necrotic hair / scalp peel
  const scalp = part("Scalp", new THREE.SphereGeometry(r * 1.02, 10, 8), accent);
  scalp.scale.y = 0.35;
  scalp.position.y = r * 0.55;
  head.add(scalp);
}

/** Lacerta — scaled thorax, cream underbelly, gender silhouette, caudal tail. */
function buildLizardThorax(
  chest: THREE.Group,
  hips: THREE.Group,
  look: RaceLook,
  skin: THREE.Material,
  accent: THREE.Material,
  cloth: THREE.Material,
  sex: Gender,
): void {
  const belly = part("Underbelly", box(look.torso.w * 0.72, look.torso.h * 0.72, 0.06), cloth);
  belly.position.set(0, -look.torso.h * 0.02, look.torso.d * 0.48);
  chest.add(belly);

  // Refined dermal scale array — alternating ridge plates down the back.
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const plate = part(
      `ScalePlate${i}`,
      box(look.torso.w * (0.85 - t * 0.12), look.torso.h * 0.12, 0.05),
      i % 2 === 0 ? accent : skin,
    );
    plate.position.set(0, look.torso.h * (0.28 - t * 0.55), -look.torso.d * 0.52);
    plate.rotation.x = 0.12;
    chest.add(plate);
  }

  if (sex === "female") {
    for (const side of [-1, 1]) {
      const breast = part("Breast", new THREE.SphereGeometry(0.065, 10, 8), skin);
      breast.scale.set(1.05, 0.78, 0.85);
      breast.position.set(side * 0.075, look.torso.h * 0.12, look.torso.d * 0.4);
      chest.add(breast);
    }
    const hipFlare = part("HipFlare", box(look.torso.w * 1.15, 0.12, look.torso.d * 1.05), skin);
    hipFlare.position.y = 0.02;
    hips.add(hipFlare);
  } else {
    const pec = part("Pectoral", box(look.torso.w * 0.95, look.torso.h * 0.28, look.torso.d * 0.2), skin);
    pec.position.set(0, look.torso.h * 0.18, look.torso.d * 0.42);
    chest.add(pec);
    for (const side of [-1, 1]) {
      const deltoid = part("Deltoid", new THREE.SphereGeometry(0.08, 8, 6), skin);
      deltoid.position.set(side * look.torso.w * 0.48, look.torso.h * 0.28, 0.02);
      chest.add(deltoid);
    }
  }

  // Integrated caudal tail — segmented muscle array.
  const tailRoot = new THREE.Group();
  tailRoot.name = "Tail";
  tailRoot.position.set(0, 0.02, -look.torso.d * 0.45);
  hips.add(tailRoot);
  let prev = 0;
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const segLen = 0.14 - t * 0.02;
    const segR = 0.055 - t * 0.032;
    const seg = part(`TailSeg${i}`, new THREE.CapsuleGeometry(segR, segLen, 4, 8), i % 2 === 0 ? skin : accent);
    seg.rotation.x = 0.55 + t * 0.35;
    seg.position.set(0, -0.02 - t * 0.08, -prev - segLen * 0.55);
    tailRoot.add(seg);
    prev += segLen * 0.85;
  }
}

function buildLizardHead(head: THREE.Group, look: RaceLook, skin: THREE.Material, accent: THREE.Material, sex: Gender): void {
  const r = look.head.r;
  const skull = part("Head", new THREE.SphereGeometry(r, 18, 14), skin);
  skull.scale.set(sex === "female" ? 0.92 : 1.05, sex === "female" ? 0.95 : 1.0, 1.15);
  head.add(skull);

  // Cranial regenerative crest — male taller / female subtler.
  const crestH = sex === "female" ? 0.12 : 0.2;
  for (let i = 0; i < (sex === "female" ? 3 : 5); i++) {
    const spike = part(`Crest${i}`, new THREE.ConeGeometry(0.028 - i * 0.003, crestH - i * 0.02, 5), accent);
    spike.rotation.x = 0.55;
    spike.position.set(0, r * (0.55 - i * 0.12), -r * (0.15 + i * 0.08));
    head.add(spike);
  }

  const snout = part("Snout", new THREE.CapsuleGeometry(sex === "female" ? 0.05 : 0.065, sex === "female" ? 0.1 : 0.14, 4, 8), skin);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -r * 0.15, r * 1.05);
  head.add(snout);

  const jaw = part("Jaw", box(r * (sex === "female" ? 0.85 : 1.05), r * 0.28, r * 0.7), skin);
  jaw.position.set(0, -r * 0.45, r * 0.35);
  head.add(jaw);

  const eyeMat = mat(0xd4b840, 0.15, 0.35, 0xa88820, 0.35);
  for (const side of [-1, 1]) {
    const eye = part(side < 0 ? "EyeLeft" : "EyeRight", new THREE.SphereGeometry(0.03, 8, 6), eyeMat);
    eye.scale.set(1, 0.7, 1.1);
    eye.position.set(side * r * 0.42, r * 0.12, r * 0.85);
    head.add(eye);
    // Subtle pointed ear / sensory ridge
    const ear = part(side < 0 ? "EarLeft" : "EarRight", new THREE.ConeGeometry(0.025, sex === "female" ? 0.09 : 0.07, 5), skin);
    ear.rotation.z = side * (sex === "female" ? 0.7 : 0.45);
    ear.rotation.x = -0.2;
    ear.position.set(side * r * 0.9, r * 0.1, -r * 0.1);
    head.add(ear);
  }

  // Nostril slits on snout tip
  for (const side of [-1, 1]) {
    const nare = part("Nare", new THREE.SphereGeometry(0.012, 6, 4), accent);
    nare.position.set(side * 0.025, -r * 0.12, r * 1.35);
    head.add(nare);
  }
}

function addLizardArm(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0.2, 0.02);
  parent.add(group);

  const shoulder = part(`${name}Shoulder`, new THREE.SphereGeometry(thick * 1.45, 10, 8), skin);
  group.add(shoulder);
  const upper = part(`${name}Upper`, new THREE.CapsuleGeometry(thick * 1.05, Math.max(0.08, length * 0.42), 6, 10), skin);
  upper.position.y = -length * 0.28;
  group.add(upper);
  const elbow = part(`${name}Elbow`, new THREE.SphereGeometry(thick * 1.1, 8, 6), accent);
  elbow.position.y = -length * 0.52;
  group.add(elbow);
  const lower = part(`${name}Lower`, new THREE.CapsuleGeometry(thick * 0.92, Math.max(0.08, length * 0.36), 6, 10), skin);
  lower.position.y = -length * 0.74;
  group.add(lower);

  const left = name.startsWith("ArmLeft");
  const handY = -length * 0.96;
  const palm = part(left ? "hand.l" : "hand.r", new THREE.SphereGeometry(thick * 1.15, 10, 8), skin);
  palm.position.y = handY;
  group.add(palm);
  // Agile talon grips
  for (let i = 0; i < 4; i++) {
    const claw = part("Talon", new THREE.ConeGeometry(thick * 0.18, thick * 0.85, 5), accent);
    claw.rotation.x = Math.PI;
    claw.position.set((i - 1.5) * thick * 0.55, handY - thick * 1.4, thick * 0.15);
    group.add(claw);
  }
  const slot = new THREE.Group();
  slot.name = left ? "handslot.l" : "handslot.r";
  slot.position.set(0, handY - thick * 0.25, thick * 0.2);
  group.add(slot);
}

/** Digitigrade locomotion — reverse-knee hock, splayed clawed foot. */
function addLizardLeg(
  parent: THREE.Object3D,
  name: string,
  x: number,
  length: number,
  thick: number,
  foot: { w: number; d: number; h: number },
  skin: THREE.Material,
  accent: THREE.Material,
): void {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, 0);
  parent.add(group);

  const thigh = part(`${name}Upper`, new THREE.CapsuleGeometry(thick * 1.15, Math.max(0.08, length * 0.34), 6, 10), skin);
  thigh.position.set(0, -length * 0.24, 0.02);
  group.add(thigh);
  const knee = part(`${name}Knee`, new THREE.SphereGeometry(thick * 1.2, 8, 6), accent);
  knee.position.set(0, -length * 0.46, 0.06);
  group.add(knee);
  const shin = part(`${name}Lower`, new THREE.CapsuleGeometry(thick * 0.9, Math.max(0.08, length * 0.26), 6, 10), skin);
  shin.position.set(0, -length * 0.66, 0.12);
  group.add(shin);
  const hock = part(`${name}Hock`, new THREE.SphereGeometry(thick, 8, 6), accent);
  hock.position.set(0, -length * 0.84, 0.16);
  group.add(hock);
  const metatarsal = part(`${name}Meta`, new THREE.CapsuleGeometry(thick * 0.65, Math.max(0.05, length * 0.12), 5, 8), skin);
  metatarsal.position.set(0, -length * 0.94, 0.22);
  group.add(metatarsal);

  const pad = part(name === "LegLeft" ? "FootLeft" : "FootRight", box(foot.w, foot.h * 0.7, foot.d * 0.45), skin);
  pad.position.set(0, -length - foot.h * 0.15, foot.d * 0.32);
  group.add(pad);
  for (let i = 0; i < 3; i++) {
    const toe = part("ClawToe", box(foot.w * 0.28, foot.h * 0.55, foot.d * 0.28), accent);
    toe.position.set((i - 1) * foot.w * 0.32, -length - foot.h * 0.1, foot.d * 0.58);
    group.add(toe);
    const talon = part("FootTalon", new THREE.ConeGeometry(0.015, 0.06, 5), accent);
    talon.rotation.x = Math.PI / 2;
    talon.position.set((i - 1) * foot.w * 0.32, -length - foot.h * 0.05, foot.d * 0.78);
    group.add(talon);
  }
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

  const insect = race === "insectoid";
  const bull = race === "minotaur";
  const stone = race === "golem";
  const lacerta = race === "lizard";

  const idle = limbClip("Idle", 1.6, (t, name) => {
    const breath = Math.sin(t * Math.PI * 2) * (stone ? 0.02 : 0.04);
    if (insect) {
      if (name === "ArmLeft2") return { x: -0.35 + breath * 0.25, y: 0.2, z: 0.55 };
      if (name === "ArmRight2") return { x: -0.35 + breath * 0.25, y: -0.2, z: -0.55 };
      if (name === "ArmLeft") return { x: -0.2 + breath * 0.3, y: 0.08, z: 0.22 };
      if (name === "ArmRight") return { x: -0.2 + breath * 0.3, y: -0.08, z: -0.22 };
      if (name === "LegLeft") return { x: -0.12, z: 0.08 };
      if (name === "LegRight") return { x: 0.1, z: -0.08 };
      if (name === "spine") return { x: 0.06 + breath * 0.12, z: 0 };
      if (name === "chest") return { x: breath * 0.08, z: 0 };
      return { x: breath * 0.1, z: 0 };
    }
    if (bull) {
      // High-STR plant: wide hooves, heavy arms hanging ready.
      if (name === "ArmLeft") return { x: -0.15 + breath * 0.2, y: 0.1, z: 0.28 };
      if (name === "ArmRight") return { x: -0.15 + breath * 0.2, y: -0.1, z: -0.28 };
      if (name === "LegLeft") return { x: -0.08, z: 0.14 };
      if (name === "LegRight") return { x: 0.1, z: -0.14 };
      if (name === "spine") return { x: 0.08 + breath * 0.1, z: 0 };
      if (name === "chest") return { x: breath * 0.12, z: 0 };
      return { x: breath * 0.08, z: 0 };
    }
    if (lacerta) {
      // Cold-blooded digitigrade idle — weight on toes, tail-countered sway.
      if (name === "ArmLeft") return { x: -0.12 + breath * 0.25, y: 0.08, z: 0.2 };
      if (name === "ArmRight") return { x: -0.12 + breath * 0.25, y: -0.08, z: -0.2 };
      if (name === "LegLeft") return { x: -0.1, z: 0.1 };
      if (name === "LegRight") return { x: 0.12, z: -0.1 };
      if (name === "spine") return { x: 0.05 + breath * 0.1, z: Math.sin(t * Math.PI * 2) * 0.03 };
      if (name === "chest") return { x: breath * 0.1, z: 0 };
      return { x: breath * 0.08, z: 0 };
    }
    if (stone) {
      // Construct stability — almost still, slight core pulse.
      if (name === "ArmLeft") return { x: -0.25 + breath, y: 0.05, z: 0.18 };
      if (name === "ArmRight") return { x: -0.25 + breath, y: -0.05, z: -0.18 };
      if (name === "LegLeft") return { x: 0, z: 0.06 };
      if (name === "LegRight") return { x: 0, z: -0.06 };
      if (name === "spine") return { x: 0.04 + breath * 0.5, z: 0 };
      if (name === "chest") return { x: breath * 0.6, z: 0 };
      return { x: breath * 0.4, z: 0 };
    }
    if (name === "ArmLeft2") return { x: breath * 0.4, y: 0.1, z: 0.32 };
    if (name === "ArmRight2") return { x: breath * 0.4, y: -0.1, z: -0.32 };
    if (name.startsWith("Arm")) return { x: breath * 0.35, z: name.includes("Left") ? 0.08 : -0.08 };
    if (name.startsWith("Leg")) return { x: 0, z: 0 };
    return { x: breath * 0.15, z: 0 };
  }, [...arms, ...legs, "spine", "chest"]);

  // Guard stance for character select — weapons up, weight forward, light breath.
  const battle = limbClip("Idle_Combat", 2.2, (t, name) => {
    const breath = Math.sin(t * Math.PI * 2) * 0.03;
    if (insect) {
      if (name === "ArmRight") return { x: -1.15 + breath * 0.08, y: 0.45, z: -0.48 };
      if (name === "ArmLeft") return { x: -1.05 + breath * 0.08, y: -0.4, z: 0.55 };
      if (name === "ArmRight2") return { x: -0.75 + breath * 0.1, y: 0.55, z: -0.95 };
      if (name === "ArmLeft2") return { x: -0.75 + breath * 0.1, y: -0.55, z: 0.95 };
      if (name === "LegLeft") return { x: -0.28, z: 0.12 };
      if (name === "LegRight") return { x: 0.32, z: -0.1 };
      if (name === "spine") return { x: 0.12 + breath * 0.04, y: -0.08, z: 0 };
      if (name === "chest") return { x: 0.08 + breath * 0.05, y: 0.12, z: 0 };
      return { x: breath * 0.1, z: 0 };
    }
    if (bull) {
      // Greataxe-ready juggernaut: both arms high, wide digitigrade base.
      if (name === "ArmRight") return { x: -1.25 + breath * 0.06, y: 0.35, z: -0.4 };
      if (name === "ArmLeft") return { x: -1.15 + breath * 0.06, y: -0.3, z: 0.45 };
      if (name === "LegLeft") return { x: -0.22, z: 0.18 };
      if (name === "LegRight") return { x: 0.28, z: -0.16 };
      if (name === "spine") return { x: 0.14 + breath * 0.04, y: -0.06, z: 0 };
      if (name === "chest") return { x: 0.1 + breath * 0.05, y: 0.1, z: 0 };
      return { x: breath * 0.08, z: 0 };
    }
    if (lacerta) {
      // Agile guard — low hips, talons ready, forward lean.
      if (name === "ArmRight") return { x: -1.1 + breath * 0.07, y: 0.5, z: -0.5 };
      if (name === "ArmLeft") return { x: -0.7 + breath * 0.07, y: -0.35, z: 0.65 };
      if (name === "LegLeft") return { x: -0.24, z: 0.12 };
      if (name === "LegRight") return { x: 0.3, z: -0.1 };
      if (name === "spine") return { x: 0.12 + breath * 0.04, y: -0.1, z: 0 };
      if (name === "chest") return { x: 0.08 + breath * 0.05, y: 0.14, z: 0 };
      return { x: breath * 0.08, z: 0 };
    }
    if (stone) {
      // Hammer guard: fists forward, low center of gravity.
      if (name === "ArmRight") return { x: -0.95 + breath * 0.04, y: 0.25, z: -0.35 };
      if (name === "ArmLeft") return { x: -0.9 + breath * 0.04, y: -0.2, z: 0.4 };
      if (name === "LegLeft") return { x: -0.1, z: 0.1 };
      if (name === "LegRight") return { x: 0.14, z: -0.1 };
      if (name === "spine") return { x: 0.16 + breath * 0.03, z: 0 };
      if (name === "chest") return { x: 0.1 + breath * 0.04, z: 0 };
      return { x: breath * 0.05, z: 0 };
    }
    // Humanoid guard — elbows bent, weapon-side forward, off-hand ready to brace or shield.
    if (name === "ArmRight") return { x: -1.15 + breath * 0.08, y: 0.62, z: -0.48 };
    if (name === "ArmLeft") return { x: -0.85 + breath * 0.06, y: -0.42, z: 0.68 };
    if (name === "ArmRight2") return { x: -0.95 + breath * 0.1, y: 0.7, z: -0.85 };
    if (name === "ArmLeft2") return { x: -0.7 + breath * 0.1, y: -0.55, z: 0.95 };
    if (name === "LegLeft") return { x: -0.2, z: 0.08 };
    if (name === "LegRight") return { x: 0.26, z: -0.06 };
    if (name === "spine") return { x: 0.1 + breath * 0.04, y: -0.1, z: 0 };
    if (name === "chest") return { x: 0.08 + breath * 0.05, y: 0.16, z: 0 };
    return { x: breath * 0.1, z: 0 };
  }, [...arms, ...legs, "spine", "chest"]);

  const walk = limbClip("Running_A", bull || stone ? 0.85 : lacerta ? 0.62 : 0.7, (t, name) => {
    const swing = Math.sin(t * Math.PI * 2);
    if (insect) {
      if (name === "ArmLeft") return { x: -0.25 + swing * 0.4, y: 0.05, z: 0.28 };
      if (name === "ArmRight") return { x: -0.25 - swing * 0.4, y: -0.05, z: -0.28 };
      if (name === "ArmLeft2") return { x: -0.45 - swing * 0.55, y: 0.15, z: 0.62 };
      if (name === "ArmRight2") return { x: -0.45 + swing * 0.55, y: -0.15, z: -0.62 };
      if (name === "LegLeft") return { x: -swing * 0.85, z: 0.06 };
      if (name === "LegRight") return { x: swing * 0.85, z: -0.06 };
      if (name === "spine") return { x: 0.1 + Math.sin(t * Math.PI * 4) * 0.04, z: 0 };
      return { x: Math.sin(t * Math.PI * 4) * 0.03, z: 0 };
    }
    if (bull) {
      // Powerful digitigrade lope — arms counter heavy stride.
      if (name === "ArmLeft") return { x: -0.2 + swing * 0.45, z: 0.22 };
      if (name === "ArmRight") return { x: -0.2 - swing * 0.45, z: -0.22 };
      if (name === "LegLeft") return { x: -swing * 0.9, z: 0.1 };
      if (name === "LegRight") return { x: swing * 0.9, z: -0.1 };
      if (name === "spine") return { x: 0.12 + Math.sin(t * Math.PI * 4) * 0.05, z: 0 };
      return { x: Math.sin(t * Math.PI * 4) * 0.04, z: 0 };
    }
    if (lacerta) {
      // Quick digitigrade lope — snappy toes, counter-sway for the tail.
      if (name === "ArmLeft") return { x: -0.15 + swing * 0.5, z: 0.18 };
      if (name === "ArmRight") return { x: -0.15 - swing * 0.5, z: -0.18 };
      if (name === "LegLeft") return { x: -swing * 0.95, z: 0.08 };
      if (name === "LegRight") return { x: swing * 0.95, z: -0.08 };
      if (name === "spine") return { x: 0.1 + Math.sin(t * Math.PI * 4) * 0.05, z: swing * 0.06 };
      return { x: Math.sin(t * Math.PI * 4) * 0.04, z: 0 };
    }
    if (stone) {
      // Slow, deliberate pillar steps; arms barely swing.
      if (name === "ArmLeft") return { x: -0.3 + swing * 0.18, z: 0.15 };
      if (name === "ArmRight") return { x: -0.3 - swing * 0.18, z: -0.15 };
      if (name === "LegLeft") return { x: -swing * 0.45, z: 0.04 };
      if (name === "LegRight") return { x: swing * 0.45, z: -0.04 };
      if (name === "spine") return { x: 0.08 + Math.sin(t * Math.PI * 2) * 0.03, z: 0 };
      return { x: Math.sin(t * Math.PI * 2) * 0.02, z: 0 };
    }
    if (name === "ArmLeft") return { x: swing * 0.55, z: 0.12 };
    if (name === "ArmRight") return { x: -swing * 0.55, z: -0.12 };
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
    const bodyX = insect ? 0.22 : bull ? 0.28 : lacerta ? 0.2 : stone ? 0.2 : 0.18;
    if (name === "spine") return { x: wind * bodyX, y: -wind * (bull || stone ? 0.12 : lacerta ? 0.18 : 0.22), z: 0 };
    if (name === "chest") return { x: wind * 0.12, y: wind * (insect ? 0.2 : bull || stone ? 0.15 : lacerta ? 0.22 : 0.28), z: 0 };
    if (name === "LegLeft") return { x: -wind * (insect || bull || lacerta ? 0.22 : 0.12), z: bull || lacerta ? 0.1 : 0.04 };
    if (name === "LegRight") return { x: wind * (insect || bull || lacerta ? 0.28 : stone ? 0.16 : 0.18), z: bull || lacerta ? -0.1 : -0.04 };
    if (!name.startsWith("Arm")) return { x: wind * 0.1, z: 0 };
    const left = name.includes("Left");
    const lower = name.endsWith("2");
    if (insect) {
      const lag = lower ? 0.78 : 1;
      const lead = left ? 0.85 : 1;
      return {
        x: -0.4 - wind * (lower ? 1.35 : 1.55) * lag * lead,
        y: (left ? -1 : 1) * (0.15 + wind * (lower ? 0.7 : 0.55)) * lag,
        z: (left ? 1 : -1) * (lower ? 0.7 : 0.35 + wind * 0.45),
      };
    }
    if (bull || stone) {
      // Both arms commit — 2H greataxe / warhammer arc.
      const lead = left ? 0.92 : 1;
      const lift = stone ? 1.25 : 1.5;
      return {
        x: -0.35 - wind * lift * lead,
        y: (left ? -1 : 1) * wind * 0.45 * lead,
        z: (left ? 1 : -1) * (0.25 + wind * 0.35),
      };
    }
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
