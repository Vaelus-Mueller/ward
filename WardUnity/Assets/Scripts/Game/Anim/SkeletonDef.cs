using System;
using System.Collections.Generic;
using UnityEngine;

namespace Ward.Game.Anim
{
    public enum SkeletonKind
    {
        Biped,
        Insectoid4,
        Insectoid6,
        Quadruped,
        WingedQuad,
        WingedBiped,
        /// <summary>Bird / bat-like: 2 wings + 2 legs, no arms.</summary>
        Avian,
        Slug,
        Worm,
        Slime,
        Snake,
        /// <summary>Loose cloud of nodes that can coalesce and lunge.</summary>
        Swarm,
    }

    [Serializable]
    public struct BoneNode
    {
        public string name;
        public int parent;
        public Vector3 localPosition;
        public Quaternion localRotation;
        public float length;
        public float radius;

        public BoneNode(string name, int parent, Vector3 localPosition, float length = 0.2f, float radius = 0.045f)
        {
            this.name = name;
            this.parent = parent;
            this.localPosition = localPosition;
            localRotation = Quaternion.identity;
            this.length = length;
            this.radius = radius;
        }
    }

    public static class SkeletonDef
    {
        public const string Hips = "Hips";
        public const string Spine = "Spine";
        public const string Chest = "Chest";
        public const string Neck = "Neck";
        public const string Head = "Head";
        public const string Beak = "Beak";
        public const string Tail = "Tail";
        public const string TailTip = "TailTip";

        public const string ArmL = "Arm_L";
        public const string ForearmL = "Forearm_L";
        public const string HandL = "Hand_L";
        public const string ArmR = "Arm_R";
        public const string ForearmR = "Forearm_R";
        public const string HandR = "Hand_R";

        public const string Arm2L = "Arm2_L";
        public const string Forearm2L = "Forearm2_L";
        public const string Hand2L = "Hand2_L";
        public const string Arm2R = "Arm2_R";
        public const string Forearm2R = "Forearm2_R";
        public const string Hand2R = "Hand2_R";

        public const string Arm3L = "Arm3_L";
        public const string Forearm3L = "Forearm3_L";
        public const string Hand3L = "Hand3_L";
        public const string Arm3R = "Arm3_R";
        public const string Forearm3R = "Forearm3_R";
        public const string Hand3R = "Hand3_R";

        public const string LegL = "Leg_L";
        public const string ShinL = "Shin_L";
        public const string FootL = "Foot_L";
        public const string LegR = "Leg_R";
        public const string ShinR = "Shin_R";
        public const string FootR = "Foot_R";

        public const string FrontLegL = "FrontLeg_L";
        public const string FrontShinL = "FrontShin_L";
        public const string FrontFootL = "FrontFoot_L";
        public const string FrontLegR = "FrontLeg_R";
        public const string FrontShinR = "FrontShin_R";
        public const string FrontFootR = "FrontFoot_R";
        public const string HindLegL = "HindLeg_L";
        public const string HindShinL = "HindShin_L";
        public const string HindFootL = "HindFoot_L";
        public const string HindLegR = "HindLeg_R";
        public const string HindShinR = "HindShin_R";
        public const string HindFootR = "HindFoot_R";

        public const string WingL = "Wing_L";
        public const string WingMidL = "WingMid_L";
        public const string WingTipL = "WingTip_L";
        public const string WingR = "Wing_R";
        public const string WingMidR = "WingMid_R";
        public const string WingTipR = "WingTip_R";

        public const string Seg0 = "Seg0";
        public const string Seg1 = "Seg1";
        public const string Seg2 = "Seg2";
        public const string Seg3 = "Seg3";
        public const string Seg4 = "Seg4";
        public const string Seg5 = "Seg5";
        public const string Seg6 = "Seg6";
        public const string Seg7 = "Seg7";
        public const string LobeL = "Lobe_L";
        public const string LobeR = "Lobe_R";
        public const string LobeTop = "Lobe_Top";

        public const string SwarmCore = "SwarmCore";
        public const string Mote0 = "Mote0";
        public const string Mote1 = "Mote1";
        public const string Mote2 = "Mote2";
        public const string Mote3 = "Mote3";
        public const string Mote4 = "Mote4";
        public const string Mote5 = "Mote5";
        public const string Mote6 = "Mote6";
        public const string Mote7 = "Mote7";

