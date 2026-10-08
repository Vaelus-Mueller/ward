namespace Ward.Game
{
    public enum RaceId
    {
        Human,
        Elf,
        Dwarf,
        Gnome,
        Hobbit,
        Insectoid,
        Minotaur,
        Golem,
        Lizard,
        Undead
    }

    public enum Gender
    {
        Male,
        Female
    }

    public static class RaceRules
    {
        public static bool HasGender(RaceId race) =>
            race != RaceId.Minotaur && race != RaceId.Golem;

        public static string DisplayName(RaceId race) => race switch
        {
            RaceId.Human => "Human",
            RaceId.Elf => "Elf",
            RaceId.Dwarf => "Dwarf",
            RaceId.Gnome => "Gnome",
            RaceId.Hobbit => "Hobbit",
            RaceId.Insectoid => "Insectoid",
            RaceId.Minotaur => "Minotaur",
            RaceId.Golem => "Golem",
            RaceId.Lizard => "Lacerta",
            RaceId.Undead => "Undead",
            _ => race.ToString()
        };

        public static string Blurb(RaceId race) => race switch
        {
            RaceId.Human => "Adaptable wardens of the gate.",
            RaceId.Elf => "Long-lived and keen-eyed.",
            RaceId.Dwarf => "Stout and iron-tempered.",
            RaceId.Gnome => "Clever hands, restless minds.",
            RaceId.Hobbit => "Small, stubborn, hard to pin.",
            RaceId.Insectoid => "Chitin and many-armed fury.",
            RaceId.Minotaur => "Horned strength without gender.",
            RaceId.Golem => "Stone flesh, unisex form.",
            RaceId.Lizard => "Scaled Lacerta of the deep wards.",
            RaceId.Undead => "What the ward refuses to keep buried.",
            _ => ""
        };

        public static float LifeMul(RaceId race) => race switch
        {
            RaceId.Dwarf => 1.06f,
            RaceId.Minotaur => 1.08f,
            RaceId.Golem => 1.1f,
            RaceId.Hobbit => 0.96f,
            RaceId.Elf => 0.97f,
            _ => 1f
        };
    }
}
