import { emptyEquipment, GEAR_SLOTS, type ArmorType, type Character, type Item, type Rarity } from "./types";
import type { Snapshot } from "./sim";

export const SAVE_KEY = "vaelus-save-v1";

export interface SaveFile extends Snapshot {
  version: 1;
}

export function serialize(snapshot: Snapshot): string {
  const file: SaveFile = { version: 1, ...snapshot };
  return JSON.stringify(file);
}

export function deserialize(raw: string): SaveFile | null {
  try {
    const data = JSON.parse(raw) as SaveFile;
    if (!data || data.version !== 1 || !data.character) return null;
    if (!validCharacter(data.character)) return null;
    migrateGear(data.character);
    migrateAttributes(data.character);
    if (!Number.isFinite(data.character.paragon)) data.character.paragon = 0;
    if (!Number.isFinite(data.wave) || !Number.isFinite(data.hp)) return null;
    return data;
  } catch {
    return null;
  }
}

function migrateGear(character: Character): void {
  const raw = character.equipment as Record<string, Item | null | undefined>;
  const next = emptyEquipment();
  for (const slot of GEAR_SLOTS) {
    if (raw[slot]) next[slot] = raw[slot] ?? null;
  }
  if (!next.chest && raw.armor) next.chest = raw.armor;
  if (!next.neck && raw.trinket) next.neck = raw.trinket;
  character.equipment = next;
  const gear = [...GEAR_SLOTS.map((slot) => character.equipment[slot]), ...character.inventory];
  for (const item of gear) {
    if (item) migrateItem(item);
  }
}

function migrateItem(item: Item): void {
  const oldRarity = item.rarity as string;
  const rarityMap: Record<string, Rarity> = { common: "white", magic: "blue", rare: "purple" };
  if (rarityMap[oldRarity]) item.rarity = rarityMap[oldRarity];
  const oldSlot = item.slot as string;
  if (oldSlot === "armor") {
    item.slot = "chest";
    item.armorType = item.armorType ?? guessArmor(item.name);
  } else if (oldSlot === "trinket") {
    item.slot = "neck";
    item.armorType = null;
  }
  if (!item.armorType && ["head", "chest", "belt", "boots", "gloves"].includes(item.slot)) {
    item.armorType = guessArmor(item.name);
  }
  if (item.armorType === undefined) item.armorType = null;
  if (!Number.isFinite(item.bornLevel)) item.bornLevel = 0;
  if (!Number.isFinite(item.ilvl)) item.ilvl = 1;
  if (!Number.isFinite(item.dye)) item.dye = 0xcfc6b8;
  if (typeof item.ethereal !== "boolean") item.ethereal = false;
  if (typeof item.uniqueId !== "string") item.uniqueId = null;
  if (!Number.isFinite(item.sockets)) item.sockets = 0;
  if (!Array.isArray(item.gems)) item.gems = [];
  item.gems = item.gems.slice(0, item.sockets);
  while (item.gems.length < item.sockets) item.gems.push(null);
}

function guessArmor(name: string): ArmorType {
  if (/mail/i.test(name)) return "mail";
  if (/plate|cairn/i.test(name)) return "plate";
  if (/leather|wrap|night/i.test(name)) return "leather";
  return "cloth";
}

function migrateAttributes(character: Character): void {
  const spent = character.spent as Record<string, number>;
  character.spent = {
    strength: spent.strength ?? 0,
    agility: spent.agility ?? spent.dexterity ?? 0,
    endurance: spent.endurance ?? spent.vitality ?? 0,
    wisdom: spent.wisdom ?? spent.energy ?? 0,
  };
  const gear = [...GEAR_SLOTS.map((slot) => character.equipment[slot]), ...character.inventory];
  for (const item of gear) {
    if (!item) continue;
    for (const affix of item.affixes) {
      if (affix.key === "dexterity") {
        affix.key = "agility";
        affix.label = affix.label.replace("Dexterity", "Agility");
      } else if (affix.key === "vitality") {
        affix.key = "endurance";
        affix.label = affix.label.replace("Vitality", "Endurance");
      } else if (affix.key === "energy") {
        affix.key = "wisdom";
        affix.label = affix.label.replace("Energy", "Wisdom");
      }
    }
  }
}

function validCharacter(character: Character): boolean {
  return (
    Number.isFinite(character.level) &&
    character.level >= 1 &&
    !!character.spent &&
    Array.isArray(character.inventory) &&
    Array.isArray(character.slotted) &&
    character.slotted.length === 3
  );
}

export function readSave(storage: Storage): SaveFile | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  return deserialize(raw);
}

export function writeSave(storage: Storage, snapshot: Snapshot): void {
  storage.setItem(SAVE_KEY, serialize(snapshot));
}