        public static readonly string[] SegmentChain =
        {
            Seg0, Seg1, Seg2, Seg3, Seg4, Seg5, Seg6, Seg7
        };

        public static readonly string[] MoteNames =
        {
            Mote0, Mote1, Mote2, Mote3, Mote4, Mote5, Mote6, Mote7
        };

        public static BoneNode[] ForKind(SkeletonKind kind) => kind switch
        {
            SkeletonKind.Insectoid4 => BuildInsectoid(armPairs: 2),
            SkeletonKind.Insectoid6 => BuildInsectoid(armPairs: 3),
            SkeletonKind.Quadruped => BuildQuadruped(wings: false),
            SkeletonKind.WingedQuad => BuildQuadruped(wings: true),
            SkeletonKind.WingedBiped => BuildBiped(wings: true, armPairs: 1),
            SkeletonKind.Avian => BuildAvian(),
            SkeletonKind.Slug => BuildSoftChain(segments: 5, height: 0.22f, spacing: 0.18f, radius: 0.1f, raiseHead: false),
            SkeletonKind.Worm => BuildSoftChain(segments: 8, height: 0.18f, spacing: 0.2f, radius: 0.07f, raiseHead: false),
            SkeletonKind.Snake => BuildSoftChain(segments: 8, height: 0.12f, spacing: 0.22f, radius: 0.055f, raiseHead: true),
            SkeletonKind.Slime => BuildSlime(),
            SkeletonKind.Swarm => BuildSwarm(motes: 8),
            _ => BuildBiped(wings: false, armPairs: 1),
        };

        public static SkeletonKind ForEnemyKey(string key)
        {
            if (string.IsNullOrEmpty(key)) return SkeletonKind.Biped;
            var k = key.ToLowerInvariant();

            if (k.Contains("swarm") || k.Contains("wisp") || k.Contains("lumen") || k.Contains("flicker"))
                return SkeletonKind.Swarm;
            if (k.Contains("bird") || k.Contains("raven") || k.Contains("crow") || k.Contains("hawk")
                || k.Contains("eagle") || k.Contains("bat") || k.Contains("harpy"))
                return SkeletonKind.Avian;
            // Small flyers without limbs → avian; large flighted lizards stay winged-quad.
            if (k.Contains("wyvern") || k.Contains("whelp"))
                return SkeletonKind.WingedQuad;

            if (k.Contains("slime")) return SkeletonKind.Slime;
            if (k.Contains("slug")) return SkeletonKind.Slug;
            if (k.Contains("snake") || k.Contains("serpent")) return SkeletonKind.Snake;
            if (k.Contains("wyrm") && !k.Contains("wyvern")) return SkeletonKind.Worm;
            if (k.Contains("worm") || k.Contains("lurker")) return SkeletonKind.Worm;

            if (k.Contains("dragon") || k.Contains("drake"))
                return SkeletonKind.WingedQuad;
            if (k.Contains("archdemon") || k.Contains("imp") || k.Contains("gargoyle"))
                return SkeletonKind.WingedBiped;
            if (k.Contains("wolf") || k.Contains("rat") || k.Contains("spider"))
                return SkeletonKind.Quadruped;
            if (k.Contains("insect") || k.Contains("sprig") || k.Contains("assassin") || k.Contains("slayer"))
                return SkeletonKind.Insectoid4;
            return SkeletonKind.Biped;
        }

        public static SkeletonKind ForRace(RaceId race) => race switch
        {
            RaceId.Insectoid => SkeletonKind.Insectoid4,
            _ => SkeletonKind.Biped,
        };

        public static bool IsSoftBody(SkeletonKind kind) =>
            kind is SkeletonKind.Slug or SkeletonKind.Worm or SkeletonKind.Snake or SkeletonKind.Slime;

        public static bool IsSwarm(SkeletonKind kind) => kind == SkeletonKind.Swarm;

        public static bool IsQuadrupedFamily(SkeletonKind kind) =>
            kind is SkeletonKind.Quadruped or SkeletonKind.WingedQuad;

        public static bool IsFlyer(SkeletonKind kind) =>
            kind is SkeletonKind.Avian or SkeletonKind.WingedQuad or SkeletonKind.WingedBiped or SkeletonKind.Swarm;

        public static bool HasWings(SkeletonKind kind) =>
            kind is SkeletonKind.WingedQuad or SkeletonKind.WingedBiped or SkeletonKind.Avian;

        // —— Builders ————————————————————————————————

