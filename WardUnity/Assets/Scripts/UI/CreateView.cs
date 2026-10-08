using UnityEngine;
using UnityEngine.UI;
using Ward.Game;

namespace Ward.UI
{
    public class CreateView : MonoBehaviour
    {
        [SerializeField] InputField nameField;
        [SerializeField] Text raceName;
        [SerializeField] Text raceBlurb;
        [SerializeField] Text raceIndex;
        [SerializeField] Button maleButton;
        [SerializeField] Button femaleButton;
        [SerializeField] GameObject genderRow;
        [SerializeField] Text unisexLabel;
        [SerializeField] RacePreviewPresenter preview;

        RaceId _race = RaceId.Human;
        Gender _gender = Gender.Male;
        static readonly RaceId[] Order =
        {
            RaceId.Human, RaceId.Elf, RaceId.Dwarf, RaceId.Gnome, RaceId.Hobbit,
            RaceId.Insectoid, RaceId.Minotaur, RaceId.Golem, RaceId.Lizard, RaceId.Undead
        };

        void OnEnable() => Paint();

        public void OnPrevRace()
        {
            var i = System.Array.IndexOf(Order, _race);
            _race = Order[(i - 1 + Order.Length) % Order.Length];
            Paint();
        }

        public void OnNextRace()
        {
            var i = System.Array.IndexOf(Order, _race);
            _race = Order[(i + 1) % Order.Length];
            Paint();
        }

        public void OnMale() { _gender = Gender.Male; Paint(); }
        public void OnFemale() { _gender = Gender.Female; Paint(); }

        void Paint()
        {
            var gendered = RaceRules.HasGender(_race);
            if (!gendered) _gender = Gender.Male;
            if (raceName != null) raceName.text = RaceRules.DisplayName(_race);
            if (raceBlurb != null) raceBlurb.text = RaceRules.Blurb(_race);
            if (raceIndex != null)
            {
                var i = System.Array.IndexOf(Order, _race);
                raceIndex.text = $"{i + 1} / {Order.Length}";
            }
            if (genderRow != null) genderRow.SetActive(gendered);
            if (unisexLabel != null) unisexLabel.gameObject.SetActive(!gendered);
            if (maleButton != null)
            {
                maleButton.gameObject.SetActive(gendered);
                maleButton.interactable = gendered;
            }
            if (femaleButton != null)
            {
                femaleButton.gameObject.SetActive(gendered);
                femaleButton.interactable = gendered;
            }
            preview?.Show(_race, _gender);
        }

        public void OnEnter()
        {
            var name = nameField != null ? nameField.text : "Exile";
            var character = CharacterData.Create(name, _race, _gender);
            App.AppFlow.Instance?.StartRun(character, null);
        }

        public void OnBack() => App.AppFlow.Instance?.ShowTitle();
    }
}
