using UnityEngine;
using UnityEngine.UI;
using Ward.Game;

namespace Ward.UI
{
    public class TitleView : MonoBehaviour
    {
        [SerializeField] Text[] names;
        [SerializeField] Text[] metas;
        [SerializeField] RawImage[] portraits;
        [SerializeField] Text[] empties;
        [SerializeField] Text[] playLabels;
        [SerializeField] Button[] deleteButtons;
        [SerializeField] RacePreviewPresenter[] previews;

        void OnEnable()
        {
            Refresh();
        }

        void OnDisable()
        {
            if (previews == null) return;
            foreach (var preview in previews)
                preview?.SetLive(false);
        }

        public void Refresh()
        {
            var count = names != null ? names.Length : 0;
            for (var i = 0; i < count; i++)
            {
                var save = SaveService.Read(i);
                var occupied = save?.character != null;
                if (names[i] != null) names[i].text = occupied ? save.character.name : "Empty";
                if (metas[i] != null)
                {
                    metas[i].text = occupied
                        ? $"{RaceRules.DisplayName(save.character.race)} · Level {save.character.level}"
                        : "No exile yet";
                }
                if (playLabels != null && i < playLabels.Length && playLabels[i] != null)
                    playLabels[i].text = occupied ? "Continue" : "New";
                if (deleteButtons != null && i < deleteButtons.Length && deleteButtons[i] != null)
                    deleteButtons[i].interactable = occupied;
                if (empties != null && i < empties.Length && empties[i] != null)
                    empties[i].gameObject.SetActive(!occupied);
                var preview = previews != null && i < previews.Length ? previews[i] : null;
                if (preview != null)
                {
                    if (occupied)
                    {
                        preview.Show(save.character.race, save.character.gender);
                        preview.SetLive(true);
                    }
                    else
                    {
                        preview.Clear();
                        preview.SetLive(false);
                    }
                }
                if (portraits != null && i < portraits.Length && portraits[i] != null)
                {
                    portraits[i].texture = preview != null ? preview.Texture : null;
                    portraits[i].enabled = occupied && preview != null;
                }
            }
        }

        public void Play(int slot)
        {
            SaveService.Select(slot);
            var save = SaveService.Read(slot);
            if (save?.character != null)
                App.AppFlow.Instance?.StartRun(save.character, save);
            else
                App.AppFlow.Instance?.ShowCreate();
        }

        public void Delete(int slot)
        {
            SaveService.Clear(slot);
            Refresh();
        }
    }
}