        static BoneNode[] BuildBiped(bool wings, int armPairs)
        {
            var b = new Builder();
            var hips = b.Add(Hips, -1, new Vector3(0f, 0.95f, 0f), 0.12f, 0.08f);
            var spine = b.Add(Spine, hips, new Vector3(0f, 0.14f, 0f), 0.14f, 0.07f);
            var chest = b.Add(Chest, spine, new Vector3(0f, 0.18f, 0f), 0.16f, 0.08f);
            var neck = b.Add(Neck, chest, new Vector3(0f, 0.16f, 0f), 0.08f, 0.04f);
            b.Add(Head, neck, new Vector3(0f, 0.12f, 0f), 0.14f, 0.09f);

            AddArmPair(b, chest, 1, y: 0.12f, xSpread: 0.14f);
            if (armPairs >= 2) AddArmPair(b, chest, 2, y: 0.02f, xSpread: 0.16f);
            if (armPairs >= 3) AddArmPair(b, chest, 3, y: -0.08f, xSpread: 0.15f);
            if (wings) AddWings(b, chest, span: 0.55f);

            var legL = b.Add(LegL, hips, new Vector3(-0.1f, -0.04f, 0f), 0.42f, 0.055f);
            var shinL = b.Add(ShinL, legL, new Vector3(0f, -0.42f, 0f), 0.4f, 0.05f);
            b.Add(FootL, shinL, new Vector3(0f, -0.4f, 0.06f), 0.16f, 0.04f);
            var legR = b.Add(LegR, hips, new Vector3(0.1f, -0.04f, 0f), 0.42f, 0.055f);
            var shinR = b.Add(ShinR, legR, new Vector3(0f, -0.42f, 0f), 0.4f, 0.05f);
            b.Add(FootR, shinR, new Vector3(0f, -0.4f, 0.06f), 0.16f, 0.04f);
            return b.ToArray();
        }

        static BoneNode[] BuildInsectoid(int armPairs) => BuildBiped(wings: false, armPairs: armPairs);

        /// <summary>Bird body: compact torso, wings as primary limbs, digitigrade legs, tail fan.</summary>
        static BoneNode[] BuildAvian()
        {
            var b = new Builder();
            var hips = b.Add(Hips, -1, new Vector3(0f, 0.7f, 0f), 0.1f, 0.06f);
            var spine = b.Add(Spine, hips, new Vector3(0f, 0.1f, 0.06f), 0.12f, 0.055f);
            var chest = b.Add(Chest, spine, new Vector3(0f, 0.1f, 0.08f), 0.14f, 0.07f);
            var neck = b.Add(Neck, chest, new Vector3(0f, 0.08f, 0.1f), 0.12f, 0.035f);
            var head = b.Add(Head, neck, new Vector3(0f, 0.06f, 0.1f), 0.1f, 0.06f);
            b.Add(Beak, head, new Vector3(0f, -0.02f, 0.1f), 0.08f, 0.025f);

            AddWings(b, chest, span: 0.65f);

            var tail = b.Add(Tail, hips, new Vector3(0f, 0.02f, -0.1f), 0.16f, 0.03f);
            b.Add(TailTip, tail, new Vector3(0f, -0.02f, -0.14f), 0.12f, 0.025f);

            // Tucked perch legs.
            var legL = b.Add(LegL, hips, new Vector3(-0.06f, -0.04f, 0.02f), 0.22f, 0.035f);
            var shinL = b.Add(ShinL, legL, new Vector3(0f, -0.22f, 0.02f), 0.2f, 0.03f);
            b.Add(FootL, shinL, new Vector3(0f, -0.2f, 0.06f), 0.1f, 0.025f);
            var legR = b.Add(LegR, hips, new Vector3(0.06f, -0.04f, 0.02f), 0.22f, 0.035f);
            var shinR = b.Add(ShinR, legR, new Vector3(0f, -0.22f, 0.02f), 0.2f, 0.03f);
            b.Add(FootR, shinR, new Vector3(0f, -0.2f, 0.06f), 0.1f, 0.025f);

            // Strike tip for dive attacks (reuses Hand_R slot for WeaponMomentum later).
            b.Add(HandR, head, new Vector3(0f, 0f, 0.16f), 0.06f, 0.03f);
            return b.ToArray();
        }

