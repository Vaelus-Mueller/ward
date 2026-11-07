using System.Collections.Generic;
using UnityEngine;
using Ward.Game.Anim;

namespace Ward.Game
{
    public class RunSession : MonoBehaviour
    {
        [SerializeField] PlayerController player;
        [SerializeField] Transform enemyRoot;
        [SerializeField] GameObject enemyPrefab;

        readonly List<PackSpot> _packs = new();
        readonly HashSet<string> _cleared = new();
        readonly HashSet<string> _spawned = new();
        readonly List<EnemyAgent> _enemies = new();

        public string PlaceLabel { get; private set; } = "Level 1 · Threshold";
        public bool Dead { get; private set; }

        public void Begin(CharacterData character, SaveSlot save = null)
        {
            Dead = false;
            _packs.Clear();
            _packs.AddRange(WorldData.BuildPacks());
            _cleared.Clear();
            _spawned.Clear();
            foreach (var e in _enemies)
                if (e) Destroy(e.gameObject);
            _enemies.Clear();

            if (player == null)
            {
                var go = GameObject.Find("Player");
                if (go != null) player = go.GetComponent<PlayerController>();
            }
            if (enemyRoot == null)
            {
                var root = GameObject.Find("Enemies");
                enemyRoot = root != null ? root.transform : new GameObject("Enemies").transform;
            }

            player.Bind(character, this);
            if (save != null)
            {
                player.transform.position = new Vector3(save.x, 0f, save.y);
                player.SetHp(Mathf.Clamp(save.hp, 1f, character.MaxLife));
                if (save.clearedPackIds != null)
                    foreach (var id in save.clearedPackIds) _cleared.Add(id);
                character.gold = save.gold;
            }
            else
            {
                var start = WorldData.RoadStart;
                player.transform.position = new Vector3(start.x, 0f, start.y);
                player.HealFull();
            }
            SpawnEnemyGallery(player.transform);
            RefreshPacks();
            PlaceLabel = WorldData.PlaceAt(new Vector2(player.transform.position.x, player.transform.position.z), _packs);
        }

