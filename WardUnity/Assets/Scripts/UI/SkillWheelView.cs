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
                slotLabels[i].text = def != null ? def.name : $"Skill {i + 1}";
            }
        }

        public void CastSlot(int index) => player?.TryCastSkill(index);

        public void AssignDefaultsIfEmpty()
        {
            var c = player?.Character;
            if (c == null) return;
            if (c.skillSlots == null || c.skillSlots.Length != 3)
                c.skillSlots = new string[3];
            if (string.IsNullOrEmpty(c.skillSlots[0])) c.skillSlots[0] = "cleave";
            if (string.IsNullOrEmpty(c.skillSlots[1])) c.skillSlots[1] = "shadowstep";
            if (string.IsNullOrEmpty(c.skillSlots[2])) c.skillSlots[2] = "wardpulse";
            Refresh();
        }
    }
}