        static BoneNode[] BuildQuadruped(bool wings)
        {
            var b = new Builder();
            var hips = b.Add(Hips, -1, new Vector3(0f, 0.55f, 0f), 0.14f, 0.09f);
            var spine = b.Add(Spine, hips, new Vector3(0f, 0.06f, 0.18f), 0.2f, 0.08f);
            var chest = b.Add(Chest, spine, new Vector3(0f, 0.04f, 0.22f), 0.18f, 0.09f);
            var neck = b.Add(Neck, chest, new Vector3(0f, 0.08f, 0.16f), 0.14f, 0.05f);
            b.Add(Head, neck, new Vector3(0f, 0.06f, 0.14f), 0.16f, 0.08f);

            var tail = b.Add(Tail, hips, new Vector3(0f, 0.04f, -0.16f), 0.28f, 0.04f);
            b.Add(TailTip, tail, new Vector3(0f, -0.02f, -0.28f), 0.22f, 0.03f);

            if (wings) AddWings(b, chest, span: 0.7f);

            var flL = b.Add(FrontLegL, chest, new Vector3(-0.12f, -0.06f, 0.04f), 0.28f, 0.05f);
            var fsL = b.Add(FrontShinL, flL, new Vector3(0f, -0.28f, 0f), 0.26f, 0.045f);
            b.Add(FrontFootL, fsL, new Vector3(0f, -0.26f, 0.05f), 0.12f, 0.035f);
            var flR = b.Add(FrontLegR, chest, new Vector3(0.12f, -0.06f, 0.04f), 0.28f, 0.05f);
            var fsR = b.Add(FrontShinR, flR, new Vector3(0f, -0.28f, 0f), 0.26f, 0.045f);
            b.Add(FrontFootR, fsR, new Vector3(0f, -0.26f, 0.05f), 0.12f, 0.035f);

            var hlL = b.Add(HindLegL, hips, new Vector3(-0.12f, -0.04f, -0.02f), 0.3f, 0.055f);
            var hsL = b.Add(HindShinL, hlL, new Vector3(0f, -0.3f, 0f), 0.28f, 0.05f);
            b.Add(HindFootL, hsL, new Vector3(0f, -0.28f, 0.05f), 0.12f, 0.035f);
            var hlR = b.Add(HindLegR, hips, new Vector3(0.12f, -0.04f, -0.02f), 0.3f, 0.055f);
            var hsR = b.Add(HindShinR, hlR, new Vector3(0f, -0.3f, 0f), 0.28f, 0.05f);
            b.Add(HindFootR, hsR, new Vector3(0f, -0.28f, 0.05f), 0.12f, 0.035f);

            return b.ToArray();
        }

        static BoneNode[] BuildSoftChain(int segments, float height, float spacing, float radius, bool raiseHead)
        {
            segments = Mathf.Clamp(segments, 3, SegmentChain.Length);
            var b = new Builder();
            var root = b.Add(Hips, -1, new Vector3(0f, height, 0f), spacing * 0.6f, radius * 1.1f);
            var prev = root;
            for (var i = 0; i < segments; i++)
            {
                var z = i == 0 ? spacing * 0.5f : spacing;
                var y = 0f;
                if (raiseHead && i >= segments - 2)
                    y = (i - (segments - 3)) * 0.12f;
                var r = radius * (1f - i * 0.04f);
                prev = b.Add(SegmentChain[i], prev, new Vector3(0f, y, z), spacing * 0.85f, Mathf.Max(0.03f, r));
            }
            b.Add(Head, prev, new Vector3(0f, raiseHead ? 0.08f : 0.02f, spacing * 0.35f), radius * 1.2f, radius * 0.9f);
            b.Add(Chest, root, new Vector3(0f, 0.02f, spacing * 0.2f), spacing * 0.4f, radius * 0.5f);
            return b.ToArray();
        }

        static BoneNode[] BuildSlime()
        {
            var b = new Builder();
            var core = b.Add(Hips, -1, new Vector3(0f, 0.35f, 0f), 0.28f, 0.16f);
            b.Add(Chest, core, new Vector3(0f, 0.12f, 0f), 0.18f, 0.12f);
            b.Add(Head, core, new Vector3(0f, 0.22f, 0.06f), 0.14f, 0.1f);
            b.Add(LobeL, core, new Vector3(-0.18f, 0.04f, 0.02f), 0.16f, 0.1f);
            b.Add(LobeR, core, new Vector3(0.18f, 0.04f, 0.02f), 0.16f, 0.1f);
            b.Add(LobeTop, core, new Vector3(0f, 0.28f, -0.04f), 0.14f, 0.09f);
            b.Add(Seg0, core, new Vector3(0f, -0.12f, 0.1f), 0.12f, 0.08f);
            b.Add(Seg1, core, new Vector3(0f, -0.1f, -0.12f), 0.12f, 0.08f);
            return b.ToArray();
        }

