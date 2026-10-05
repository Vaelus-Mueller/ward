import * as THREE from "three";
import type { ArmorType, Item, SlotName, WeaponStyle } from "../game/types";

export type GearElement = "fire" | "frost" | "lightning" | "arcane" | "bleed";

const ELEMENT_COLOR: Record<GearElement, number> = {
  fire: 0xff6a2a,
  frost: 0x7ec8ff,
  lightning: 0xffe566,
  arcane: 0xc9a0ff,
  bleed: 0xe15b4c,
};

const ARMOR_FINISH: Record<ArmorType, { metalness: number; roughness: number }> = {
  cloth: { metalness: 0.04, roughness: 0.92 },
  leather: { metalness: 0.1, roughness: 0.7 },
  mail: { metalness: 0.82, roughness: 0.36 },
  plate: { metalness: 0.92, roughness: 0.22 },
};

/** Infer a visual element from item affixes (and a few related combat keys). */
export function elementOf(item: Item | null | undefined): GearElement | null {
  if (!item) return null;
  let best: GearElement | null = null;
  let score = 0;
  for (const affix of item.affixes) {
    const key = affix.key.toLowerCase();
    const label = affix.label.toLowerCase();
    const hit = (el: GearElement, weight: number) => {
      if (weight > score) {
        best = el;
        score = weight;
      }
    };
    if (key === "burn" || label.includes("fire") || label.includes("ember") || label.includes("cinder") || label.includes("pyre")) hit("fire", 3 + affix.value);
    if (key === "frost" || label.includes("frost") || label.includes("chill") || label.includes("rime") || label.includes("cold")) hit("frost", 3 + affix.value);
    if (key === "lightning" || label.includes("lightning") || label.includes("storm") || label.includes("spark")) hit("lightning", 3 + affix.value);
    if (key === "spellmult" || label.includes("spell") || label.includes("rite") || label.includes("arcane")) hit("arcane", 2 + affix.value);
    if (key === "bleedchance" || label.includes("bleed") || label.includes("wound")) hit("bleed", 2 + affix.value);
  }
  return best;
}

export function syncHeroGear(root: THREE.Object3D, equipment: Record<SlotName, Item | null>, timeMs: number): void {
  attachWeapon(root, "handslot.r", "gear-main", equipment.weapon, false);
  attachWeapon(root, "handslot.l", "gear-off", equipment.offhand, true);
  attachWeapon(root, "handslot.r2", "gear-arm3", equipment.weapon3, false, 0.85);
  attachWeapon(root, "handslot.l2", "gear-arm4", equipment.weapon4, true, 0.85);
  attachArmor(root, "chest", "gear-chest-plate", equipment.chest, "chest");
  attachArmor(root, "head", "gear-helm-piece", equipment.head, "head");
  attachArmor(root, "ArmLeft", "gear-glove-l", equipment.gloves, "gloves");
  attachArmor(root, "ArmRight", "gear-glove-r", equipment.gloves, "gloves");
  attachArmor(root, "LegLeft", "gear-boot-l", equipment.boots, "boots");
  attachArmor(root, "LegRight", "gear-boot-r", equipment.boots, "boots");
  attachJewelry(root, "hips", "gear-belt", "belt", equipment.belt);
  attachJewelry(root, "hand.r", "gear-ring-r", "ring", equipment.ring1);
  attachJewelry(root, "hand.l", "gear-ring-l", "ring", equipment.ring2);
  attachJewelry(root, "head", "gear-ear-l", "earring", equipment.ear1);
  attachJewelry(root, "head", "gear-ear-r", "earring", equipment.ear2);
  if (!attachJewelry(root, "chest", "gear-neck", "neck", equipment.neck)) {
    attachJewelry(root, "spine", "gear-neck", "neck", equipment.neck);
  }
  animateGearFx(root, timeMs);
}

function attachWeapon(
  root: THREE.Object3D,
  boneName: string,
  nodeName: string,
  item: Item | null,
  offhand: boolean,
  scaleMul = 1,
): void {
  const bone =
    root.getObjectByName(boneName) ??
    root.getObjectByName(offhand ? "hand.l" : "hand.r") ??
    (boneName.endsWith("2") ? root.getObjectByName(offhand ? "hand.l" : "hand.r") : null);
  if (!bone) return;
  let holder = bone.getObjectByName(nodeName) as THREE.Group | undefined;
  const uid = item?.uid ?? "";
  if (holder && holder.userData.itemUid !== uid) {
    bone.remove(holder);
    disposeObject(holder);
    holder = undefined;
  }
  if (!item) {
    if (holder) holder.visible = false;
    return;
  }
  if (!holder) {
    holder = buildWeapon(item, offhand);
    holder.name = nodeName;
    holder.userData.itemUid = uid;
    if (scaleMul !== 1) holder.scale.multiplyScalar(scaleMul);
    bone.add(holder);
  }
  holder.visible = true;
  styleGearMaterials(holder, item);
}

