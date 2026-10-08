using UnityEngine;
using UnityEngine.UI;
using Ward.Game;

namespace Ward.UI
{
    public class TitleView : MonoBehaviour
    {
        [SerializeField] Text slotMeta;
        [SerializeField] Button continueButton;
        [SerializeField] Button newButton;
        [SerializeField] Button deleteButton;

        void OnEnable() => Refresh();

        public void Refresh()
        {
            var save = SaveService.Read();
            var occupied = save?.character != null;
            if (slotMeta != null)
            {
                slotMeta.text = occupied
                    ? $"{save.character.name} · {RaceRules.DisplayName(save.character.race)} · L{save.character.level}"
                    : "No exile yet";
            }
            if (continueButton != null) continueButton.interactable = occupied;
            if (deleteButton != null) deleteButton.interactable = occupied;
            if (newButton != null) newButton.interactable = true;
        }

        public void OnContinue()
        {
            var save = SaveService.Read();
            if (save?.character == null) return;
            App.AppFlow.Instance?.StartRun(save.character, save);
        }

        public void OnNew() => App.AppFlow.Instance?.ShowCreate();

        public void OnDelete()
        {
            SaveService.Clear();
            Refresh();
        }
    }
}
