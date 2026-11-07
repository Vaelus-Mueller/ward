using UnityEngine;

namespace Ward.Game
{
    /// <summary>Cheap room life: torch flicker + drifting dust.</summary>
    public class AmbientFx : MonoBehaviour
    {
        Light[] _torches;
        float[] _base;
        ParticleSystem _dust;

        public static AmbientFx Install(Transform levelRoot)
        {
            var go = new GameObject("AmbientFx");
            go.transform.SetParent(levelRoot, false);
            var fx = go.AddComponent<AmbientFx>();
            fx.BuildTorches(levelRoot);
            fx.BuildDust();
            return fx;
        }

        void BuildTorches(Transform _)
        {
            var spots = new[]
            {
                new Vector3(-8f, 2.4f, -4f),
                new Vector3(8f, 2.4f, -4f),
                new Vector3(-8f, 2.4f, 4f),
                new Vector3(8f, 2.4f, 4f),
                new Vector3(0f, 2.6f, 8f),
                new Vector3(-12f, 2.2f, 0f),
                new Vector3(12f, 2.2f, 0f),
            };
            _torches = new Light[spots.Length];
            _base = new float[spots.Length];
            for (var i = 0; i < spots.Length; i++)
            {
                var t = new GameObject($"Torch_{i}");
                t.transform.SetParent(transform, false);
                t.transform.position = spots[i];
                var light = t.AddComponent<Light>();
                light.type = LightType.Point;
                light.color = new Color(1f, 0.72f, 0.42f);
                light.range = 7.5f;
                light.intensity = 1.35f;
                _torches[i] = light;
                _base[i] = light.intensity;

                // Simple flame marker.
                var flame = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                flame.name = "Flame";
                flame.transform.SetParent(t.transform, false);
                flame.transform.localScale = Vector3.one * 0.18f;
                Object.Destroy(flame.GetComponent<Collider>());
                flame.GetComponent<Renderer>().sharedMaterial = WardModels.Unlit(new Color(1f, 0.55f, 0.2f));
            }
        }

        void BuildDust()
        {
            var dustGo = new GameObject("Dust");
            dustGo.transform.SetParent(transform, false);
            dustGo.transform.position = new Vector3(0f, 1.5f, 2f);
            _dust = dustGo.AddComponent<ParticleSystem>();
            var main = _dust.main;
            main.startLifetime = 6f;
            main.startSize = 0.04f;
            main.startColor = new Color(0.7f, 0.65f, 0.55f, 0.35f);
            main.maxParticles = 80;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.startSpeed = 0.15f;
            var emission = _dust.emission;
            emission.rateOverTime = 8f;
            var shape = _dust.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(28f, 3f, 20f);
            var vel = _dust.velocityOverLifetime;
            vel.enabled = true;
            vel.space = ParticleSystemSimulationSpace.World;
            vel.y = new ParticleSystem.MinMaxCurve(0.05f, 0.18f);
            var renderer = dustGo.GetComponent<ParticleSystemRenderer>();
            renderer.material = WardModels.Unlit(new Color(0.75f, 0.7f, 0.6f, 0.4f));
        }

        void Update()
        {
            if (_torches == null) return;
            var t = Time.time;
            for (var i = 0; i < _torches.Length; i++)
            {
                if (_torches[i] == null) continue;
                var flicker = 0.82f + 0.18f * Mathf.PerlinNoise(i * 12.1f, t * 3.4f)
                              + 0.08f * Mathf.Sin(t * (7f + i * 0.37f) + i);
                _torches[i].intensity = _base[i] * flicker;
            }
        }
    }
}