function attachArmor(
  root: THREE.Object3D,
  boneName: string,
  nodeName: string,
  item: Item | null,
  kind: "head" | "chest" | "gloves" | "boots",
): void {
  const bone = root.getObjectByName(boneName);
  if (!bone) return;
  let holder = bone.getObjectByName(nodeName) as THREE.Group | undefined;
  const uid = item?.uid ?? "";
  if (holder && holder.userData.itemUid !== uid) {
    bone.remove(holder);
    disposeObject(holder);
    holder = undefined;
  }
  if (!item?.armorType) {
    if (holder) holder.visible = false;
    return;
  }
  if (!holder) {
    holder = buildArmor(item, kind);
    holder.name = nodeName;
    holder.userData.itemUid = uid;
    bone.add(holder);
  }
  holder.visible = true;
  styleGearMaterials(holder, item);
}

function attachJewelry(
  root: THREE.Object3D,
  boneName: string,
  nodeName: string,
  shape: "belt" | "ring" | "neck" | "earring",
  item: Item | null,
): boolean {
  const bone = root.getObjectByName(boneName);
  if (!bone) return false;
  let holder = bone.getObjectByName(nodeName) as THREE.Group | undefined;
  const uid = item?.uid ?? "";
  if (holder && holder.userData.itemUid !== uid) {
    bone.remove(holder);
    disposeObject(holder);
    holder = undefined;
  }
  if (!item) {
    if (holder) holder.visible = false;
    return true;
  }
  if (!holder) {
    holder = buildJewelry(shape, nodeName);
    holder.name = nodeName;
    holder.userData.itemUid = uid;
    bone.add(holder);
  }
  holder.visible = true;
  styleGearMaterials(holder, item);
  return true;
}

