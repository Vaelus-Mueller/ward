using UnityEngine;

namespace Ward.Game.Anim
{
    /// <summary>
    /// Procedural Idle / Walk / Attack per skeleton family.
    /// Attack is committed (Josh rule): locomotion does not cancel mid-swing.
    /// </summary>
    [DefaultExecutionOrder(10)]
    public class ProceduralAnimator : MonoBehaviour
    {
        public const float AttackDuration = 0.62f;
        public const float AttackImpact = 0.42f;

        ActorRig _rig;
        float _moveWeight;
        float _phase;
        float _attackT = -1f;
        float _hitReactT = -1f;

        public bool IsAttacking => _attackT >= 0f && _attackT < AttackDuration;
        public float AttackNormalized => IsAttacking ? _attackT / AttackDuration : 0f;

        public void Bind(ActorRig rig) => _rig = rig;

        public void SetMoveWeight(float weight01) => _moveWeight = Mathf.Clamp01(weight01);

        public bool TryBeginAttack()
        {
            if (IsAttacking) return false;
            _attackT = 0f;
            _rig?.SetAttackLocked(true);
            return true;
        }

        public void PlayHitReact() => _hitReactT = 0f;

        void LateUpdate()
        {
            if (_rig == null) return;
            var dt = Time.deltaTime;
            if (_attackT >= 0f)
            {
                _attackT += dt;
                if (_attackT >= AttackDuration)
                {
                    _attackT = -1f;
                    _rig.SetAttackLocked(false);
                }
            }
            if (_hitReactT >= 0f)
            {
                _hitReactT += dt;
                if (_hitReactT >= 0.28f) _hitReactT = -1f;
            }

            var walkSpeed = Mathf.Lerp(0.55f, 0.95f, _moveWeight);
            if (!IsAttacking && _moveWeight > 0.05f)
                _phase += dt * walkSpeed;
            else if (!IsAttacking)
                _phase += dt * 0.2f;

            ApplyPose();
        }

        void ApplyPose()
        {
            var kind = _rig.Kind;
            var breath = Mathf.Sin(Time.time * Mathf.PI * 2f / 1.6f);
            var swing = Mathf.Sin(_phase * Mathf.PI * 2f);
            var walk = _moveWeight;
            var t = IsAttacking ? AttackNormalized : -1f;

            if (SkeletonDef.IsSwarm(kind))
                PoseSwarm(breath, swing, walk, t);
            else if (SkeletonDef.IsSoftBody(kind))
                PoseSoft(kind, breath, swing, walk, t);
            else if (SkeletonDef.IsQuadrupedFamily(kind))
                PoseQuad(kind, breath, swing, walk, t);
            else if (kind == SkeletonKind.Avian)
                PoseAvian(breath, swing, walk, t);
            else
                PoseBiped(kind, breath, swing, walk, t);

            if (_hitReactT >= 0f)
            {
                var flinch = Mathf.Sin(Mathf.Clamp01(_hitReactT / 0.28f) * Mathf.PI) * 0.45f;
                AddEuler(SkeletonDef.Spine, -flinch * 0.25f, 0f, 0f);
                AddEuler(SkeletonDef.Chest, -flinch * 0.2f, 0f, 0f);
                AddEuler(SkeletonDef.Head, -flinch * 0.15f, 0f, 0f);
            }
        }

        void PoseBiped(SkeletonKind kind, float breath, float swing, float walk, float attackT)
        {
            SetEuler(SkeletonDef.Spine, breath * 0.04f + walk * 0.06f, 0f, 0f);
            SetEuler(SkeletonDef.Chest, breath * 0.03f, 0f, 0f);
            SetEuler(SkeletonDef.Head, breath * 0.02f, 0f, 0f);
            SetEuler(SkeletonDef.Hips, 0f, 0f, swing * 0.04f * walk);
            SetEuler(SkeletonDef.Neck, 0f, 0f, 0f);

            PoseArm(SkeletonDef.ArmL, SkeletonDef.ForearmL, SkeletonDef.HandL, swing, walk, breath, left: true, lag: 1f);
            PoseArm(SkeletonDef.ArmR, SkeletonDef.ForearmR, SkeletonDef.HandR, swing, walk, breath, left: false, lag: 1f);
            if (kind is SkeletonKind.Insectoid4 or SkeletonKind.Insectoid6)
            {
                PoseArm(SkeletonDef.Arm2L, SkeletonDef.Forearm2L, SkeletonDef.Hand2L, -swing, walk, breath, left: true, lag: 0.75f);
                PoseArm(SkeletonDef.Arm2R, SkeletonDef.Forearm2R, SkeletonDef.Hand2R, -swing, walk, breath, left: false, lag: 0.75f);
            }
            if (kind == SkeletonKind.Insectoid6)
            {
                PoseArm(SkeletonDef.Arm3L, SkeletonDef.Forearm3L, SkeletonDef.Hand3L, swing * 0.6f, walk, breath, left: true, lag: 0.55f);
                PoseArm(SkeletonDef.Arm3R, SkeletonDef.Forearm3R, SkeletonDef.Hand3R, swing * 0.6f, walk, breath, left: false, lag: 0.55f);
            }

            SetEuler(SkeletonDef.LegL, -swing * 0.7f * walk, 0f, 0.04f);
            SetEuler(SkeletonDef.LegR, swing * 0.7f * walk, 0f, -0.04f);
            SetEuler(SkeletonDef.ShinL, Mathf.Max(0f, -swing) * 0.55f * walk, 0f, 0f);
            SetEuler(SkeletonDef.ShinR, Mathf.Max(0f, swing) * 0.55f * walk, 0f, 0f);

            if (SkeletonDef.HasWings(kind))
                PoseWings(breath, swing, walk, flapAmp: 0.55f);

            if (attackT >= 0f)
                OverlayBipedAttack(attackT, kind);
        }

