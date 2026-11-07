using UnityEngine;
using UnityEngine.UI;
using Ward.Game;

namespace Ward.UI
{
    /// <summary>Minimal character sheet + skill list (M2 systems slice).</summary>
    public class SheetView : MonoBehaviour
    {
        [SerializeField] Text body;
        [SerializeField] PlayerController player;

        public void Bind(PlayerController p) => player = p;

        public void Refresh()
        {
            if (player?.Character == null || body == null) return;
            var c = player.Character;
            body.text =
                $"{c.name}\n{RaceRules.DisplayName(c.race)}  L{c.level}\n" +
                $"STR {c.strength}  AGI {c.agility}  STA {c.stamina}\n" +
                $"LUK {c.luck}  SPI {c.spirit}\n" +
                $"Unspent stats {c.unspentStats}  skills {c.unspentSkills}\n\n" +
                "Assigned skills:\n";
            var slots = c.skillSlots;
            var any = false;
            if (slots != null)
            {
                for (var i = 0; i < slots.Length; i++)
                {
                    var def = string.IsNullOrEmpty(slots[i]) ? null : SkillCatalog.ById(slots[i]);
                    if (def == null)
                    {
                        body.text += $"· Slot {i + 1}: (empty)\n";
                        continue;
                    }
                    any = true;
                    body.text += $"· {def.name} ({def.sector}) — {def.blurb}\n";
                }
            }
            if (!any && (slots == null || slots.Length == 0))
                body.text += "· (none)\n";
        }

        public void SpendStamina()
        {
            var c = player?.Character;
            if (c == null || c.unspentStats <= 0) return;
            c.unspentStats--;
            c.stamina++;
            player.HealFull();
            Refresh();
        }

        public void SpendStrength()
        {
            var c = player?.Character;
            if (c == null || c.unspentStats <= 0) return;
            c.unspentStats--;
            c.strength++;
            Refresh();
        }
    }
}
