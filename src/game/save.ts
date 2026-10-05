import { addGem } from "./items";
import { emptyEquipment, GEAR_SLOTS, type ArmorType, type Character, type GemKind, type Item, type Rarity, type SocketGem } from "./types";
import type { Snapshot } from "./sim";

export const SAVE_KEY = "vaelus-save-v1";
export const SLOTS_KEY = "vaelus-slots-v1";
export const SLOT_COUNT = 3;

export interface SaveSlot {
  name: string;
  save: SaveFile | null;
}

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
    data.character.name = cleanName(data.character.name);
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
  if (!Array.isArray(character.gems)) character.gems = [];
  const kept = [];
  for (const item of character.inventory) {
    const kind = item.slot === "gem" ? item.gems[0]?.kind : null;
    if (kind) addGem(character, kind, item.quality || item.gems[0]?.quality || 1, 1);
    else kept.push(item);
  }
  character.inventory = kept;
  if (!Array.isArray(character.materials)) character.materials = [];
  if (!Array.isArray(character.salvageMarks)) character.salvageMarks = ["grey", "white"];
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
  if (!Number.isFinite(item.quality)) item.quality = item.slot === "gem" ? 1 : 0;
  if (!Number.isFinite(item.sockets)) item.sockets = 0;
  const raw = (Array.isArray(item.gems) ? item.gems : []) as unknown[];
  const next: (SocketGem | null)[] = [];
  for (const entry of raw) next.push(asSocket(entry));
  if (item.slot === "gem") {
    const gem = next.find((entry) => entry);
    item.quality = Math.min(20, Math.max(1, item.quality || gem?.quality || 1));
    item.sockets = 0;
    item.gems = gem ? [{ kind: gem.kind, quality: item.quality }] : [];
    return;
  }
  item.gems = next.slice(0, item.sockets);
  while (item.gems.length < item.sockets) item.gems.push(null);
}

function asSocket(entry: unknown): SocketGem | null {
  if (!entry) return null;
  if (typeof entry === "string") return { kind: entry as GemKind, quality: 1 };
  if (typeof entry === "object" && "kind" in entry) {
    const kind = (entry as { kind?: GemKind }).kind;
    if (!kind) return null;
    const quality = Number((entry as { quality?: number }).quality);
    return { kind, quality: Number.isFinite(quality) && quality > 0 ? quality : 1 };
  }
  return null;
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

export function cleanName(raw: unknown): string {
  const text = typeof raw === "string" ? raw.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24) : "";
  return text || "Exile";
}

export function readSlots(storage: Storage): SaveSlot[] {
  return loadBank(storage).slots;
}

export function writeSlot(storage: Storage, index: number, snapshot: Snapshot): void {
  const bank = loadBank(storage);
  const name = cleanName(snapshot.character.name);
  snapshot.character.name = name;
  const file: SaveFile = { version: 1, ...snapshot, character: snapshot.character };
  bank.slots[index] = { name, save: file };
  storage.setItem(SLOTS_KEY, JSON.stringify({ version: 1, slots: bank.slots }));
}

export function nameSlot(storage: Storage, index: number, raw: string): void {
  const bank = loadBank(storage);
  const draft = raw.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24);
  const slot = bank.slots[index];
  slot.name = draft;
  if (slot.save && draft) slot.save.character.name = draft;
  storage.setItem(SLOTS_KEY, JSON.stringify({ version: 1, slots: bank.slots }));
}

function emptySlots(): SaveSlot[] {
  return Array.from({ length: SLOT_COUNT }, () => ({ name: "", save: null }));
}

function loadBank(storage: Storage): { slots: SaveSlot[] } {
  const raw = storage.getItem(SLOTS_KEY);
  if (raw) {
    const parsed = parseBank(raw);
    if (parsed) return parsed;
  }
  const slots = emptySlots();
  const legacy = readSave(storage);
  if (legacy) slots[0] = { name: legacy.character.name, save: legacy };
  storage.setItem(SLOTS_KEY, JSON.stringify({ version: 1, slots }));
  return { slots };
}

function parseBank(raw: string): { slots: SaveSlot[] } | null {
  try {
    const data = JSON.parse(raw) as { version?: number; slots?: { name?: string; save?: SaveFile | null }[] };
    if (!data || data.version !== 1 || !Array.isArray(data.slots)) return null;
    const slots = emptySlots();
    for (let i = 0; i < SLOT_COUNT; i++) {
      const entry = data.slots[i];
      if (!entry) continue;
      const draft = typeof entry.name === "string" ? entry.name.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24) : "";
      const save = entry.save ? deserialize(JSON.stringify(entry.save)) : null;
      slots[i] = { name: save?.character.name || draft, save };
    }
    return { slots };
  } catch {
    return null;
  }
}
