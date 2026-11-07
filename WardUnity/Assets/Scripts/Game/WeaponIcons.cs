using System.Collections.Generic;
using UnityEngine;

namespace Ward.Game
{
    public enum WeaponFamily
    {
        Unarmed,
        Sword,
        Axe,
        Mace,
        Flail,
        Polearm,
        Staff,
        Wand,
        Bow,
        Handbow,
        Thrown
    }

    /// <summary>Procedural silhouette sprites for the attack button.</summary>
    public static class WeaponIcons
    {
        static readonly Dictionary<WeaponFamily, Sprite> Cache = new();

        public static Sprite ForFamily(WeaponFamily family)
        {
            if (Cache.TryGetValue(family, out var cached) && cached != null) return cached;
            var sprite = Build(family);
            Cache[family] = sprite;
            return sprite;
        }

        public static WeaponFamily FamilyForEquipped(CharacterData c)
        {
            if (c?.equippedIds == null) return WeaponFamily.Unarmed;
            foreach (var id in c.equippedIds)
            {
                var g = GearCatalog.ById(id);
                if (g != null && g.slot == GearSlot.Weapon) return g.family;
            }
            return WeaponFamily.Unarmed;
        }

        public static List<WeaponFamily> FamiliesForEquipped(CharacterData c)
        {
            var list = new List<WeaponFamily>(2);
            if (c?.equippedIds == null) return list;
            foreach (var id in c.equippedIds)
            {
                var g = GearCatalog.ById(id);
                if (g == null || g.slot != GearSlot.Weapon) continue;
                list.Add(g.family);
            }
            return list;
        }

        static Sprite Build(WeaponFamily family)
        {
            const int size = 64;
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            tex.wrapMode = TextureWrapMode.Clamp;
            tex.filterMode = FilterMode.Bilinear;
            Clear(tex);
            switch (family)
            {
                case WeaponFamily.Sword:
                    DrawLine(tex, 32, 8, 32, 48, 3);
                    DrawLine(tex, 24, 20, 40, 20, 2);
                    DrawRect(tex, 28, 48, 8, 10);
                    break;
                case WeaponFamily.Axe:
                    DrawLine(tex, 28, 10, 28, 52, 3);
                    DrawTri(tex, 30, 14, 52, 22, 30, 30);
                    break;
                case WeaponFamily.Mace:
                    DrawLine(tex, 32, 14, 32, 48, 3);
                    DrawCircle(tex, 32, 18, 10);
                    break;
                case WeaponFamily.Flail:
                    DrawLine(tex, 22, 48, 32, 28, 2);
                    DrawLine(tex, 32, 28, 44, 18, 2);
                    DrawCircle(tex, 46, 14, 7);
                    break;
                case WeaponFamily.Polearm:
                    DrawLine(tex, 32, 6, 32, 56, 2);
                    DrawTri(tex, 32, 6, 44, 18, 20, 18);
                    break;
                case WeaponFamily.Staff:
                    DrawLine(tex, 32, 6, 32, 56, 3);
                    DrawCircle(tex, 32, 10, 6);
                    break;
                case WeaponFamily.Wand:
                    DrawLine(tex, 24, 48, 40, 12, 2);
                    DrawCircle(tex, 42, 10, 5);
                    break;
                case WeaponFamily.Bow:
                    DrawArc(tex, 18, 8, 18, 56, 40);
                    DrawLine(tex, 18, 8, 18, 56, 2);
                    DrawLine(tex, 18, 32, 42, 32, 2);
                    break;
                case WeaponFamily.Handbow:
                    DrawRect(tex, 14, 22, 28, 14);
                    DrawLine(tex, 42, 29, 54, 29, 2);
                    DrawLine(tex, 14, 24, 8, 36, 2);
                    break;
                case WeaponFamily.Thrown:
                    DrawLine(tex, 16, 48, 48, 16, 3);
                    DrawTri(tex, 48, 16, 54, 28, 36, 22);
                    break;
                default:
                    // Fists
                    DrawCircle(tex, 22, 34, 10);
                    DrawCircle(tex, 42, 34, 10);
                    DrawRect(tex, 18, 40, 8, 12);
                    DrawRect(tex, 38, 40, 8, 12);
                    break;
            }
            tex.Apply(false, false);
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect);
        }

