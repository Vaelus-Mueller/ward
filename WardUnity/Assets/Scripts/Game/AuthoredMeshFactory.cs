using UnityEngine;

namespace Ward.Game
{
    /// <summary>
    /// Placeholder authored meshes with LODGroup (M2). Replace with Blender/KayKit exports later;
    /// keep LOD0/1/2 structure so ASTC-textured assets drop in without code changes.
    /// </summary>
    public static class AuthoredMeshFactory
    {
        public static GameObject BuildRaceProxy(RaceId race, Gender gender, Transform parent = null)
        {
            var model = WardModels.SpawnActor(WardModels.KeyFor(race, gender), parent);
            if (model != null) return model;

            var root = new GameObject($"Mesh_{race}");
            if (parent != null) root.transform.SetParent(parent, false);

            var lod0 = BuildLodBody(race, gender, 1f, "LOD0");
            var lod1 = BuildLodBody(race, gender, 0.85f, "LOD1");
            var lod2 = BuildLodBody(race, gender, 0.65f, "LOD2");
            lod0.transform.SetParent(root.transform, false);
            lod1.transform.SetParent(root.transform, false);
            lod2.transform.SetParent(root.transform, false);

            var group = root.AddComponent<LODGroup>();
            group.SetLODs(new[]
            {
                new LOD(0.4f, lod0.GetComponentsInChildren<Renderer>()),
                new LOD(0.15f, lod1.GetComponentsInChildren<Renderer>()),
                new LOD(0.03f, lod2.GetComponentsInChildren<Renderer>()),
            });
            group.RecalculateBounds();
            return root;
        }

        public static GameObject BuildEnemyProxy(bool elite, Transform parent = null)
        {
            var root = new GameObject(elite ? "EnemyElite" : "Enemy");
            if (parent != null) root.transform.SetParent(parent, false);
            var lod0 = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            lod0.name = "LOD0";
            lod0.transform.SetParent(root.transform, false);
            var tint = elite ? new Color(0.75f, 0.25f, 0.2f) : new Color(0.45f, 0.4f, 0.38f);
            lod0.GetComponent<Renderer>().material = WardModels.Unlit(tint);
            var lod1 = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            lod1.name = "LOD1";
            lod1.transform.SetParent(root.transform, false);
            lod1.transform.localScale = Vector3.one * 0.9f;
            lod1.GetComponent<Renderer>().material = WardModels.Unlit(tint);
            Object.Destroy(lod0.GetComponent<Collider>());
            Object.Destroy(lod1.GetComponent<Collider>());
            var group = root.AddComponent<LODGroup>();
            group.SetLODs(new[]
            {
                new LOD(0.35f, new[] { lod0.GetComponent<Renderer>() }),
                new LOD(0.08f, new[] { lod1.GetComponent<Renderer>() }),
            });
            group.RecalculateBounds();
            if (elite) root.transform.localScale = Vector3.one * 1.35f;
            return root;
        }

        static GameObject BuildLodBody(RaceId race, Gender gender, float detail, string name)
        {
            var go = new GameObject(name);
            var height = race switch
            {
                RaceId.Minotaur => 2.2f,
                RaceId.Golem => 2.05f,
                RaceId.Dwarf => 1.25f,
                RaceId.Gnome => 1.05f,
                RaceId.Hobbit => 1.1f,
                RaceId.Elf => 1.95f,
                _ => 1.8f
            } * detail;
            if (gender == Gender.Female && RaceRules.HasGender(race)) height *= 0.95f;

            var color = race switch
            {
                RaceId.Elf => new Color(0.55f, 0.7f, 0.45f),
                RaceId.Dwarf => new Color(0.7f, 0.45f, 0.3f),
                RaceId.Insectoid => new Color(0.45f, 0.65f, 0.3f),
                RaceId.Minotaur => new Color(0.55f, 0.4f, 0.28f),
                RaceId.Golem => new Color(0.55f, 0.52f, 0.45f),
                RaceId.Lizard => new Color(0.35f, 0.55f, 0.32f),
                RaceId.Undead => new Color(0.55f, 0.65f, 0.55f),
                _ => new Color(0.72f, 0.58f, 0.48f)
            };

            var torso = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            torso.transform.SetParent(go.transform, false);
            torso.transform.localScale = new Vector3(0.55f * detail, height * 0.28f, 0.4f * detail);
            torso.transform.localPosition = new Vector3(0f, height * 0.45f, 0f);
            torso.GetComponent<Renderer>().material = WardModels.Unlit(color);
            Object.Destroy(torso.GetComponent<Collider>());

            if (detail > 0.7f)
            {
                var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                head.transform.SetParent(go.transform, false);
                head.transform.localScale = Vector3.one * (height * 0.18f);
                head.transform.localPosition = new Vector3(0f, height * 0.82f, 0f);
                head.GetComponent<Renderer>().material = WardModels.Unlit(color);
                Object.Destroy(head.GetComponent<Collider>());
            }
            return go;
        }
    }
}
