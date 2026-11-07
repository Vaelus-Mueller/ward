using UnityEngine;
using UnityEngine.UI;
using Ward.Game;

namespace Ward.UI
{
    /// <summary>Three hotbar skill slots (M2). Uses legacy uGUI Text for bootstrap simplicity.</summary>
    public class SkillWheelView : MonoBehaviour
    {
        [SerializeField] Text[] slotLabels = new Text[3];
        [SerializeField] PlayerController player;

        public void Bind(PlayerController p)
        {
            player = p;
            Refresh();
        }

        public void Refresh()
        {
            if (player?.Character == null) return;
            var slots = player.Character.skillSlots;
            for (var i = 0; i < 3; i++)
            {
                if (slotLabels == null || i >= slotLabels.Length || slotLabels[i] == null) continue;
                var id = slots != null && i < slots.Length ? slots[i] : null;
                var def = string.IsNullOrEmpty(id) ? null : SkillCatalog.ById(id);
                slotLabels[i].text = def != null ? def.name : "";
            }
        }

        public void CastSlot(int index) => player?.TryCastSkill(index);

        /// <summary>Ensure three slots exist. New exiles keep them empty until assigned.</summary>
        public void AssignDefaultsIfEmpty()
        {
            var c = player?.Character;
            if (c == null) return;
            if (c.skillSlots == null || c.skillSlots.Length != 3)
                c.skillSlots = new[] { "", "", "" };
            Refresh();
        }
    }
}
