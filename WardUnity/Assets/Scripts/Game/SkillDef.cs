using System;
using System.Collections.Generic;

namespace Ward.Game
{
    public enum SkillKind
    {
        Active,
        Aura,
        Passive
    }

    [Serializable]
    public class SkillDef
    {
        public string id;
        public string name;
        public SkillKind kind;
        public string sector;
        public float cooldown = 4f;
        public float damageMul = 1.4f;
        public string blurb;
    }

    public static class SkillCatalog
    {
        public static readonly List<SkillDef> All = new()
        {
            new() { id = "cleave", name = "Cleave", kind = SkillKind.Active, sector = "Bulwark", cooldown = 3.5f, damageMul = 1.6f, blurb = "Wide melee arc." },
            new() { id = "shadowstep", name = "Shadow Step", kind = SkillKind.Active, sector = "Shade", cooldown = 5f, damageMul = 1.2f, blurb = "Dash and strike." },
            new() { id = "wardpulse", name = "Ward Pulse", kind = SkillKind.Active, sector = "Rite", cooldown = 6f, damageMul = 1.3f, blurb = "Burst of gate-light." },
            new() { id = "ironhide", name = "Iron Hide", kind = SkillKind.Aura, sector = "Bulwark", cooldown = 0f, blurb = "Less damage taken." },
            new() { id = "keen", name = "Keen Edge", kind = SkillKind.Passive, sector = "Shade", blurb = "+damage on hit." },
            new() { id = "ember", name = "Ember Font", kind = SkillKind.Passive, sector = "Rite", blurb = "Slow life regen." },
        };

        public static SkillDef ById(string id)
        {
            foreach (var s in All)
                if (s.id == id) return s;
            return null;
        }
    }
}
