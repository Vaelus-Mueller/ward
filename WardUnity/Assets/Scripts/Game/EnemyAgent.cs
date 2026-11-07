using UnityEngine;
using Ward.Game.Anim;

namespace Ward.Game
{
    public class EnemyAgent : MonoBehaviour
    {
        public string packId;
        public float maxHp = 40f;
        public float hp = 40f;
        public float damage = 6f;
        public float moveSpeed = 3.2f;
        public float attackRange = 1.4f;
        public float attackCooldown = 1.1f;
        public bool elite;

        float _cd;
        Transform _target;
        ActorRig _rig;
        CapsuleCollider _hurtbox;

        public ActorRig Rig => _rig;

        public void Init(string pack, float life, float dmg, bool isElite, Transform target, ActorRig rig = null)
        {
            packId = pack;
            maxHp = life;
            hp = life;
            damage = dmg;
            elite = isElite;
            _target = target;
            _rig = rig != null ? rig : GetComponentInChildren<ActorRig>();
            EnsureHurtbox();
            if (isElite)
                _rig?.SetTint(new Color(1f, 0.78f, 0.7f));
            _rig?.Animator?.SetMoveWeight(0f);
        }

        void EnsureHurtbox()
        {
            _hurtbox = GetComponent<CapsuleCollider>();
            if (_hurtbox == null) _hurtbox = gameObject.AddComponent<CapsuleCollider>();
            _hurtbox.height = 1.7f;
            _hurtbox.radius = 0.4f;
            _hurtbox.center = new Vector3(0f, 0.85f, 0f);
            _hurtbox.isTrigger = true;
        }

        public bool IsDead => hp <= 0f;

        public void TakeDamage(float amount)
        {
            if (IsDead) return;
            hp -= amount;
            _rig?.Animator?.PlayHitReact();
            if (hp <= 0f)
            {
                hp = 0f;
                gameObject.SetActive(false);
            }
        }

        /// <summary>Monsters hold still and do not attack. Turn on when combat should run.</summary>
        public const bool AiEnabled = false;

        void Update()
        {
            if (_rig != null && !IsDead)
                _rig.Animator?.SetMoveWeight(AiEnabled && _target != null ? 0.6f : 0f);

            if (!AiEnabled || IsDead || _target == null) return;
            _cd = Mathf.Max(0f, _cd - Time.deltaTime);
            var to = _target.position - transform.position;
            to.y = 0f;
            var dist = to.magnitude;
            if (dist > attackRange)
            {
                transform.position += to.normalized * (moveSpeed * Time.deltaTime);
                if (to.sqrMagnitude > 0.01f)
                    transform.rotation = Quaternion.LookRotation(to.normalized);
            }
            else if (_cd <= 0f)
            {
                _cd = attackCooldown;
                var player = _target.GetComponent<PlayerController>();
                player?.TakeDamage(damage);
            }
        }
    }
}
