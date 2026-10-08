using UnityEngine;
using UnityEngine.UI;
using Ward.Game;

namespace Ward.UI
{
    public class HudView : MonoBehaviour
    {
        [SerializeField] Text identity;
        [SerializeField] Text place;
        [SerializeField] Text hpText;
        [SerializeField] Text goldText;
        [SerializeField] GameObject deadPanel;
        [SerializeField] PlayerController player;
        [SerializeField] RunSession session;

        public void Bind(PlayerController p, RunSession s)
        {
            player = p;
            session = s;
        }

        void Update()
        {
            if (player == null || player.Character == null) return;
            var c = player.Character;
            if (identity != null)
                identity.text = $"{c.name} · {RaceRules.DisplayName(c.race)} · L{c.level}";
            if (place != null && session != null) place.text = session.PlaceLabel;
            if (hpText != null) hpText.text = $"{Mathf.CeilToInt(player.Hp)} / {c.MaxLife}";
            if (goldText != null) goldText.text = $"{c.gold}";
            if (deadPanel != null) deadPanel.SetActive(session != null && session.Dead);
        }

        public void OnRetry()
        {
            session?.Retry();
        }

        public void OnSaveQuit()
        {
            if (session == null) return;
            SaveService.Write(session.ToSave());
            App.AppFlow.Instance?.ShowTitle();
        }
    }
}
