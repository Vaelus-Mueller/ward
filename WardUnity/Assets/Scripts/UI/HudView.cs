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
        [SerializeField] Image attackIcon;
        [SerializeField] Image attackIconSecondary;
        [SerializeField] PlayerController player;
        [SerializeField] RunSession session;

        WeaponFamily _shownPrimary = (WeaponFamily)(-1);
        WeaponFamily _shownSecondary = (WeaponFamily)(-1);

        public void Bind(PlayerController p, RunSession s)
        {
            player = p;
            session = s;
            _shownPrimary = (WeaponFamily)(-1);
            RefreshAttackIcon(force: true);
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
            RefreshAttackIcon(force: false);
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

        void RefreshAttackIcon(bool force)
        {
            if (attackIcon == null || player?.Character == null) return;
            var families = WeaponIcons.FamiliesForEquipped(player.Character);
            var primary = families.Count > 0 ? families[0] : WeaponFamily.Unarmed;
            var secondary = families.Count > 1 ? families[1] : (WeaponFamily)(-1);
            if (!force && primary == _shownPrimary && secondary == _shownSecondary) return;
            _shownPrimary = primary;
            _shownSecondary = secondary;

            attackIcon.sprite = WeaponIcons.ForFamily(primary);
            attackIcon.color = new Color(0.95f, 0.86f, 0.62f, 0.95f);
            attackIcon.enabled = true;

            if (attackIconSecondary == null) return;
            if (secondary >= 0)
            {
                attackIconSecondary.sprite = WeaponIcons.ForFamily(secondary);
                attackIconSecondary.color = new Color(0.95f, 0.86f, 0.62f, 0.95f);
                attackIconSecondary.enabled = true;
                // Dual: shrink and offset both icons.
                attackIcon.rectTransform.anchoredPosition = new Vector2(-14f, 6f);
                attackIcon.rectTransform.sizeDelta = new Vector2(44f, 44f);
                attackIconSecondary.rectTransform.anchoredPosition = new Vector2(14f, -6f);
                attackIconSecondary.rectTransform.sizeDelta = new Vector2(44f, 44f);
            }
            else
            {
                attackIconSecondary.enabled = false;
                attackIcon.rectTransform.anchoredPosition = Vector2.zero;
                attackIcon.rectTransform.sizeDelta = new Vector2(58f, 58f);
            }
        }
    }
}
