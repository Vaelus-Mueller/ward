using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using UnityEngine.Rendering;

namespace Ward.Game
{
    /// <summary>
    /// Dungeon props come from imported OBJ tiles. Characters and monsters are the
    /// original Ward meshes, baked to vertex-colored text so each part keeps its color.
    /// </summary>
    public static class WardModels
    {
        static readonly string[] EnemyKeys =
        {
            "mon_wolf", "mon_skeleton", "mon_zombie", "mon_imp",
            "mon_spider", "mon_slime", "mon_cultist", "mon_gargoyle"
        };

        static readonly Dictionary<string, Mesh> ActorMeshes = new();

        public static string KeyFor(RaceId race, Gender gender = Gender.Male)
        {
            var key = race switch
            {
                RaceId.Elf => "elf",
                RaceId.Dwarf => "dwarf",
                RaceId.Gnome => "gnome",
                RaceId.Hobbit => "hobbit",
                RaceId.Insectoid => "insectoid",
                RaceId.Minotaur => "minotaur",
                RaceId.Golem => "golem",
                RaceId.Lizard => "lizard",
                RaceId.Undead => "undead",
                _ => "human"
            };
            if (gender == Gender.Female && RaceRules.HasGender(race)) key += "_f";
            return key;
        }

        public static Material Unlit(Color color, Texture tex = null)
        {
            var src = Resources.Load<Material>("WardUnlit");
            var shader = src != null ? src.shader : Shader.Find("Ward/Unlit");
            var mat = shader != null ? new Material(shader) : new Material(Shader.Find("Unlit/Color"));
            mat.color = color;
            if (tex != null) mat.mainTexture = tex;
            return mat;
        }

        public static Material VertexUnlit()
        {
            var shader = Shader.Find("Ward/UnlitVertex");
            return shader != null ? new Material(shader) : Unlit(Color.white);
        }

        public static GameObject Spawn(string key, Transform parent, bool collide)
        {
            var prefab = Resources.Load<GameObject>("Models/" + key);
            if (prefab == null) return null;
            var go = Object.Instantiate(prefab, parent, false);
            go.name = key;
            var fallback = Resources.Load<Texture2D>("Models/" + key + "_0");
            foreach (var r in go.GetComponentsInChildren<Renderer>(true))
            {
                var shared = r.sharedMaterials;
                var mats = new Material[Mathf.Max(1, shared.Length)];
                for (var i = 0; i < mats.Length; i++)
                {
                    var tex = i < shared.Length && shared[i] != null ? shared[i].mainTexture : null;
                    mats[i] = Unlit(Color.white, tex != null ? tex : fallback);
                }
                r.materials = mats;
            }
            if (collide)
            {
                foreach (var mf in go.GetComponentsInChildren<MeshFilter>())
                {
                    var col = mf.gameObject.AddComponent<MeshCollider>();
                    col.sharedMesh = mf.sharedMesh;
                }
            }
            return go;
        }

        public static GameObject SpawnActor(string key, Transform parent)
        {
            var text = Resources.Load<TextAsset>("Models/Actors/" + key);
            if (text == null) return null;
            if (!ActorMeshes.TryGetValue(key, out var mesh))
            {
                mesh = ParseActor(text.text);
                ActorMeshes[key] = mesh;
            }
            var go = new GameObject(key);
            if (parent != null) go.transform.SetParent(parent, false);
            var filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = VertexUnlit();
            return go;
        }

        public static GameObject SpawnEnemy(int index, bool elite, Transform parent)
        {
            var key = elite ? "mon_hillock" : EnemyKeys[Mathf.Abs(index) % EnemyKeys.Length];
            var go = SpawnActor(key, parent);
            if (go == null) return null;
            if (elite) go.transform.localScale = Vector3.one * 1.12f;
            return go;
        }

        static Mesh ParseActor(string text)
        {
            var verts = new List<Vector3>(4096);
            var colors = new List<Color>(4096);
            var tris = new List<int>(8192);
            var culture = CultureInfo.InvariantCulture;
            var lines = text.Split('\n');
            foreach (var raw in lines)
            {
                var line = raw.Trim();
                if (line.Length < 2) continue;
                if (line[0] == 'v' && line[1] == ' ')
                {
                    var p = line.Split(' ');
                    verts.Add(new Vector3(
                        float.Parse(p[1], culture),
                        float.Parse(p[2], culture),
                        float.Parse(p[3], culture)));
                    colors.Add(new Color(
                        float.Parse(p[4], culture),
                        float.Parse(p[5], culture),
                        float.Parse(p[6], culture)));
                }
                else if (line[0] == 'f' && line[1] == ' ')
                {
                    var p = line.Split(' ');
                    tris.Add(int.Parse(p[1], culture) - 1);
                    tris.Add(int.Parse(p[2], culture) - 1);
                    tris.Add(int.Parse(p[3], culture) - 1);
                }
            }

            var mesh = new Mesh();
            mesh.indexFormat = verts.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16;
            mesh.SetVertices(verts);
            mesh.SetColors(colors);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