function buildWeapon(item: Item, offhand: boolean): THREE.Group {
  if (item.slot === "shield") return buildShield(item);

  const group = new THREE.Group();
  const style: WeaponStyle = item.style;
  const dye = item.dye || 0xcfc6b8;
  const metal = mat(dye, 0.85, 0.28);
  const grip = mat(0x3a2a1c, 0.05, 0.85);
  const accent = mat(0xe4c37a, 0.7, 0.35);
  const twoHand = item.hands === 2;

  if (style === "bow") {
    const limb = part("BowLimb", new THREE.TorusGeometry(0.42, 0.028, 6, 18, Math.PI * 1.15), metal);
    limb.rotation.z = Math.PI / 2;
    limb.rotation.y = Math.PI / 2;
    const string = part("BowString", new THREE.CylinderGeometry(0.006, 0.006, 0.78, 4), mat(0xd8d0c4, 0.05, 0.6));
    string.position.z = 0.2;
    group.add(limb, string);
  } else if (style === "handbow") {
    const body = part("Handbow", new THREE.BoxGeometry(0.08, 0.14, 0.28), metal);
    body.position.set(0, 0.12, 0.08);
    const prod = part("Prod", new THREE.BoxGeometry(0.28, 0.04, 0.04), accent);
    prod.position.set(0, 0.16, 0.2);
    const stock = part("Stock", new THREE.BoxGeometry(0.05, 0.08, 0.16), grip);
    stock.position.set(0, 0.06, -0.02);
    group.add(body, prod, stock);
  } else if (style === "thrown") {
    const blade = part("Thrown", new THREE.BoxGeometry(0.04, 0.28, 0.02), metal);
    blade.position.y = 0.22;
    const haft = part("Haft", new THREE.CylinderGeometry(0.015, 0.018, 0.16, 6), grip);
    haft.position.y = 0.04;
    group.add(blade, haft);
  } else if (style === "focus") {
    const shaft = part("Wand", new THREE.CylinderGeometry(0.018, 0.024, 0.72, 8), grip);
    shaft.position.y = 0.2;
    const orb = part("FocusOrb", new THREE.IcosahedronGeometry(0.09, 1), accent);
    orb.position.y = 0.62;
    const collar = part("Collar", new THREE.TorusGeometry(0.05, 0.012, 6, 12), metal);
    collar.position.y = 0.5;
    collar.rotation.x = Math.PI / 2;
    group.add(shaft, orb, collar);
  } else if (item.rangeBonus > 15 || (twoHand && item.name.toLowerCase().includes("spear"))) {
    const shaft = part("Spear", new THREE.CylinderGeometry(0.018, 0.022, twoHand ? 1.35 : 1.15, 8), grip);
    shaft.position.y = 0.4;
    const tip = part("SpearTip", new THREE.ConeGeometry(0.055, 0.24, 7), metal);
    tip.position.y = 1.15;
    const guard = part("SpearGuard", new THREE.BoxGeometry(0.16, 0.03, 0.04), accent);
    guard.position.y = 0.98;
    group.add(shaft, tip, guard);
  } else if (twoHand) {
    const blade = part("Greatblade", new THREE.BoxGeometry(0.07, 0.95, 0.028), metal);
    blade.position.y = 0.62;
    const gripMesh = part("Grip", new THREE.CylinderGeometry(0.028, 0.032, 0.32, 8), grip);
    gripMesh.position.y = 0.08;
    const guard = part("Guard", new THREE.BoxGeometry(0.28, 0.045, 0.06), accent);
    guard.position.y = 0.26;
    const pommel = part("Pommel", new THREE.SphereGeometry(0.04, 8, 6), accent);
    pommel.position.y = -0.1;
    group.add(blade, gripMesh, guard, pommel);
  } else if (item.damageMax - item.damageMin >= 6 || item.speed < 0.9) {
    const blade = part("Cleaver", new THREE.BoxGeometry(0.08, 0.55, 0.03), metal);
    blade.position.set(0.02, 0.42, 0);
    const tip = part("CleaverTip", new THREE.BoxGeometry(0.1, 0.12, 0.028), metal);
    tip.position.set(0.03, 0.72, 0);
    const gripMesh = part("Grip", new THREE.CylinderGeometry(0.025, 0.028, 0.22, 8), grip);
    gripMesh.position.y = 0.08;
    const guard = part("Guard", new THREE.BoxGeometry(0.18, 0.04, 0.05), accent);
    guard.position.y = 0.2;
    group.add(blade, tip, gripMesh, guard);
  } else {
    const blade = part("1H_Sword", new THREE.BoxGeometry(0.045, 0.62, 0.018), metal);
    blade.position.y = 0.45;
    const fuller = part("Fuller", new THREE.BoxGeometry(0.012, 0.48, 0.02), mat(0x9aa4b0, 0.9, 0.25));
    fuller.position.y = 0.46;
    const tip = part("Tip", new THREE.ConeGeometry(0.028, 0.1, 6), metal);
    tip.position.y = 0.8;
    const guard = part("Guard", new THREE.BoxGeometry(0.2, 0.035, 0.05), accent);
    guard.position.y = 0.16;
    const gripMesh = part("Grip", new THREE.CylinderGeometry(0.022, 0.025, 0.2, 8), grip);
    gripMesh.position.y = 0.04;
    const pommel = part("Pommel", new THREE.SphereGeometry(0.035, 8, 6), accent);
    pommel.position.y = -0.08;
    group.add(blade, fuller, tip, guard, gripMesh, pommel);
  }

  group.rotation.z = offhand ? 0.15 : -0.12;
  group.rotation.x = -0.15;
  group.position.set(offhand ? -0.02 : 0.02, -0.02, 0.04);
  if (offhand) group.scale.setScalar(0.92);
  if (twoHand && !offhand) group.scale.setScalar(1.08);

  const element = elementOf(item);
  if (element) addElementAura(group, element);
  return group;
}

function buildShield(item: Item): THREE.Group {
  const group = new THREE.Group();
  const dye = item.dye || 0x8c7355;
  const type = item.armorType ?? "leather";
  const finish = ARMOR_FINISH[type];
  const shell = mat(dye, finish.metalness, finish.roughness);
  const trim = mat(0xe4c37a, 0.8, 0.3);
  const board = part(
    "Shield",
    type === "plate" ? new THREE.BoxGeometry(0.42, 0.55, 0.06) : new THREE.CylinderGeometry(0.22, 0.24, 0.06, 12),
    shell,
  );
  if (type !== "plate") board.rotation.x = Math.PI / 2;
  const boss = part("Boss", new THREE.SphereGeometry(0.05, 8, 6), trim);
  boss.position.z = 0.05;
  group.add(board, boss);
  group.position.set(-0.04, 0.1, 0.06);
  group.rotation.y = 0.35;
  const element = elementOf(item);
  if (element) addElementAura(group, element);
  return group;
}

