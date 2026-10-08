using UnityEngine;

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

            public void Bind(CharacterData data, RunSession session)
        {
            Character = data;
            _session = session;
            Hp = data.MaxLife;
            for (var i = transform.childCount - 1; i >= 0; i--)
            {
                var child = transform.GetChild(i);
                if (child.name == "Actor") Destroy(child.gameObject);
            }
            var actor = AuthoredMeshFactory.BuildRaceProxy(data.race, data.gender, transform);
            actor.name = "Actor";
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
            var speed = Character != null ? Character.MoveSpeed : 5f;
            var wish = dir * speed;
            _vel.x = wish.x;
            _vel.z = wish.z;
            if (dir.sqrMagnitude > 0.05f)
                transform.rotation = Quaternion.LookRotation(dir);
        }

        public void TryAttack()
        {
            if (IsDead || Character == null || _attackCd > 0f) return;
            _attackCd = Character.AttackCooldown;
            _session?.PlayerAttack(transform.position, transform.forward, Character.AttackRange, Character.AttackDamage);
        }

        public void TryCastSkill(int slot)
        {
            if (IsDead || Character == null || slot < 0 || slot > 2) return;
            if (_skillCd[slot] > 0f) return;
            var slots = Character.skillSlots;
            if (slots == null || slot >= slots.Length) return;
            var def = SkillCatalog.ById(slots[slot]);
            if (def == null || def.kind != SkillKind.Active) return;
            _skillCd[slot] = def.cooldown;
            var range = Character.AttackRange * (def.id == "shadowstep" ? 2.2f : 1.4f);
            var dmg = Character.AttackDamage * def.damageMul;
            if (def.id == "shadowstep")
                transform.position += transform.forward * 2.5f;
            _session?.PlayerAttack(transform.position, transform.forward, range, dmg);
        }

        public void TakeDamage(float amount)
        {
            if (IsDead) return;
            Hp = Mathf.Max(0f, Hp - amount);
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
            // Keep on road-ish corridor.
            var p = transform.position;
            p.x = Mathf.Clamp(p.x, -WorldData.ArenaHalfX, WorldData.ArenaHalfX);
            p.z = Mathf.Clamp(p.z, -WorldData.ArenaHalfZ, WorldData.ArenaHalfZ);
            transform.position = p;
        }
    }
}