        static BoneNode[] BuildSwarm(int motes)
        {
            motes = Mathf.Clamp(motes, 4, MoteNames.Length);
            var b = new Builder();
            var core = b.Add(SwarmCore, -1, new Vector3(0f, 1.1f, 0f), 0.16f, 0.08f);
            b.Add(Hips, core, Vector3.zero, 0.08f, 0.04f);
            b.Add(Chest, core, new Vector3(0f, 0.02f, 0f), 0.08f, 0.04f);
            b.Add(Head, core, new Vector3(0f, 0.06f, 0.04f), 0.1f, 0.05f);
            b.Add(HandR, core, new Vector3(0f, 0f, 0.2f), 0.08f, 0.04f);

            for (var i = 0; i < motes; i++)
            {
                var ang = i * Mathf.PI * 2f / motes;
                var r = 0.35f + (i % 2) * 0.12f;
                var pos = new Vector3(Mathf.Cos(ang) * r, Mathf.Sin(ang * 1.7f) * 0.22f, Mathf.Sin(ang) * r);
                b.Add(MoteNames[i], core, pos, 0.1f, 0.045f);
            }
            return b.ToArray();
        }

        static void AddArmPair(Builder b, int chest, int pair, float y, float xSpread)
        {
            string armL, foreL, handL, armR, foreR, handR;
            if (pair == 1)
            {
                armL = ArmL; foreL = ForearmL; handL = HandL;
                armR = ArmR; foreR = ForearmR; handR = HandR;
            }
            else if (pair == 2)
            {
                armL = Arm2L; foreL = Forearm2L; handL = Hand2L;
                armR = Arm2R; foreR = Forearm2R; handR = Hand2R;
            }
            else
            {
                armL = Arm3L; foreL = Forearm3L; handL = Hand3L;
                armR = Arm3R; foreR = Forearm3R; handR = Hand3R;
            }

            var len = pair == 1 ? 0.28f : 0.24f;
            var aL = b.Add(armL, chest, new Vector3(-xSpread, y, pair > 1 ? -0.04f : 0f), len, 0.042f);
            var fL = b.Add(foreL, aL, new Vector3(-len, 0f, 0f), len * 0.85f, 0.038f);
            b.Add(handL, fL, new Vector3(-len * 0.85f, 0f, 0f), 0.1f, 0.032f);

            var aR = b.Add(armR, chest, new Vector3(xSpread, y, pair > 1 ? -0.04f : 0f), len, 0.042f);
            var fR = b.Add(foreR, aR, new Vector3(len, 0f, 0f), len * 0.85f, 0.038f);
            b.Add(handR, fR, new Vector3(len * 0.85f, 0f, 0f), 0.1f, 0.032f);
        }

        static void AddWings(Builder b, int chest, float span)
        {
            var wL = b.Add(WingL, chest, new Vector3(-0.08f, 0.1f, -0.04f), span * 0.45f, 0.03f);
            var mL = b.Add(WingMidL, wL, new Vector3(-span * 0.45f, 0.08f, -0.06f), span * 0.4f, 0.025f);
            b.Add(WingTipL, mL, new Vector3(-span * 0.4f, -0.04f, -0.08f), span * 0.35f, 0.02f);

            var wR = b.Add(WingR, chest, new Vector3(0.08f, 0.1f, -0.04f), span * 0.45f, 0.03f);
            var mR = b.Add(WingMidR, wR, new Vector3(span * 0.45f, 0.08f, -0.06f), span * 0.4f, 0.025f);
            b.Add(WingTipR, mR, new Vector3(span * 0.4f, -0.04f, -0.08f), span * 0.35f, 0.02f);
        }

        sealed class Builder
        {
            readonly List<BoneNode> _nodes = new();

            public int Add(string name, int parent, Vector3 pos, float length, float radius)
            {
                _nodes.Add(new BoneNode(name, parent, pos, length, radius));
                return _nodes.Count - 1;
            }

            public BoneNode[] ToArray() => _nodes.ToArray();
        }
    }
}
