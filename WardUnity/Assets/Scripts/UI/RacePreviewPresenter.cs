using UnityEngine;
using Ward.Game;

namespace Ward.UI
{
    /// <summary>
    /// Single-camera race preview using placeholder meshes (M1).
    /// Shares the game GPU path — no second WebGL context.
    /// </summary>
    public class RacePreviewPresenter : MonoBehaviour
    {
        [SerializeField] Transform pivot;
        [SerializeField] float spinSpeed = 28f;

        GameObject _body;
        RaceId _race;
        Gender _gender;

        public void Show(RaceId race, Gender gender)
        {
            if (_body != null && _race == race && _gender == gender) return;
            _race = race;
            _gender = gender;
            if (_body != null) Destroy(_body);
            if (pivot == null)
            {
                var go = new GameObject("PreviewPivot");
                go.transform.SetParent(transform, false);
                pivot = go.transform;
            }
            _body = AuthoredMeshFactory.BuildRaceProxy(race, gender, pivot);
            _body.transform.localPosition = Vector3.zero;
        }

        void Update()
        {
            if (pivot != null) pivot.Rotate(0f, spinSpeed * Time.deltaTime, 0f);
        }
    }
}
