using System;
using UnityEngine;

namespace Ward.Game
{
    [Serializable]
    public class CharacterData
    {
        public string name = "Exile";
        public RaceId race = RaceId.Human;
        public Gender gender = Gender.Male;
        public int level = 1;
        public int xp;
        public int gold;
        public int unspentStats;
        public int unspentSkills;
        public int strength;
        public int agility;
        public int stamina;
        public int luck;
        public int spirit;
        public string[] skillSlots = { "cleave", "shadowstep", "wardpulse" };
        public string[] inventoryIds = Array.Empty<string>();
        public string[] equippedIds = Array.Empty<string>();

        public static CharacterData Create(string name, RaceId race, Gender gender)
        {
            var g = RaceRules.HasGender(race) ? gender : Gender.Male;
            return new CharacterData
            {
                name = string.IsNullOrWhiteSpace(name) ? "Exile" : name.Trim(),
                race = race,
                gender = g,
                skillSlots = new[] { "cleave", "shadowstep", "wardpulse" },
                inventoryIds = Array.Empty<string>(),
                equippedIds = Array.Empty<string>()
            };
        }

        public int MaxLife
        {
            get
            {
                var sta = stamina + GearRules.BonusStamina(this);
                var baseLife = 50 + (level - 1) * 5 + sta;
                return Mathf.Max(1, Mathf.RoundToInt(baseLife * RaceRules.LifeMul(race)));
            }
        }

        public float MoveSpeed => 5.2f * (1f + (agility + GearRules.BonusAgility(this)) * 0.01f);
        public float AttackDamage => 8f + (strength + GearRules.BonusStrength(this)) * 1.4f + level * 0.8f;
        public float AttackRange => 1.6f;
        public float AttackCooldown => Mathf.Max(0.35f, 0.7f - (agility + GearRules.BonusAgility(this)) * 0.008f);
    }
}
