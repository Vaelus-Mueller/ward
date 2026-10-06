import { rollItem, tryAddItem } from "./items";
import type { Character, Item } from "./types";
import { RARITY_LABEL } from "./types";

export type TownVendor = "hub" | "smith" | "merchant" | "gambler";

export const TOWN_NAME = "Ashgate";

export const VENDORS: { id: Exclude<TownVendor, "hub">; name: string; title: string; blurb: string }[] = [
  {
    id: "smith",
    name: "Sable",
    title: "Smith",
    blurb: "Raises item level with salvaged materials. Weapons, armor, shields, and jewelry.",
  },
  {
    id: "merchant",
    name: "Merrick",
    title: "General Merchant",
    blurb: "Buys spare gear for gold. Stock refreshes when you leave the ward for town.",
  },
  {
    id: "gambler",
    name: "Nyx",
    title: "Gambler",
    blurb: "Pays gold for a sealed parcel. Quality is a roll of the bones.",
  },
];

export function sellPrice(item: Item, level: number, vendorPrice = 0): number {
  const rarityMul: Record<string, number> = {
    grey: 0.35,
    white: 0.7,
    green: 1.1,
    blue: 1.6,
    purple: 2.4,
    orange: 3.4,
    yellow: 4.2,
    gold: 5.5,
    red: 7,
    rainbow: 4.8,
  };
  const base = 6 + Math.max(1, item.ilvl || 1) * 2 + level;
  const sockets = item.sockets * 4;
  // Positive vendorPrice = better deals for the player (sell more / buy less).
  const deal = 1 + vendorPrice;
  return Math.max(1, Math.round((base * (rarityMul[item.rarity] ?? 1) + sockets) * deal));
}

export function sellItem(c: Character, uid: string, vendorPrice = 0): string | null {
  const index = c.inventory.findIndex((item) => item.uid === uid);
  if (index < 0) return "That item is not in the pack.";
  const item = c.inventory[index]!;
  if (item.slot === "gem") return "Gems stay in the pouch. Socket or keep them.";
  const gold = sellPrice(item, c.level, vendorPrice);
  c.inventory.splice(index, 1);
  c.gold += gold;
  return null;
}

export function gambleCost(level: number, vendorPrice = 0): number {
  const deal = Math.max(0.65, 1 - vendorPrice * 0.5);
  return Math.max(25, Math.round((40 + level * 12) * deal));
}

export function gambleItem(
  c: Character,
  rng: () => number,
  uid: string,
  vendorPrice = 0,
  vendorQuality = 0,
  magicFind = 0,
): { error: string | null; item: Item | null } {
  const cost = gambleCost(c.level, vendorPrice);
  if (c.gold < cost) return { error: `Nyx wants ${cost} gold.`, item: null };
  const wave = Math.max(1, Math.min(12, Math.floor(c.level / 2) + 1 + Math.floor(vendorQuality * 4)));
  const item = rollItem(rng, wave, uid, c.level, magicFind + vendorQuality);
  if (!tryAddItem(c, item)) return { error: "The pack is full.", item: null };
  c.gold -= cost;
  return { error: null, item };
}

export function merchantStock(
  level: number,
  rng: () => number,
  seedTag: string,
  vendorQuality = 0,
  magicFind = 0,
): Item[] {
  // Deterministic-ish stock for a visit: three modest parcels.
  const stock: Item[] = [];
  for (let i = 0; i < 3; i++) {
    const wave = Math.max(1, Math.min(8, Math.floor(level / 3) + 1 + Math.floor(vendorQuality * 3)));
    stock.push(rollItem(rng, wave, `${seedTag}-${i}`, level, magicFind + vendorQuality));
  }
  return stock;
}

export function buyPrice(item: Item, level: number, vendorPrice = 0): number {
  // Positive vendorPrice cheapens buys.
  const deal = Math.max(0.55, 1 - vendorPrice);
  return Math.max(8, Math.round(sellPrice(item, level, 0) * 2.4 * deal));
}

export function buyStockItem(c: Character, stock: Item[], index: number, vendorPrice = 0): string | null {
  const item = stock[index];
  if (!item) return "That parcel is gone.";
  const cost = buyPrice(item, c.level, vendorPrice);
  if (c.gold < cost) return `Merrick wants ${cost} gold.`;
  if (!tryAddItem(c, { ...item, uid: `${item.uid}-bought-${Date.now()}` })) return "The pack is full.";
  c.gold -= cost;
  stock.splice(index, 1);
  return null;
}

export function gambleBlurb(item: Item): string {
  return `${item.name} · ${RARITY_LABEL[item.rarity]}`;
}