        static void Clear(Texture2D tex)
        {
            var clear = new Color(1f, 1f, 1f, 0f);
            for (var y = 0; y < tex.height; y++)
            for (var x = 0; x < tex.width; x++)
                tex.SetPixel(x, y, clear);
        }

        static void Plot(Texture2D tex, int x, int y, float a = 1f)
        {
            if (x < 0 || y < 0 || x >= tex.width || y >= tex.height) return;
            var c = tex.GetPixel(x, y);
            c.a = Mathf.Max(c.a, a);
            c.r = c.g = c.b = 1f;
            tex.SetPixel(x, y, c);
        }

        static void DrawRect(Texture2D tex, int x, int y, int w, int h)
        {
            for (var yy = y; yy < y + h; yy++)
            for (var xx = x; xx < x + w; xx++)
                Plot(tex, xx, yy);
        }

        static void DrawCircle(Texture2D tex, int cx, int cy, int r)
        {
            var r2 = r * r;
            for (var y = -r; y <= r; y++)
            for (var x = -r; x <= r; x++)
                if (x * x + y * y <= r2) Plot(tex, cx + x, cy + y);
        }

        static void DrawLine(Texture2D tex, int x0, int y0, int x1, int y1, int thickness)
        {
            var dx = Mathf.Abs(x1 - x0);
            var dy = Mathf.Abs(y1 - y0);
            var sx = x0 < x1 ? 1 : -1;
            var sy = y0 < y1 ? 1 : -1;
            var err = dx - dy;
            while (true)
            {
                for (var ty = -thickness / 2; ty <= thickness / 2; ty++)
                for (var tx = -thickness / 2; tx <= thickness / 2; tx++)
                    Plot(tex, x0 + tx, y0 + ty);
                if (x0 == x1 && y0 == y1) break;
                var e2 = 2 * err;
                if (e2 > -dy) { err -= dy; x0 += sx; }
                if (e2 < dx) { err += dx; y0 += sy; }
            }
        }

        static void DrawTri(Texture2D tex, int x0, int y0, int x1, int y1, int x2, int y2)
        {
            var minX = Mathf.Min(x0, Mathf.Min(x1, x2));
            var maxX = Mathf.Max(x0, Mathf.Max(x1, x2));
            var minY = Mathf.Min(y0, Mathf.Min(y1, y2));
            var maxY = Mathf.Max(y0, Mathf.Max(y1, y2));
            for (var y = minY; y <= maxY; y++)
            for (var x = minX; x <= maxX; x++)
                if (PointInTri(x, y, x0, y0, x1, y1, x2, y2)) Plot(tex, x, y);
        }

        static bool PointInTri(int px, int py, int x0, int y0, int x1, int y1, int x2, int y2)
        {
            var d1 = Sign(px, py, x0, y0, x1, y1);
            var d2 = Sign(px, py, x1, y1, x2, y2);
            var d3 = Sign(px, py, x2, y2, x0, y0);
            var hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
            var hasPos = d1 > 0 || d2 > 0 || d3 > 0;
            return !(hasNeg && hasPos);
        }

        static int Sign(int px, int py, int x0, int y0, int x1, int y1) =>
            (px - x1) * (y0 - y1) - (x0 - x1) * (py - y1);

        static void DrawArc(Texture2D tex, int x0, int y0, int x1, int y1, int bulgeX)
        {
            for (var i = 0; i <= 24; i++)
            {
                var t = i / 24f;
                var x = Mathf.RoundToInt(Mathf.Lerp(x0, x1, t));
                var y = Mathf.RoundToInt(Mathf.Lerp(y0, y1, t));
                var bend = Mathf.Sin(t * Mathf.PI);
                x = Mathf.RoundToInt(Mathf.Lerp(x, bulgeX, bend * 0.55f));
                DrawLine(tex, x, y, x, y, 3);
            }
        }
    }
}
