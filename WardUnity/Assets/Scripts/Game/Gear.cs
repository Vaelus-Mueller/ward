using System;
using System.Collections.Generic;
using UnityEngine;

namespace Ward.Game
{
    public enum GearSlot
    {
        Weapon,
        Armor,
        Trinket
    }

    [Serializable]
    public class GearItem
    {
        public string id;
        public string name;
        public GearSlot slot;
        public int cost;
        public int strength;
        public int stamina;
        public int agility;
        public string blurb;
    }

    public static class GearCatalog
    {
        public static readonly List<GearItem> Shop = new()
        {
            new() { id = "whetblade", name = "Whetblade", slot = GearSlot.Weapon, cost = 40, strength = 2, blurb = "A filed edge from Ashgate." },
            new() { id = "ashmail", name = "Ash Mail", slot = GearSlot.Armor, cost = 55, stamina = 3, blurb = "Soot-black rings." },
            new() { id = "gatecharm", name = "Gate Charm", slot = GearSlot.Trinket, cost = 35, agility = 2, blurb = "A ward token on a cord." },
            new() { id = "ironspike", name = "Iron Spike", slot = GearSlot.Weapon, cost = 90, strength = 4, blurb = "Heavy nail of the Tenth Ward." },
        };

        public static GearItem ById(string id)
        {
            foreach (var g in Shop)
                if (g.id == id) return g;
            return null;
        }
    }

    public static class GearRules
    {
        public static void ApplyBonuses(CharacterData c)
        {
            // Bonuses are stored on equipped items; CharacterData.AttackDamage reads them.
        }

        public static int BonusStrength(CharacterData c)
        {
            var n = 0;
            foreach (var id in c.equippedIds)
            {
                var g = GearCatalog.ById(id);
                if (g != null) n += g.strength;
            }
            return n;
        }

        public static int BonusStamina(CharacterData c)
        {
            var n = 0;
            foreach (var id in c.equippedIds)
            {
                var g = GearCatalog.ById(id);
                if (g != null) n += g.stamina;
            }
            return n;
        }

        public static int BonusAgility(CharacterData c)
        {
            var n = 0;
            foreach (var id in c.equippedIds)
            {
                var g = GearCatalog.ById(id);
                if (g != null) n += g.agility;
            }
            return n;
        }

        public static bool TryBuy(CharacterData c, string itemId)
        {
            var g = GearCatalog.ById(itemId);
            if (g == null || c.gold < g.cost) return false;
            if (c.inventoryIds == null) c.inventoryIds = Array.Empty<string>();
            if (System.Array.IndexOf(c.inventoryIds, itemId) >= 0) return false;
            c.gold -= g.cost;
            var list = new List<string>(c.inventoryIds) { itemId };
            c.inventoryIds = list.ToArray();
            EquipBest(c, g.slot, itemId);
            return true;
        }

        static void EquipBest(CharacterData c, GearSlot slot, string itemId)
        {
            if (c.equippedIds == null) c.equippedIds = Array.Empty<string>();
            var kept = new List<string>();
            foreach (var id in c.equippedIds)
            {
                var eg = GearCatalog.ById(id);
                if (eg == null || eg.slot != slot) kept.Add(id);
            }
            kept.Add(itemId);
            c.equippedIds = kept.ToArray();
        }
    }
}
