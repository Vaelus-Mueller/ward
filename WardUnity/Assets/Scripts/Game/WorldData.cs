using System;
using System.Collections.Generic;
using UnityEngine;

namespace Ward.Game
{
    [Serializable]
    public class PackSpot
    {
        public string id;
        public int level;
        public string placeName;
        public Vector2 position;
        public int size;
        public bool boss;
    }

    public static class WorldData
    {
        public const float ArenaWidth = 16f;
        public const float ArenaHeight = 12f;
        public const float ArenaHalfX = 7.3f;
        public const float ArenaHalfZ = 5.3f;
        public const float RoadHalf = ArenaHalfX;
        public const float SpawnRadius = 7f;
        public static readonly Vector3 CameraOffset = new(0f, 11f, -6.5f);

        public static Vector2 RoadStart => new(0f, -3.2f);

        [Serializable]
        class PackFile
        {
            public PackFileEntry[] places;
        }

        [Serializable]
        class PackFileEntry
        {
            public string id;
            public int level;
            public string name;
            public int size;
            public bool boss;
        }

        public static List<PackSpot> BuildPacks()
        {
            var fromDisk = TryLoadPackFile();
            var first = fromDisk != null && fromDisk.Length > 0 ? fromDisk[0] : null;
            var second = fromDisk != null && fromDisk.Length > 1 ? fromDisk[1] : null;
            return new List<PackSpot>
            {
                new()
                {
                    id = first?.id ?? "1-0",
                    level = first?.level ?? 1,
                    placeName = first?.name ?? "Threshold",
                    position = new Vector2(-1.2f, 1.2f),
                    size = 3,
                    boss = false
                },
                new()
                {
                    id = second?.id ?? "2-0",
                    level = second?.level ?? 2,
                    placeName = second?.name ?? "Ash Court",
                    position = new Vector2(1.4f, 4.1f),
                    size = 2,
                    boss = true
                }
            };
        }

        static PackFileEntry[] TryLoadPackFile()
        {
            try
            {
                var path = System.IO.Path.Combine(Application.streamingAssetsPath, "world_packs.json");
                if (!System.IO.File.Exists(path)) return null;
                var file = JsonUtility.FromJson<PackFile>(System.IO.File.ReadAllText(path));
                return file?.places;
            }
            catch
            {
                return null;
            }
        }

        public static string PlaceAt(Vector2 pos, List<PackSpot> packs)
        {
            if (packs == null || packs.Count == 0) return "Threshold";
            PackSpot best = packs[0];
            var bestD = float.MaxValue;
            foreach (var p in packs)
            {
                var d = Vector2.Distance(pos, p.position);
                if (d < bestD)
                {
                    bestD = d;
                    best = p;
                }
            }
            return $"Level {best.level} · {best.placeName}";
        }
    }
}
