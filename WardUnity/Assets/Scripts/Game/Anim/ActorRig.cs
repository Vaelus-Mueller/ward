using System.Collections.Generic;
using UnityEngine;

namespace Ward.Game.Anim
{
    /// <summary>
    /// Builds a Transform skeleton from <see cref="SkeletonDef"/>.
    /// Debug capsules stand in until paint/meshes are bound.
    /// </summary>
    public class ActorRig : MonoBehaviour
    {
        readonly Dictionary<string, Transform> _bones = new();
        readonly Dictionary<string, Quaternion> _bindLocal = new();
        readonly Dictionary<string, Vector3> _bindPos = new();
        Color _tint = new(0.72f, 0.58f, 0.48f, 1f);
        bool _showDebug = true;

        public SkeletonKind Kind { get; private set; } = SkeletonKind.Biped;
        public Transform Root { get; private set; }
        public IReadOnlyDictionary<string, Transform> Bones => _bones;
        public bool IsAttackLocked { get; private set; }

        ProceduralAnimator _anim;
        WeaponMomentum _weapon;

        public ProceduralAnimator Animator => _anim;
        public WeaponMomentum Weapon => _weapon;

        public static ActorRig Create(
            Transform parent,
            string name,
            Color tint,
            float scale = 1f,
            bool withWeapon = false,
            SkeletonKind kind = SkeletonKind.Biped)
        {
            var go = new GameObject(name);
            if (parent != null) go.transform.SetParent(parent, false);
            go.transform.localScale = Vector3.one * scale;
            var rig = go.AddComponent<ActorRig>();
            rig._tint = tint;
            rig.Kind = kind;
            rig.Build(SkeletonDef.ForKind(kind));
            rig._anim = go.AddComponent<ProceduralAnimator>();
            rig._anim.Bind(rig);
            if (withWeapon)
            {
                rig._weapon = go.AddComponent<WeaponMomentum>();
                rig._weapon.Bind(rig);
            }
            return rig;
        }

        public Transform GetBone(string name) =>
            _bones.TryGetValue(name, out var t) ? t : null;

        public Quaternion GetBindLocal(string name) =>
            _bindLocal.TryGetValue(name, out var q) ? q : Quaternion.identity;

        public Vector3 GetBindPosition(string name) =>
            _bindPos.TryGetValue(name, out var p) ? p : Vector3.zero;

        public void SetAttackLocked(bool locked) => IsAttackLocked = locked;

        public void SetDebugVisible(bool visible)
        {
            _showDebug = visible;
            foreach (var rend in GetComponentsInChildren<Transform>(true))
            {
                if (!rend.name.StartsWith("Dbg_")) continue;
                rend.gameObject.SetActive(visible);
            }
        }

        public void SetTint(Color tint)
        {
            _tint = tint;
            foreach (var rend in GetComponentsInChildren<Renderer>())
                if (rend.gameObject.name.StartsWith("Dbg_"))
                    rend.material.color = tint;
        }

        public void AttachMesh(GameObject mesh)
        {
            if (mesh == null) return;
            mesh.transform.SetParent(transform, false);
            mesh.name = "Paint";
        }

        void Build(BoneNode[] def)
        {
            var transforms = new Transform[def.Length];
            for (var i = 0; i < def.Length; i++)
            {
                var node = def[i];
                var go = new GameObject(node.name);
                var parent = node.parent < 0 ? transform : transforms[node.parent];
                go.transform.SetParent(parent, false);
                go.transform.localPosition = node.localPosition;
                go.transform.localRotation = node.localRotation;
                transforms[i] = go.transform;
                _bones[node.name] = go.transform;
                _bindLocal[node.name] = node.localRotation;
                _bindPos[node.name] = node.localPosition;
                if (i == 0) Root = go.transform;
                if (_showDebug) AddDebugCapsule(go.transform, node);
            }
        }

        void AddDebugCapsule(Transform bone, BoneNode node)
        {
            var dbg = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            dbg.name = "Dbg_" + node.name;
            dbg.transform.SetParent(bone, false);
            var len = Mathf.Max(0.08f, node.length);
            dbg.transform.localScale = new Vector3(node.radius * 2f, len * 0.5f, node.radius * 2f);
            dbg.transform.localPosition = EstimateChildOffset(node);
            Object.Destroy(dbg.GetComponent<Collider>());
            dbg.GetComponent<Renderer>().sharedMaterial = WardModels.Unlit(_tint);
        }

        static Vector3 EstimateChildOffset(BoneNode node)
        {
            var n = node.name;
            if (n.StartsWith("Wing") || n.StartsWith("Mote") || n.StartsWith("Lobe") || n.StartsWith("Seg"))
                return node.localPosition.normalized * (node.length * 0.35f);
            if (n.StartsWith("Arm") || n.StartsWith("Forearm") || n.StartsWith("Hand"))
            {
                var sign = n.Contains("_L") ? -1f : 1f;
                if (n == SkeletonDef.HandR && !n.Contains("2") && !n.Contains("3"))
                    return new Vector3(0f, 0f, node.length * 0.35f);
                return new Vector3(sign * node.length * 0.5f, 0f, 0f);
            }
            if (n.StartsWith("Front") || n.StartsWith("Hind") || n.StartsWith("Leg") || n.StartsWith("Shin"))
                return new Vector3(0f, -node.length * 0.5f, 0f);
            if (n is SkeletonDef.FootL or SkeletonDef.FootR or SkeletonDef.FrontFootL or SkeletonDef.FrontFootR
                or SkeletonDef.HindFootL or SkeletonDef.HindFootR)
                return new Vector3(0f, 0f, node.length * 0.35f);
            if (n is SkeletonDef.Head or SkeletonDef.Beak or SkeletonDef.SwarmCore)
                return new Vector3(0f, node.length * 0.35f, 0f);
            return new Vector3(0f, node.length * 0.35f, 0f);
        }
    }
}