        void PoseArm(string arm, string fore, string hand, float swing, float walk, float breath, bool left, float lag)
        {
            var side = left ? 1f : -1f;
            SetEuler(arm, swing * 0.55f * walk * lag + breath * 0.08f * (1f - walk), 0f, side * 0.1f);
            SetEuler(fore, swing * 0.25f * walk * lag, 0f, side * 0.05f);
            SetEuler(hand, 0f, 0f, 0f);
        }

        void OverlayBipedAttack(float t, SkeletonKind kind)
        {
            var wind = AttackWind(t);
            SetEuler(SkeletonDef.Spine, wind * 0.18f, -wind * 0.22f, 0f);
            SetEuler(SkeletonDef.Chest, wind * 0.12f, wind * 0.28f, 0f);
            SetEuler(SkeletonDef.LegL, -wind * 0.12f, 0f, 0.04f);
            SetEuler(SkeletonDef.LegR, wind * 0.18f, 0f, -0.04f);
            SetEuler(SkeletonDef.ArmR, -wind * 1.35f, wind * 0.72f, -(0.2f + wind * 0.55f));
            SetEuler(SkeletonDef.ForearmR, -wind * 1.1f, wind * 0.7f, -(0.2f + wind * 0.75f));
            SetEuler(SkeletonDef.HandR, -wind * 0.4f, wind * 0.3f, -wind * 0.25f);
            SetEuler(SkeletonDef.ArmL, -wind * 0.75f, -wind * 0.4f, 0.2f + wind * 0.3f);
            if (kind is SkeletonKind.Insectoid4 or SkeletonKind.Insectoid6)
            {
                SetEuler(SkeletonDef.Arm2R, -wind * 1.2f, wind * 0.5f, -wind * 0.4f);
                SetEuler(SkeletonDef.Arm2L, -wind * 0.9f, -wind * 0.35f, wind * 0.35f);
            }
            if (SkeletonDef.HasWings(kind))
            {
                SetEuler(SkeletonDef.WingL, wind * 0.4f, 0f, wind * 0.6f);
                SetEuler(SkeletonDef.WingR, wind * 0.4f, 0f, -wind * 0.6f);
            }
        }

        void PoseQuad(SkeletonKind kind, float breath, float swing, float walk, float attackT)
        {
            SetEuler(SkeletonDef.Spine, breath * 0.03f + walk * 0.05f, 0f, swing * 0.05f * walk);
            SetEuler(SkeletonDef.Chest, breath * 0.02f, 0f, 0f);
            SetEuler(SkeletonDef.Head, breath * 0.03f, 0f, 0f);
            SetEuler(SkeletonDef.Tail, 0f, swing * 0.25f * (0.3f + walk), 0f);
            SetEuler(SkeletonDef.TailTip, 0f, swing * 0.35f * (0.3f + walk), 0f);

            SetEuler(SkeletonDef.FrontLegL, -swing * 0.7f * walk, 0f, 0.05f);
            SetEuler(SkeletonDef.FrontLegR, swing * 0.7f * walk, 0f, -0.05f);
            SetEuler(SkeletonDef.FrontShinL, Mathf.Max(0f, -swing) * 0.45f * walk, 0f, 0f);
            SetEuler(SkeletonDef.FrontShinR, Mathf.Max(0f, swing) * 0.45f * walk, 0f, 0f);
            SetEuler(SkeletonDef.HindLegL, swing * 0.7f * walk, 0f, 0.05f);
            SetEuler(SkeletonDef.HindLegR, -swing * 0.7f * walk, 0f, -0.05f);
            SetEuler(SkeletonDef.HindShinL, Mathf.Max(0f, swing) * 0.5f * walk, 0f, 0f);
            SetEuler(SkeletonDef.HindShinR, Mathf.Max(0f, -swing) * 0.5f * walk, 0f, 0f);

            if (SkeletonDef.HasWings(kind))
                PoseWings(breath, swing, walk, flapAmp: 0.7f);

            if (attackT >= 0f)
            {
                var wind = AttackWind(attackT);
                SetEuler(SkeletonDef.Spine, wind * 0.2f, -wind * 0.15f, 0f);
                SetEuler(SkeletonDef.Head, wind * 0.35f, 0f, 0f);
                SetEuler(SkeletonDef.FrontLegL, -wind * 0.4f, 0f, 0.1f);
                SetEuler(SkeletonDef.FrontLegR, -wind * 0.4f, 0f, -0.1f);
                if (SkeletonDef.HasWings(kind))
                {
                    SetEuler(SkeletonDef.WingL, -wind * 0.5f, 0f, wind * 0.8f);
                    SetEuler(SkeletonDef.WingR, -wind * 0.5f, 0f, -wind * 0.8f);
                }
            }
        }

