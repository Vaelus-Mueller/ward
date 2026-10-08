using System;
using System.IO;
using UnityEngine;

namespace Ward.Game
{
    [Serializable]
    public class SaveSlot
    {
        public CharacterData character;
        public float hp;
        public float x;
        public float y;
        public int gold;
        public string[] clearedPackIds = Array.Empty<string>();
    }

    public static class SaveService
    {
        public const int SlotCount = 3;

        static int _active = -1;

        public static int Active
        {
            get
            {
                if (_active < 0) _active = Mathf.Clamp(PlayerPrefs.GetInt("ward-active-slot", 0), 0, SlotCount - 1);
                return _active;
            }
        }

        public static void Select(int slot)
        {
            _active = Mathf.Clamp(slot, 0, SlotCount - 1);
            PlayerPrefs.SetInt("ward-active-slot", _active);
        }

        public static void Write(SaveSlot slot) => Write(Active, slot);

        public static void Write(int slot, SaveSlot data)
        {
            var json = JsonUtility.ToJson(data, true);
            File.WriteAllText(ModernPath(slot), json);
        }

        public static SaveSlot Read() => Read(Active);

        public static SaveSlot Read(int slot)
        {
            var path = ModernPath(slot);
            if (!File.Exists(path) && slot == 0)
            {
                var legacy = System.IO.Path.Combine(Application.persistentDataPath, "ward_slot0.json");
                if (File.Exists(legacy)) path = legacy;
            }
            if (!File.Exists(path)) return null;
            try
            {
                return JsonUtility.FromJson<SaveSlot>(File.ReadAllText(path));
            }
            catch
            {
                return null;
            }
        }

        public static void Clear(int slot)
        {
            var path = ModernPath(slot);
            if (File.Exists(path)) File.Delete(path);
            if (slot == 0)
            {
                var legacy = System.IO.Path.Combine(Application.persistentDataPath, "ward_slot0.json");
                if (File.Exists(legacy)) File.Delete(legacy);
            }
        }

        static string ModernPath(int slot) =>
            System.IO.Path.Combine(Application.persistentDataPath, "ward-slot-" + Mathf.Clamp(slot, 0, SlotCount - 1) + ".json");
    }
}
