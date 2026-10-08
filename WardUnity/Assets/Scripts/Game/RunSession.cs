using System.Collections.Generic;
using UnityEngine;

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
            RefreshPacks();
            PlaceLabel = WorldData.PlaceAt(new Vector2(player.transform.position.x, player.transform.position.z), _packs);
        }

        public void PlayerAttack(Vector3 origin, Vector3 facing, float range, float damage)
        {
            foreach (var e in _enemies)
            {
                if (e == null || e.IsDead) continue;
                var to = e.transform.position - origin;
                to.y = 0f;
                if (to.magnitude > range) continue;
                if (Vector3.Dot(facing.normalized, to.normalized) < 0.2f && to.magnitude > 0.8f) continue;
                e.TakeDamage(damage);
                if (e.IsDead)
                {
                    player.Character.gold += e.elite ? 12 : 4;
                    player.Character.xp += e.elite ? 18 : 8;
                    MaybeLevel();
                }
            }
            SweepCleared();
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
                var go = WardModels.SpawnEnemy(i + pack.level, elite, enemyRoot);
                if (go == null)
                    go = enemyPrefab != null
                        ? Instantiate(enemyPrefab, enemyRoot)
                        : AuthoredMeshFactory.BuildEnemyProxy(elite, enemyRoot);
                go.name = $"Enemy_{pack.id}_{i}";
                go.transform.SetParent(enemyRoot, false);
                var offset = new Vector3(Random.Range(-1.1f, 1.1f), 0f, Random.Range(-1.1f, 1.1f));
                go.transform.position = new Vector3(pack.position.x, 0f, pack.position.y) + offset;
                var agent = go.GetComponent<EnemyAgent>() ?? go.AddComponent<EnemyAgent>();
                var life = 28f + pack.level * 10f + (elite ? 40f : 0f);
                var dmg = 4f + pack.level * 1.2f + (elite ? 4f : 0f);
                agent.Init(pack.id, life, dmg, elite, player.transform);
                _enemies.Add(agent);
            }
        }
    }
}
