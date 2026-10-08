using UnityEngine;

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

        public void Init(string pack, float life, float dmg, bool isElite, Transform target)
        {
            packId = pack;
            maxHp = life;
            hp = life;
            damage = dmg;
            elite = isElite;
            _target = target;
            if (!isElite) return;
            foreach (var rend in GetComponentsInChildren<Renderer>())
                rend.material.color = new Color(1f, 0.78f, 0.7f);
        }

        public bool IsDead => hp <= 0f;

        public void TakeDamage(float amount)
        {
            hp -= amount;
            if (hp <= 0f)
            {
                hp = 0f;
                gameObject.SetActive(false);
            }
        }

        void Update()
        {
            if (IsDead || _target == null) return;
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
