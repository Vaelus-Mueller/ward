using UnityEngine;
using Ward.Game;

namespace Ward.UI
{
    public class TouchControls : MonoBehaviour
    {
        [SerializeField] RectTransform stickBase;
        [SerializeField] RectTransform stickKnob;
        [SerializeField] PlayerController player;
        [SerializeField] float stickRadius = 70f;

        Vector2 _stick;
        int _stickFinger = -1;

        public Vector2 Stick => _stick;

        public void Bind(PlayerController p) => player = p;

        void Update()
        {
#if UNITY_EDITOR || UNITY_STANDALONE
            var k = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (k.sqrMagnitude > 0.01f) _stick = Vector2.ClampMagnitude(k, 1f);
            if (Input.GetKeyDown(KeyCode.Space))
                player?.TryAttack();
#endif
            if (Input.touchCount > 0)
            {
                for (var i = 0; i < Input.touchCount; i++)
                {
                    var t = Input.GetTouch(i);
                    if (t.phase == TouchPhase.Began && t.position.x < Screen.width * 0.45f && _stickFinger < 0)
                    {
                        _stickFinger = t.fingerId;
                        if (stickBase != null) stickBase.position = t.position;
                    }
                    else if (t.fingerId == _stickFinger)
                    {
                        if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled)
                        {
                            _stickFinger = -1;
                            _stick = Vector2.zero;
                            if (stickKnob != null) stickKnob.anchoredPosition = Vector2.zero;
                        }
                        else if (stickBase != null)
                        {
                            Vector2 local;
                            RectTransformUtility.ScreenPointToLocalPointInRectangle(stickBase, t.position, null, out local);
                            local = Vector2.ClampMagnitude(local, stickRadius);
                            _stick = local / stickRadius;
                            if (stickKnob != null) stickKnob.anchoredPosition = local;
                        }
                    }
                }
            }
            player?.SetMove(_stick);
        }

        public void OnAttackPressed() => player?.TryAttack();
    }
}
