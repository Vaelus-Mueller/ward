using System.Collections.Generic;
using UnityEngine;

namespace Ward.Game.Anim
{
    /// <summary>
    /// Blade tip under Hand_R. During attack active frames, sweeps a probe and
    /// deals damage scaled by tip speed (momentum).
    /// </summary>
    [DefaultExecutionOrder(20)]
    public class WeaponMomentum : MonoBehaviour
    {
        const float BladeLength = 0.85f;
        const float ProbeRadius = 0.28f;
        const float ActiveStart = 0.32f;
        const float ActiveEnd = 0.72f;
        const float MinTipSpeed = 1.2f;
        const float RefTipSpeed = 9f;

        ActorRig _rig;
        ProceduralAnimator _anim;
        RunSession _session;
        Transform _hand;
        Transform _blade;
        Transform _tip;
        Vector3 _prevTip;
        bool _hasPrev;
        readonly HashSet<EnemyAgent> _hitThisSwing = new();
        float _baseDamage = 8f;

        public void Bind(ActorRig rig)
        {
            _rig = rig;
            _anim = rig.Animator;
            _hand = rig.GetBone(SkeletonDef.HandR);
            if (_hand == null) return;

            _blade = new GameObject("Blade").transform;
            _blade.SetParent(_hand, false);
            _blade.localPosition = new Vector3(0.12f, 0f, 0f);
            _blade.localRotation = Quaternion.Euler(0f, 0f, -90f);

            // Debug sword: elongated cube along blade.
            var mesh = GameObject.CreatePrimitive(PrimitiveType.Cube);
            mesh.name = "Dbg_Blade";
            mesh.transform.SetParent(_blade, false);
            mesh.transform.localScale = new Vector3(0.06f, BladeLength, 0.02f);
            mesh.transform.localPosition = new Vector3(0f, BladeLength * 0.5f, 0f);
            Object.Destroy(mesh.GetComponent<Collider>());
            mesh.GetComponent<Renderer>().sharedMaterial = WardModels.Unlit(new Color(0.75f, 0.78f, 0.85f));

            _tip = new GameObject("Tip").transform;
            _tip.SetParent(_blade, false);
            _tip.localPosition = new Vector3(0f, BladeLength, 0f);
        }

        public void Configure(RunSession session, float baseDamage)
        {
            _session = session;
            _baseDamage = baseDamage;
        }

        public bool TrySwing(float baseDamage)
        {
            if (_anim == null || !_anim.TryBeginAttack()) return false;
            _baseDamage = baseDamage;
            _hitThisSwing.Clear();
            _hasPrev = false;
            return true;
        }

        void LateUpdate()
        {
            if (_tip == null || _anim == null) return;
            var tip = _tip.position;
            if (!_anim.IsAttacking)
            {
                _prevTip = tip;
                _hasPrev = true;
                return;
            }

            var t = _anim.AttackNormalized;
            var active = t >= ActiveStart && t <= ActiveEnd;
            if (active && _hasPrev && _session != null)
            {
                var delta = tip - _prevTip;
                var tipSpeed = delta.magnitude / Mathf.Max(Time.deltaTime, 1e-4f);
                if (tipSpeed >= MinTipSpeed)
                {
                    var momentum = Mathf.Clamp01(tipSpeed / RefTipSpeed);
                    var damage = _baseDamage * (0.55f + momentum * 1.15f);
                    Sweep(tip, _prevTip, damage);
                }
            }

            _prevTip = tip;
            _hasPrev = true;
        }

        void Sweep(Vector3 a, Vector3 b, float damage)
        {
            var mid = (a + b) * 0.5f;
            var radius = Mathf.Max(ProbeRadius, Vector3.Distance(a, b) * 0.55f);
            var hits = Physics.OverlapSphere(mid, radius, ~0, QueryTriggerInteraction.Collide);
            foreach (var col in hits)
            {
                if (col == null) continue;
                var agent = col.GetComponentInParent<EnemyAgent>();
                if (agent == null || agent.IsDead) continue;
                if (!_hitThisSwing.Add(agent)) continue;
                // Facing gate: tip should be roughly in front of the attacker.
                var to = agent.transform.position - transform.position;
                to.y = 0f;
                if (to.sqrMagnitude > 0.01f && Vector3.Dot(transform.forward, to.normalized) < -0.15f)
                    continue;
                _session.ApplyPlayerHit(agent, damage);
            }

            // Also check enemies without colliders (gallery bone puppets).
            _session.ApplySwingHits(mid, radius, damage, transform.position, transform.forward, _hitThisSwing);
        }
    }
}