        void PoseAvian(float breath, float swing, float walk, float attackT)
        {
            var flap = Mathf.Sin(_phase * Mathf.PI * 2f * (0.8f + walk * 1.4f));
            SetEuler(SkeletonDef.Spine, breath * 0.04f, 0f, 0f);
            SetEuler(SkeletonDef.Chest, breath * 0.03f + walk * 0.05f, 0f, 0f);
            SetEuler(SkeletonDef.Neck, breath * 0.05f, 0f, 0f);
            SetEuler(SkeletonDef.Head, breath * 0.04f, 0f, 0f);
            SetEuler(SkeletonDef.Beak, 0f, 0f, 0f);
            SetEuler(SkeletonDef.Tail, flap * 0.15f, 0f, 0f);
            SetEuler(SkeletonDef.TailTip, flap * 0.2f, 0f, 0f);

            // Primary locomotion = wing beat; legs tuck when "flying" (any move).
            PoseWings(breath, flap, 1f, flapAmp: 0.85f + walk * 0.35f);
            var tuck = Mathf.Lerp(0.15f, 0.85f, walk);
            SetEuler(SkeletonDef.LegL, tuck * 0.9f, 0f, 0.08f);
            SetEuler(SkeletonDef.LegR, tuck * 0.9f, 0f, -0.08f);
            SetEuler(SkeletonDef.ShinL, tuck * 0.6f, 0f, 0f);
            SetEuler(SkeletonDef.ShinR, tuck * 0.6f, 0f, 0f);

            if (attackT >= 0f)
            {
                var wind = AttackWind(attackT);
                // Dive: wings fold back, head spears forward.
                SetEuler(SkeletonDef.Spine, wind * 0.45f, 0f, 0f);
                SetEuler(SkeletonDef.Chest, wind * 0.35f, 0f, 0f);
                SetEuler(SkeletonDef.Head, wind * 0.55f, 0f, 0f);
                SetEuler(SkeletonDef.WingL, -wind * 0.9f, 0f, wind * 0.35f);
                SetEuler(SkeletonDef.WingMidL, -wind * 0.5f, 0f, 0f);
                SetEuler(SkeletonDef.WingR, -wind * 0.9f, 0f, -wind * 0.35f);
                SetEuler(SkeletonDef.WingMidR, -wind * 0.5f, 0f, 0f);
                SetEuler(SkeletonDef.LegL, wind * 0.4f, 0f, 0.1f);
                SetEuler(SkeletonDef.LegR, wind * 0.4f, 0f, -0.1f);
            }
        }

        void PoseSoft(SkeletonKind kind, float breath, float swing, float walk, float attackT)
        {
            if (kind == SkeletonKind.Slime)
            {
                var jiggle = breath * 0.12f + swing * 0.08f * walk;
                SetEuler(SkeletonDef.Hips, jiggle * 0.3f, 0f, swing * 0.1f * walk);
                SetEuler(SkeletonDef.Chest, jiggle, 0f, 0f);
                SetEuler(SkeletonDef.Head, jiggle * 0.8f, 0f, 0f);
                SetEuler(SkeletonDef.LobeL, 0f, 0f, 0.2f + jiggle);
                SetEuler(SkeletonDef.LobeR, 0f, 0f, -0.2f - jiggle);
                SetEuler(SkeletonDef.LobeTop, jiggle * 1.2f, 0f, 0f);
                if (attackT >= 0f)
                {
                    var wind = AttackWind(attackT);
                    SetEuler(SkeletonDef.Hips, wind * 0.5f, 0f, 0f);
                    SetEuler(SkeletonDef.Chest, wind * 0.7f, 0f, 0f);
                    SetEuler(SkeletonDef.LobeL, 0f, wind * 0.4f, 0.4f);
                    SetEuler(SkeletonDef.LobeR, 0f, -wind * 0.4f, -0.4f);
                }
                return;
            }

            // Slug / worm / snake — traveling wave along segments.
            var amp = kind == SkeletonKind.Snake ? 0.35f : kind == SkeletonKind.Worm ? 0.28f : 0.18f;
            amp *= 0.35f + walk * 0.9f;
            SetEuler(SkeletonDef.Hips, breath * 0.02f, swing * amp * 0.3f, 0f);
            for (var i = 0; i < SkeletonDef.SegmentChain.Length; i++)
            {
                var wave = Mathf.Sin(_phase * Mathf.PI * 2f - i * 0.55f);
                SetEuler(SkeletonDef.SegmentChain[i], 0f, wave * amp, 0f);
            }
            SetEuler(SkeletonDef.Head, 0f, swing * amp * 0.4f, 0f);
            if (attackT >= 0f)
            {
                var wind = AttackWind(attackT);
                SetEuler(SkeletonDef.Head, wind * 0.5f, 0f, 0f);
                SetEuler(SkeletonDef.Seg0, wind * 0.35f, 0f, 0f);
                SetEuler(SkeletonDef.Seg1, wind * 0.25f, 0f, 0f);
            }
        }

