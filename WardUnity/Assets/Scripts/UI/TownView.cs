using UnityEngine;
using UnityEngine.UI;
using Ward.Game;

namespace Ward.UI
{
    public class TownView : MonoBehaviour
    {
        [SerializeField] Text blurb;
        [SerializeField] PlayerController player;

        public void Bind(PlayerController p) => player = p;

        public void Refresh()
        {
            if (blurb == null || player?.Character == null) return;
            var c = player.Character;
            blurb.text =
                $"Ashgate stalls.\nGold: {c.gold}\n" +
                "Whetstone +1 STR (25g) · Rest full life\n" +
                "Shop: Whetblade 40g · Ash Mail 55g · Gate Charm 35g";
        }

        public void BuyWhetstone()
        {
            var c = player?.Character;
            if (c == null || c.gold < 25) return;
            c.gold -= 25;
            c.strength += 1;
            Refresh();
        }

        public void BuyShop(string itemId)
        {
            if (player?.Character == null) return;
            if (GearRules.TryBuy(player.Character, itemId))
                player.HealFull();
            Refresh();
        }

        public void Rest()
        {
            player?.HealFull();
            Refresh();
        }
    }
}
