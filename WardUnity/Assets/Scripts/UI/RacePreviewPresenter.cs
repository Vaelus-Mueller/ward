using UnityEngine;
using Ward.Game;

namespace Ward.UI
{
    /// <summary>
    /// Renders one race mesh into a texture for the title slots and the create screen.
    /// The rig sits on the Preview layer so the gameplay camera never sees it.
    /// </summary>
    public class RacePreviewPresenter : MonoBehaviour
    {
        public const int Layer = 8;

        [SerializeField] float spinSpeed = 24f;

        Camera _cam;
        Transform _pivot;
        GameObject _body;
        RenderTexture _tex;
        int _width = 256;
        int _height = 320;
        RaceId _race;
        Gender _gender;
        bool _hasBody;

        public RenderTexture Texture
        {
            get
            {
                Ensure();
                return _tex;
            }
        }

        public void Configure(int width, int height)
        {
            _width = Mathf.Max(32, width);
            _height = Mathf.Max(32, height);
            if (_tex != null && (_tex.width != _width || _tex.height != _height))
            {
                if (_cam != null) _cam.targetTexture = null;
                _tex.Release();
                Destroy(_tex);
                _tex = null;
            }
            Ensure();
        }

        public void Show(RaceId race, Gender gender)
        {
            Ensure();
            if (_body != null && _hasBody && _race == race && _gender == gender) return;
            _race = race;
            _gender = gender;
            ClearBody();
            _body = AuthoredMeshFactory.BuildRaceProxy(race, gender, _pivot);
            SetLayer(_body, Layer);
            _hasBody = true;
            Frame();
        }

        public void Clear()
        {
            ClearBody();
            _hasBody = false;
        }

        public void SetLive(bool live)
        {
            Ensure();
            _cam.enabled = live;
        }

        void Update()
        {
            if (_pivot != null && _hasBody && _cam != null && _cam.enabled)
                _pivot.Rotate(0f, spinSpeed * Time.deltaTime, 0f);
        }

        void OnDestroy()
        {
            if (_cam != null) _cam.targetTexture = null;
            if (_tex != null)
            {
                _tex.Release();
                Destroy(_tex);
            }
        }

        void Ensure()
        {
            if (_pivot == null)
            {
                var pivotGo = new GameObject("Pivot");
                pivotGo.transform.SetParent(transform, false);
                _pivot = pivotGo.transform;
            }
            if (_tex == null)
            {
                _tex = new RenderTexture(_width, _height, 16, RenderTextureFormat.ARGB32);
                _tex.antiAliasing = 2;
                _tex.Create();
            }
            if (_cam == null)
            {
                var camGo = new GameObject("PreviewCamera");
                camGo.transform.SetParent(transform, false);
                _cam = camGo.AddComponent<Camera>();
                _cam.clearFlags = CameraClearFlags.SolidColor;
                _cam.backgroundColor = new Color(0.09f, 0.07f, 0.08f, 1f);
                _cam.cullingMask = 1 << Layer;
                _cam.fieldOfView = 28f;
                _cam.nearClipPlane = 0.05f;
                _cam.farClipPlane = 20f;
                _cam.depth = -2;
                _cam.enabled = false;
                camGo.layer = Layer;
            }
            _cam.targetTexture = _tex;
            gameObject.layer = Layer;
            _pivot.gameObject.layer = Layer;
        }

        void Frame()
        {
            if (_body == null || _cam == null) return;
            var renderers = _body.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0) return;
            var bounds = renderers[0].bounds;
            for (var i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
            var focus = bounds.center;
            var span = Mathf.Max(bounds.size.y, bounds.size.x, 0.5f);
            _cam.transform.position = focus + new Vector3(0f, span * 0.08f, span * 1.35f + 0.6f);
            _cam.transform.LookAt(focus);
        }

        void ClearBody()
        {
            if (_body != null) Destroy(_body);
            _body = null;
        }

        static void SetLayer(GameObject go, int layer)
        {
            go.layer = layer;
            foreach (Transform child in go.transform)
                SetLayer(child.gameObject, layer);
        }
    }
}