        /// <summary>One of every enemy key as a bone puppet ring; elite twin outward.</summary>
        public void SpawnEnemyGallery(Transform target)
        {
            if (enemyRoot == null)
            {
                var root = GameObject.Find("Enemies");
                enemyRoot = root != null ? root.transform : new GameObject("Enemies").transform;
            }
            var keys = WardModels.AllEnemyKeys;
            var count = keys.Length;
            if (count == 0) return;
            var center = new Vector3(0f, 0f, 2f);
            var radius = 7.5f;
            var eliteGap = 2.4f;
            for (var i = 0; i < count; i++)
            {
                var key = keys[i];
                var angle = i * Mathf.PI * 2f / count - Mathf.PI * 0.5f;
                var dir = new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle));
                SpawnGalleryMob(key, center + dir * radius, center, false, target);
                SpawnGalleryMob(key, center + dir * (radius + eliteGap), center, true, target);
            }
        }

        void SpawnGalleryMob(string key, Vector3 pos, Vector3 faceToward, bool elite, Transform target)
        {
            var go = SpawnBoneEnemy(key, elite, enemyRoot);
            go.name = elite ? $"GalleryElite_{key}" : $"Gallery_{key}";
            go.transform.position = pos;
            var face = faceToward - pos;
            face.y = 0f;
            if (face.sqrMagnitude > 0.01f) go.transform.rotation = Quaternion.LookRotation(face);
            var agent = go.GetComponent<EnemyAgent>();
            agent.Init("gallery", elite ? 80f : 40f, 0f, elite, target, go.GetComponentInChildren<ActorRig>());
            _enemies.Add(agent);
        }

        /// <summary>Legacy cone burst (skills). Primary melee uses WeaponMomentum.</summary>
        public void PlayerAttack(Vector3 origin, Vector3 facing, float range, float damage)
        {
            foreach (var e in _enemies)
            {
                if (e == null || e.IsDead) continue;
                var to = e.transform.position - origin;
                to.y = 0f;
                if (to.magnitude > range) continue;
                if (Vector3.Dot(facing.normalized, to.normalized) < 0.2f && to.magnitude > 0.8f) continue;
                ApplyPlayerHit(e, damage);
            }
            SweepCleared();
        }

        public void ApplyPlayerHit(EnemyAgent e, float damage)
        {
            if (e == null || e.IsDead || Dead) return;
            e.TakeDamage(damage);
            if (e.IsDead)
            {
                player.Character.gold += e.elite ? 12 : 4;
                player.Character.xp += e.elite ? 18 : 8;
                MaybeLevel();
            }
            SweepCleared();
        }

        /// <summary>
        /// Distance fallback for bone puppets (in case OverlapSphere misses triggers).
        /// </summary>
        public void ApplySwingHits(
            Vector3 mid,
            float radius,
            float damage,
            Vector3 attackerPos,
            Vector3 attackerFwd,
            HashSet<int> alreadyHit)
        {
            foreach (var e in _enemies)
            {
                if (e == null || e.IsDead) continue;
                var id = e.GetInstanceID();
                if (alreadyHit.Contains(id)) continue;
                var toEnemy = e.transform.position - mid;
                toEnemy.y = 0f;
                if (toEnemy.magnitude > radius + 0.45f) continue;
                var to = e.transform.position - attackerPos;
                to.y = 0f;
                if (to.sqrMagnitude > 0.01f && Vector3.Dot(attackerFwd, to.normalized) < -0.15f)
                    continue;
                alreadyHit.Add(id);
                ApplyPlayerHit(e, damage);
            }
        }

        void MaybeLevel()
        {
            var c = player.Character;
            while (c.xp >= 40 + c.level * 20 && c.level < 60)
            {
                c.xp -= 40 + c.level * 20;
                c.level += 1;
                c.unspentStats += 5;
                c.unspentSkills += 1;
                player.HealFull();
            }
        }

        void SweepCleared()
        {
            var alive = new HashSet<string>();
            foreach (var e in _enemies)
                if (e != null && !e.IsDead) alive.Add(e.packId);
            foreach (var id in _spawned)
                if (!alive.Contains(id)) _cleared.Add(id);
        }

        public void OnPlayerDied() => Dead = true;

        public void Retry()
        {
            Dead = false;
            player.Character.gold = Mathf.Max(0, player.Character.gold - player.Character.gold / 6);
            player.HealFull();
            var start = WorldData.RoadStart;
            player.transform.position = new Vector3(start.x, 0f, start.y);
        }

        public SaveSlot ToSave()
        {
            var p = player.transform.position;
            var cleared = new string[_cleared.Count];
            _cleared.CopyTo(cleared);
            return new SaveSlot
            {
                character = player.Character,
                hp = player.Hp,
                x = p.x,
                y = p.z,
                gold = player.Character.gold,
                clearedPackIds = cleared
            };
        }

        void Update()
        {
            if (player == null || Dead) return;
            PlaceLabel = WorldData.PlaceAt(new Vector2(player.transform.position.x, player.transform.position.z), _packs);
            RefreshPacks();
        }

        void RefreshPacks()
        {
            var pos = new Vector2(player.transform.position.x, player.transform.position.z);
            foreach (var pack in _packs)
            {
                if (_cleared.Contains(pack.id) || _spawned.Contains(pack.id)) continue;
                if (Vector2.Distance(pos, pack.position) > WorldData.SpawnRadius) continue;
                SpawnPack(pack);
                _spawned.Add(pack.id);
            }
        }

        void SpawnPack(PackSpot pack)
        {
            for (var i = 0; i < pack.size; i++)
            {
                var elite = pack.boss && i == 0;
                var key = WardModels.EnemyKeyAt(i + pack.level);
                var go = SpawnBoneEnemy(key, elite, enemyRoot);
                go.name = $"Enemy_{pack.id}_{i}";
                var offset = new Vector3(Random.Range(-1.1f, 1.1f), 0f, Random.Range(-1.1f, 1.1f));
                go.transform.position = new Vector3(pack.position.x, 0f, pack.position.y) + offset;
                var agent = go.GetComponent<EnemyAgent>();
                var life = 28f + pack.level * 10f + (elite ? 40f : 0f);
                var dmg = 4f + pack.level * 1.2f + (elite ? 4f : 0f);
                agent.Init(pack.id, life, dmg, elite, player.transform, go.GetComponentInChildren<ActorRig>());
                _enemies.Add(agent);
            }
        }

        static GameObject SpawnBoneEnemy(string key, bool elite, Transform parent)
        {
            var root = new GameObject(string.IsNullOrEmpty(key) ? "Enemy" : key);
            if (parent != null) root.transform.SetParent(parent, false);
            var tint = EnemyTint(key);
            var scale = EnemyScale(key) * (elite ? 1.2f : 1f);
            var kind = SkeletonDef.ForEnemyKey(key);
            ActorRig.Create(root.transform, "ActorRig", tint, scale, withWeapon: false, kind: kind);
            // Stash mesh for later paint bind; bones-first keeps it hidden.
            var paint = WardModels.SpawnActor(key, root.transform);
            if (paint != null)
            {
                paint.name = "PaintRef";
                paint.SetActive(false);
            }
            var agent = root.AddComponent<EnemyAgent>();
            return root;
        }

        static Color EnemyTint(string key)
        {
            if (string.IsNullOrEmpty(key)) return new Color(0.45f, 0.4f, 0.38f);
            if (key.Contains("wolf")) return new Color(0.35f, 0.32f, 0.3f);
            if (key.Contains("skeleton") || key.Contains("undead")) return new Color(0.75f, 0.72f, 0.62f);
            if (key.Contains("zombie")) return new Color(0.4f, 0.5f, 0.35f);
            if (key.Contains("imp") || key.Contains("archdemon")) return new Color(0.55f, 0.2f, 0.18f);
            if (key.Contains("spider")) return new Color(0.25f, 0.2f, 0.22f);
            if (key.Contains("slime")) return new Color(0.35f, 0.65f, 0.35f);
            if (key.Contains("dragon") || key.Contains("drake") || key.Contains("wyrm") || key.Contains("wyvern"))
                return new Color(0.45f, 0.35f, 0.55f);
            if (key.Contains("rat")) return new Color(0.4f, 0.32f, 0.28f);
            return new Color(0.5f, 0.42f, 0.38f);
        }

        static float EnemyScale(string key)
        {
            if (string.IsNullOrEmpty(key)) return 1f;
            if (key.Contains("hillock") || key.Contains("dragon") || key.Contains("archdemon")) return 1.35f;
            if (key.Contains("rat") && !key.Contains("giant")) return 0.55f;
            if (key.Contains("giantrat")) return 0.85f;
            if (key.Contains("spider") || key.Contains("slime") || key.Contains("imp")) return 0.75f;
            if (key.Contains("whelp") || key.Contains("sprig") || key.Contains("flicker") || key.Contains("wisp")) return 0.7f;
            return 1f;
        }
    }
}