        void PoseSwarm(float breath, float swing, float walk, float attackT)
        {
            SetEuler(SkeletonDef.SwarmCore, breath * 0.05f, swing * 0.08f, 0f);
            SetEuler(SkeletonDef.Head, breath * 0.04f, 0f, 0f);
            for (var i = 0; i < SkeletonDef.MoteNames.Length; i++)
            {
                var mote = _rig.GetBone(SkeletonDef.MoteNames[i]);
                if (mote == null) continue;
                var bind = _rig.GetBindPosition(SkeletonDef.MoteNames[i]);
                var orbit = _phase * (1.1f + i * 0.07f) + i;
                var pulse = 1f + 0.12f * Mathf.Sin(orbit) + walk * 0.08f;
                var hover = new Vector3(0f, Mathf.Sin(orbit * 1.3f) * 0.06f, 0f);
                if (attackT >= 0f)
                {
                    // Collapse forward into a strike cloud.
                    var wind = AttackWind(attackT);
                    var strike = Vector3.Lerp(bind * pulse, new Vector3(0f, 0.05f, 0.55f + i * 0.04f), wind);
                    mote.localPosition = strike + hover * (1f - wind);
                }
                else
                {
                    mote.localPosition = bind * pulse + hover;
                }
                mote.localRotation = _rig.GetBindLocal(SkeletonDef.MoteNames[i]);
            }
            if (attackT >= 0f)
            {
                var wind = AttackWind(attackT);
                var hand = _rig.GetBone(SkeletonDef.HandR);
                if (hand != null)
                    hand.localPosition = Vector3.Lerp(_rig.GetBindPosition(SkeletonDef.HandR), new Vector3(0f, 0f, 0.65f), wind);
            }
        }

        void PoseWings(float breath, float swing, float walk, float flapAmp)
        {
            var flap = swing * flapAmp * (0.45f + walk * 0.7f) + breath * 0.08f;
            SetEuler(SkeletonDef.WingL, flap * 0.35f, 0f, 0.4f + flap);
            SetEuler(SkeletonDef.WingMidL, flap * 0.55f, 0f, flap * 0.4f);
            SetEuler(SkeletonDef.WingTipL, flap * 0.4f, 0f, flap * 0.25f);
            SetEuler(SkeletonDef.WingR, flap * 0.35f, 0f, -0.4f - flap);
            SetEuler(SkeletonDef.WingMidR, flap * 0.55f, 0f, -flap * 0.4f);
            SetEuler(SkeletonDef.WingTipR, flap * 0.4f, 0f, -flap * 0.25f);
        }

        static float AttackWind(float t)
        {
            if (t < 0.38f) return Mathf.Pow(t / 0.38f, 1.65f);
            if (t < 0.48f) return 1f + (t - 0.38f) * 0.35f;
            return Mathf.Max(0f, 1.12f - Mathf.Pow((t - 0.48f) / 0.52f, 1.25f) * 1.12f);
        }

        void SetEuler(string bone, float x, float y, float z)
        {
            var t = _rig.GetBone(bone);
            if (t == null) return;
            t.localRotation = _rig.GetBindLocal(bone) * Quaternion.Euler(x * Mathf.Rad2Deg, y * Mathf.Rad2Deg, z * Mathf.Rad2Deg);
        }

        void AddEuler(string bone, float x, float y, float z)
        {
            var t = _rig.GetBone(bone);
            if (t == null) return;
            t.localRotation *= Quaternion.Euler(x * Mathf.Rad2Deg, y * Mathf.Rad2Deg, z * Mathf.Rad2Deg);
        }
    }
}