function buildArmor(item: Item, kind: "head" | "chest" | "gloves" | "boots"): THREE.Group {
  const group = new THREE.Group();
  const type = item.armorType ?? "cloth";
  const finish = ARMOR_FINISH[type];
  const dye = item.dye || 0x8c7355;
  const shell = mat(dye, finish.metalness, finish.roughness);
  const trim = mat(0xd4b07a, Math.min(1, finish.metalness + 0.1), Math.max(0.2, finish.roughness - 0.1));

  if (kind === "head") {
    if (type === "cloth") {
      const hood = part("Hood", new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.72), shell);
      hood.position.y = 0.04;
      hood.scale.set(1.05, 1.1, 1.15);
      group.add(hood);
    } else if (type === "leather") {
      const cap = part("Helmet", new THREE.SphereGeometry(0.185, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), shell);
      cap.position.y = 0.05;
      group.add(cap);
    } else {
      const dome = part("Helmet", new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), shell);
      dome.position.y = 0.06;
      const brim = part("Brim", new THREE.TorusGeometry(0.17, 0.025, 6, 16), trim);
      brim.rotation.x = Math.PI / 2;
      brim.position.y = 0.02;
      const crest = part("Crest", new THREE.BoxGeometry(0.04, 0.12, 0.16), trim);
      crest.position.set(0, 0.2, 0);
      group.add(dome, brim, crest);
    }
  } else if (kind === "chest") {
    const torso = part("Chestplate", new THREE.BoxGeometry(0.42, 0.48, 0.28), shell);
    torso.position.y = 0.02;
    group.add(torso);
    if (type === "plate" || type === "mail") {
      const pauldronL = part("Pauldron", new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI, 0, Math.PI), shell);
      pauldronL.position.set(-0.24, 0.18, 0);
      pauldronL.rotation.z = 0.4;
      const pauldronR = pauldronL.clone();
      pauldronR.position.x = 0.24;
      pauldronR.rotation.z = -0.4;
      const keel = part("Keel", new THREE.BoxGeometry(0.08, 0.36, 0.06), trim);
      keel.position.set(0, 0.02, 0.14);
      group.add(pauldronL, pauldronR, keel);
    } else if (type === "leather") {
      const strap = part("Strap", new THREE.BoxGeometry(0.1, 0.4, 0.04), trim);
      strap.position.set(0.08, 0.02, 0.14);
      group.add(strap);
    } else {
      const drape = part("Drape", new THREE.BoxGeometry(0.36, 0.2, 0.08), shell);
      drape.position.set(0, -0.2, 0.05);
      group.add(drape);
    }
  } else if (kind === "gloves") {
    const cuff = part("Glove", new THREE.CylinderGeometry(0.07, 0.08, 0.16, 8), shell);
    cuff.position.y = -0.12;
    group.add(cuff);
    if (type === "plate" || type === "mail") {
      const plate = part("CuffPlate", new THREE.BoxGeometry(0.1, 0.08, 0.06), trim);
      plate.position.set(0, -0.1, 0.05);
      group.add(plate);
    }
  } else {
    const boot = part("Boot", new THREE.BoxGeometry(0.12, 0.16, 0.22), shell);
    boot.position.set(0, -0.55, 0.04);
    group.add(boot);
    if (type === "plate") {
      const greave = part("Greave", new THREE.BoxGeometry(0.1, 0.2, 0.1), trim);
      greave.position.set(0, -0.4, 0.05);
      group.add(greave);
    }
  }

  const element = elementOf(item);
  if (element) addElementAura(group, element);
  return group;
}

