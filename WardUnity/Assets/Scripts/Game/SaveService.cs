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
        const string FileName = "ward_slot0.json";

        static string Path => System.IO.Path.Combine(Application.persistentDataPath, FileName);

        public static bool HasSave => File.Exists(Path);

        public static void Write(SaveSlot slot)
        {
            var json = JsonUtility.ToJson(slot, true);
            File.WriteAllText(Path, json);
        }

        public static SaveSlot Read()
        {
            if (!File.Exists(Path)) return null;
            try
            {
                return JsonUtility.FromJson<SaveSlot>(File.ReadAllText(Path));
            }
            catch
            {
                return null;
            }
        }

        public static void Clear()
        {
            if (File.Exists(Path)) File.Delete(Path);
        }
    }
}
