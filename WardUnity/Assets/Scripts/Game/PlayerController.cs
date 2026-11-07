using UnityEngine;
using Ward.Game.Anim;

namespace Ward.Game
{
    public class PlayerController : MonoBehaviour
    {
        public CharacterData Character { get; private set; }
        public float Hp { get; private set; }
        public bool IsDead => Hp <= 0f;

        [SerializeField] float gravity = -20f;

        Vector3 _vel;
        float _attackCd;
        readonly float[] _skillCd = new float[3];
        CharacterController _cc;
        RunSession _session;
        ActorRig _rig;
        float _moveWeight;

        public ActorRig Rig => _rig;

        public void Bind(CharacterData data, RunSession session)
        {
            Character = data;
            _session = session;
            Hp = data.MaxLife;
            for (var i = transform.childCount - 1; i >= 0; i--)
            {
                var child = transform.GetChild(i);
                if (child.name == "Actor" || child.name == "ActorRig")
                    Destroy(child.gameObject);
            }

            var tint = RaceTint(data.race);
            var kind = SkeletonDef.ForRace(data.race);
            _rig = ActorRig.Create(transform, "ActorRig", tint, scale: RaceScale(data.race), withWeapon: true, kind: kind);
            _rig.Weapon?.Configure(session, data.AttackDamage, GetInstanceID());

            _cc = GetComponent<CharacterController>();
            if (_cc == null) _cc = gameObject.AddComponent<CharacterController>();
            _cc.height = 1.8f;
            _cc.radius = 0.35f;
            _cc.center = new Vector3(0f, 0.9f, 0f);
        }

        public void SetMove(Vector2 stick)
        {
            if (IsDead) return;
            var dir = new Vector3(stick.x, 0f, stick.y);
            if (dir.sqrMagnitude > 1f) dir.Normalize();
            var attacking = _rig != null && _rig.IsAttackLocked;
            var speed = Character != null ? Character.MoveSpeed : 5f;
            // Josh rule: committed swing — no turn cancel; slight forward drift only.
            if (attacking)
            {
                _vel.x = transform.forward.x * speed * 0.15f;
                _vel.z = transform.forward.z * speed * 0.15f;
                _moveWeight = 0f;
            }
            else
            {
                var wish = dir * speed;
                _vel.x = wish.x;
                _vel.z = wish.z;
                _moveWeight = dir.sqrMagnitude > 0.05f ? Mathf.Clamp01(dir.magnitude) : 0f;
                if (dir.sqrMagnitude > 0.05f)
                    transform.rotation = Quaternion.LookRotation(dir);
            }
            _rig?.Animator?.SetMoveWeight(_moveWeight);
        }

        public void TryAttack()
        {
            if (IsDead || Character == null || _attackCd > 0f) return;
            if (_rig?.Weapon == null)
            {
                _session?.PlayerAttack(transform.position, transform.forward, Character.AttackRange, Character.AttackDamage);
                _attackCd = Character.AttackCooldown;
                return;
            }
            if (!_rig.Weapon.TrySwing(Character.AttackDamage)) return;
            _attackCd = Character.AttackCooldown;
        }

        public void TryCastSkill(int slot)
        {
            if (IsDead || Character == null || slot < 0 || slot > 2) return;
            if (_skillCd[slot] > 0f) return;
            var slots = Character.skillSlots;
            if (slots == null || slot >= slots.Length) return;
            var def = SkillCatalog.ById(slots[slot]);
            if (def == null || def.kind != SkillKind.Active) return;
            if (_rig != null && _rig.IsAttackLocked) return;
            _skillCd[slot] = def.cooldown;
            var range = Character.AttackRange * (def.id == "shadowstep" ? 2.2f : 1.4f);
            var dmg = Character.AttackDamage * def.damageMul;
            if (def.id == "shadowstep")
                transform.position += transform.forward * 2.5f;
            // Skills still use a short arc burst until skill-specific swings exist.
            _session?.PlayerAttack(transform.position, transform.forward, range, dmg);
        }

        public void TakeDamage(float amount)
        {
            if (IsDead) return;
            Hp = Mathf.Max(0f, Hp - amount);
            _rig?.Animator?.PlayHitReact();
            if (IsDead) _session?.OnPlayerDied();
        }

        public void HealFull() => Hp = Character != null ? Character.MaxLife : 50f;

        public void SetHp(float value)
        {
            var max = Character != null ? Character.MaxLife : 50f;
            Hp = Mathf.Clamp(value, 0f, max);
        }

        void Update()
        {
            if (_cc == null) return;
            _attackCd = Mathf.Max(0f, _attackCd - Time.deltaTime);
            for (var i = 0; i < _skillCd.Length; i++)
                _skillCd[i] = Mathf.Max(0f, _skillCd[i] - Time.deltaTime);
            if (!_cc.isGrounded) _vel.y += gravity * Time.deltaTime;
            else if (_vel.y < 0f) _vel.y = -1f;
            _cc.Move(_vel * Time.deltaTime);
            var p = transform.position;
            p.x = Mathf.Clamp(p.x, -WorldData.ArenaHalfX, WorldData.ArenaHalfX);
            p.z = Mathf.Clamp(p.z, -WorldData.ArenaHalfZ, WorldData.ArenaHalfZ);
            transform.position = p;
        }

        static Color RaceTint(RaceId race) => race switch
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

        static float RaceScale(RaceId race) => race switch
        {
            RaceId.Minotaur => 1.15f,
            RaceId.Golem => 1.1f,
            RaceId.Dwarf => 0.78f,
            RaceId.Gnome => 0.68f,
            RaceId.Hobbit => 0.72f,
            RaceId.Elf => 1.05f,
            _ => 1f
        };
    }
}