function buildJewelry(shape: "belt" | "ring" | "neck" | "earring", nodeName: string): THREE.Group {
  const group = new THREE.Group();
  const metal = mat(0xe4c37a, 0.82, 0.28);
  if (shape === "belt") {
    const belt = part("Belt", new THREE.TorusGeometry(0.22, 0.04, 8, 20), metal);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.05;
    const buckle = part("Buckle", new THREE.BoxGeometry(0.08, 0.06, 0.05), mat(0xf0d090, 0.9, 0.25));
    buckle.position.set(0, 0.05, 0.22);
    group.add(belt, buckle);
  } else if (shape === "ring") {
    const ring = part("Ring", new THREE.TorusGeometry(0.045, 0.012, 6, 14), metal);
    ring.rotation.z = Math.PI / 2;
    group.add(ring);
  } else if (shape === "earring") {
    const drop = part("Earring", new THREE.SphereGeometry(0.032, 8, 8), metal);
    drop.position.set(nodeName.endsWith("-r") ? 0.12 : -0.12, 0.02, 0.06);
    group.add(drop);
  } else {
    const pendant = part("Pendant", new THREE.OctahedronGeometry(0.06, 0), metal);
    pendant.position.set(0, 0.08, 0.1);
    const chain = part("Chain", new THREE.TorusGeometry(0.1, 0.01, 6, 16, Math.PI), metal);
    chain.position.set(0, 0.16, 0.04);
    chain.rotation.x = 0.5;
    group.add(pendant, chain);
  }
  return group;
}

function addElementAura(parent: THREE.Group, element: GearElement): void {
  const color = ELEMENT_COLOR[element];
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(element === "fire" ? 0.14 : 0.11, 10, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.name = "ElementAura";
  glow.userData.element = element;
  glow.position.y = 0.35;
  parent.add(glow);

  if (element === "fire") {
    for (let i = 0; i < 3; i++) {
      const lick = new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.12, 5),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? 0xff9a3a : 0xff5020,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      lick.name = "FlameLick";
      lick.userData.element = element;
      lick.userData.phase = i * 1.7;
      lick.position.set((i - 1) * 0.05, 0.55 + i * 0.02, 0.02);
      parent.add(lick);
    }
  }
}

function styleGearMaterials(root: THREE.Object3D, item: Item): void {
  const element = elementOf(item);
  const elementColor = element ? ELEMENT_COLOR[element] : 0x000000;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
    if (!material) return;
    material.userData.gearFx = {
      ethereal: item.ethereal,
      element,
      elementColor,
      baseOpacity: material.opacity,
    };
    if ("emissive" in material && element && mesh.name !== "ElementAura" && mesh.name !== "FlameLick") {
      material.emissive.setHex(elementColor);
      material.emissiveIntensity = 0.25;
    }
    if (item.ethereal && "metalness" in material) {
      material.transparent = true;
      material.opacity = 0.55;
      material.depthWrite = false;
      material.emissive.setHex(element ? elementColor : 0xb7d4ea);
      material.emissiveIntensity = element ? 0.45 : 0.35;
      material.color.lerp(new THREE.Color(0xd7e8f6), 0.35);
    }
  });
}

function animateGearFx(root: THREE.Object3D, timeMs: number): void {
  const t = timeMs * 0.001;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const fx = (mesh.material as THREE.Material)?.userData?.gearFx as
      | { ethereal: boolean; element: GearElement | null; elementColor: number; baseOpacity: number }
      | undefined;

    if (mesh.name === "ElementAura") {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const el = mesh.userData.element as GearElement;
      mat.opacity = 0.18 + Math.sin(t * (el === "fire" ? 6 : 3.2) + mesh.id) * 0.1;
      const pulse = 1 + Math.sin(t * 4) * 0.08;
      mesh.scale.setScalar(pulse);
      return;
    }
    if (mesh.name === "FlameLick") {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const phase = (mesh.userData.phase as number) || 0;
      const wave = 0.5 + 0.5 * Math.sin(t * 9 + phase);
      mat.opacity = 0.25 + wave * 0.45;
      mesh.scale.set(0.8 + wave * 0.4, 0.9 + wave * 0.55, 0.8 + wave * 0.4);
      mesh.position.y = 0.52 + wave * 0.08;
      return;
    }

    if (!fx) return;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (fx.ethereal) {
      material.transparent = true;
      material.depthWrite = false;
      material.opacity = 0.42 + Math.sin(t * 2.6 + mesh.id * 0.15) * 0.16;
      if (material.emissive) {
        material.emissiveIntensity = 0.28 + Math.sin(t * 3.1 + mesh.id) * 0.12;
      }
    }
    if (fx.element && material.emissive && mesh.name !== "ElementAura") {
      const rate = fx.element === "fire" ? 5.5 : fx.element === "lightning" ? 8 : 3.2;
      material.emissiveIntensity = (fx.ethereal ? 0.35 : 0.2) + Math.sin(t * rate + mesh.id) * 0.15;
    }
  });
}

function part(name: string, geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  return mesh;
}

function mat(color: number, metalness: number, roughness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) material?.dispose();
  });
}
