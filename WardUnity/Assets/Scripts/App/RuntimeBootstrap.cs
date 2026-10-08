using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using Ward.Game;
using Ward.UI;

namespace Ward.App
{
    /// <summary>
    /// Builds Boot/Title/Create/Run gray-box world + uGUI entirely in code
    /// so the project opens cleanly before Editor scene authoring.
    /// </summary>
    public class RuntimeBootstrap : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void AutoBoot()
        {
            if (FindFirstObjectByType<AppFlow>() != null) return;
            var boot = new GameObject("WardBootstrap");
            boot.AddComponent<RuntimeBootstrap>();
        }

        void Awake()
        {
            BuildLighting();
            BuildBox();
            var player = BuildPlayer();
            var session = new GameObject("RunSession").AddComponent<RunSession>();
            var enemyRoot = new GameObject("Enemies").transform;
            typeof(RunSession).GetField("player", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(session, player);
            typeof(RunSession).GetField("enemyRoot", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(session, enemyRoot);

            var canvas = BuildCanvas();
            var flow = canvas.gameObject.AddComponent<AppFlow>();
            var touch = canvas.gameObject.AddComponent<TouchControls>();
            var hud = canvas.gameObject.AddComponent<HudView>();
            var sheet = canvas.gameObject.AddComponent<SheetView>();
            var town = canvas.gameObject.AddComponent<TownView>();

            var splash = Panel(canvas.transform, "Splash", new Color(0.05f, 0.04f, 0.06f, 1f));
            AddLabel(splash.transform, "Ward", 64, new Vector2(0, 40));
            AddLabel(splash.transform, "Native Unity path", 28, new Vector2(0, -30));

            var title = Panel(canvas.transform, "Title", new Color(0.08f, 0.07f, 0.09f, 0.96f));
            AddLabel(title.transform, "Ward", 56, new Vector2(0, 160));
            var slotMeta = AddLabel(title.transform, "No exile yet", 24, new Vector2(0, 60));
            var titleView = title.AddComponent<TitleView>();
            WireTitle(titleView, slotMeta, title.transform);

            var create = Panel(canvas.transform, "Create", new Color(0.08f, 0.07f, 0.09f, 0.96f));
            var createView = create.AddComponent<CreateView>();
            var previewHost = new GameObject("RacePreview");
            previewHost.transform.position = new Vector3(4.6f, 0f, -2.2f);
            var preview = previewHost.AddComponent<RacePreviewPresenter>();
            WireCreate(createView, create.transform, preview);

            var hudGo = Panel(canvas.transform, "HUD", new Color(0, 0, 0, 0));
            hudGo.GetComponent<Image>().raycastTarget = false;
            var identity = AddLabel(hudGo.transform, "Exile", 22, new Vector2(-280, 300), TextAnchor.UpperLeft);
            var place = AddLabel(hudGo.transform, "Threshold", 18, new Vector2(-280, 270), TextAnchor.UpperLeft);
            var hp = AddLabel(hudGo.transform, "50 / 50", 22, new Vector2(-280, -280), TextAnchor.LowerLeft);
            var gold = AddLabel(hudGo.transform, "0", 22, new Vector2(280, 300), TextAnchor.UpperRight);
            var dead = Panel(hudGo.transform, "Dead", new Color(0.1f, 0.05f, 0.05f, 0.85f));
            dead.SetActive(false);
            AddLabel(dead.transform, "You fall", 40, Vector2.zero);
            var retry = AddButton(dead.transform, "Retry", new Vector2(0, -80), () => session.Retry());
            WireHud(hud, identity, place, hp, gold, dead, player, session);
            AddButton(hudGo.transform, "Attack", new Vector2(280, -220), () => player.TryAttack(), TextAnchor.LowerRight);
            var skillWheel = hudGo.AddComponent<SkillWheelView>();
            var s0 = AddLabel(hudGo.transform, "Cleave", 18, new Vector2(-80, -280), TextAnchor.LowerCenter);
            var s1 = AddLabel(hudGo.transform, "Shadow", 18, new Vector2(40, -280), TextAnchor.LowerCenter);
            var s2 = AddLabel(hudGo.transform, "Pulse", 18, new Vector2(160, -280), TextAnchor.LowerCenter);
            typeof(SkillWheelView).GetField("slotLabels", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(skillWheel, new[] { s0, s1, s2 });
            AddButton(hudGo.transform, "S1", new Vector2(-80, -220), () => player.TryCastSkill(0), TextAnchor.LowerCenter);
            AddButton(hudGo.transform, "S2", new Vector2(40, -220), () => player.TryCastSkill(1), TextAnchor.LowerCenter);
            AddButton(hudGo.transform, "S3", new Vector2(160, -220), () => player.TryCastSkill(2), TextAnchor.LowerCenter);
            AddButton(hudGo.transform, "Sheet", new Vector2(280, 220), () => flow.OpenSheet(), TextAnchor.UpperRight);
            AddButton(hudGo.transform, "Town", new Vector2(280, 160), () => flow.OpenTown(), TextAnchor.UpperRight);
            AddButton(hudGo.transform, "Save", new Vector2(280, 100), () =>
            {
                SaveService.Write(session.ToSave());
                flow.ShowTitle();
            }, TextAnchor.UpperRight);

            var stick = new GameObject("Stick", typeof(RectTransform), typeof(Image));
            stick.transform.SetParent(hudGo.transform, false);
            var stickRt = stick.GetComponent<RectTransform>();
            stickRt.anchorMin = stickRt.anchorMax = new Vector2(0.15f, 0.18f);
            stickRt.sizeDelta = new Vector2(160, 160);
            stick.GetComponent<Image>().color = new Color(1, 1, 1, 0.12f);
            var knob = new GameObject("Knob", typeof(RectTransform), typeof(Image));
            knob.transform.SetParent(stick.transform, false);
            knob.GetComponent<RectTransform>().sizeDelta = new Vector2(64, 64);
            knob.GetComponent<Image>().color = new Color(0.9f, 0.75f, 0.45f, 0.55f);
            typeof(TouchControls).GetField("stickBase", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(touch, stickRt);
            typeof(TouchControls).GetField("stickKnob", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(touch, knob.GetComponent<RectTransform>());
            typeof(TouchControls).GetField("player", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(touch, player);

            var sheetGo = Panel(canvas.transform, "Sheet", new Color(0.1f, 0.09f, 0.11f, 0.95f));
            sheetGo.SetActive(false);
            var sheetBody = AddLabel(sheetGo.transform, "", 20, new Vector2(0, 40));
            sheetBody.alignment = TextAnchor.UpperLeft;
            sheetBody.rectTransform.sizeDelta = new Vector2(600, 700);
            typeof(SheetView).GetField("body", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(sheet, sheetBody);
            AddButton(sheetGo.transform, "STR+", new Vector2(-120, -280), () => sheet.SpendStrength());
            AddButton(sheetGo.transform, "STA+", new Vector2(0, -280), () => sheet.SpendStamina());
            AddButton(sheetGo.transform, "Close", new Vector2(120, -280), () => flow.CloseSheet());

            var townGo = Panel(canvas.transform, "Town", new Color(0.1f, 0.09f, 0.11f, 0.95f));
            townGo.SetActive(false);
            var townBlurb = AddLabel(townGo.transform, "", 22, new Vector2(0, 40));
            typeof(TownView).GetField("blurb", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(town, townBlurb);
            AddButton(townGo.transform, "Whetstone", new Vector2(-160, -160), () => town.BuyWhetstone());
            AddButton(townGo.transform, "Blade", new Vector2(0, -160), () => town.BuyShop("whetblade"));
            AddButton(townGo.transform, "Mail", new Vector2(160, -160), () => town.BuyShop("ashmail"));
            AddButton(townGo.transform, "Charm", new Vector2(-80, -230), () => town.BuyShop("gatecharm"));
            AddButton(townGo.transform, "Rest", new Vector2(80, -230), () => town.Rest());
            AddButton(townGo.transform, "Close", new Vector2(0, -300), () => flow.CloseTown());

            typeof(AppFlow).GetField("splashPanel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, splash);
            typeof(AppFlow).GetField("titlePanel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, title);
            typeof(AppFlow).GetField("createPanel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, create);
            typeof(AppFlow).GetField("hudPanel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, hudGo);
            typeof(AppFlow).GetField("sheetPanel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, sheetGo);
            typeof(AppFlow).GetField("townPanel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, townGo);
            typeof(AppFlow).GetField("runSession", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, session);
            typeof(AppFlow).GetField("player", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, player);
            typeof(AppFlow).GetField("touch", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, touch);
            typeof(AppFlow).GetField("hud", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, hud);
            typeof(AppFlow).GetField("sheet", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, sheet);
            typeof(AppFlow).GetField("town", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, town);
            typeof(AppFlow).GetField("skills", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, skillWheel);

            var cam = Camera.main;
            if (cam == null)
            {
                var camGo = new GameObject("Main Camera");
                cam = camGo.AddComponent<Camera>();
                cam.tag = "MainCamera";
            }
            var start = WorldData.RoadStart;
            cam.transform.position = new Vector3(start.x, 0f, start.y) + WorldData.CameraOffset;
            cam.transform.LookAt(new Vector3(0f, 0.8f, 0f));
            cam.backgroundColor = new Color(0.18f, 0.16f, 0.15f);
            cam.clearFlags = CameraClearFlags.SolidColor;
            typeof(AppFlow).GetField("mainCamera", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, cam);
            typeof(AppFlow).GetField("cameraRig", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(flow, cam.transform);

            if (FindFirstObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<StandaloneInputModule>();
            }
        }

        static void BuildLighting()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.45f, 0.4f, 0.38f);
            var lightGo = new GameObject("KeyLight");
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.95f, 0.88f);
            light.intensity = 1.1f;
            lightGo.transform.rotation = Quaternion.Euler(40f, -30f, 0f);
        }

        static void BuildBox()
        {
            var root = new GameObject("BoxLevel").transform;
            float[] xs = { -6f, -2f, 2f, 6f };
            float[] zs = { -4f, 0f, 4f };
            foreach (var x in xs)
            foreach (var z in zs)
                Place("floor", root, new Vector3(x, -0.05f, z), Quaternion.identity, false);

            var ground = new GameObject("Ground");
            ground.transform.SetParent(root, false);
            var box = ground.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, -0.25f, 0f);
            box.size = new Vector3(16.2f, 0.5f, 12.2f);

            foreach (var x in xs)
            {
                Place("wall", root, new Vector3(x, 0f, 6.5f), Quaternion.identity, true);
                Place("wall", root, new Vector3(x, 0f, -6.5f), Quaternion.Euler(0f, 180f, 0f), true);
            }
            foreach (var z in zs)
            {
                Place("wall", root, new Vector3(8.5f, 0f, z), Quaternion.Euler(0f, 90f, 0f), true);
                Place("wall", root, new Vector3(-8.5f, 0f, z), Quaternion.Euler(0f, -90f, 0f), true);
            }

            Place("pillar", root, new Vector3(-4f, 0f, -2f), Quaternion.identity, true);
            Place("pillar", root, new Vector3(4f, 0f, -2f), Quaternion.identity, true);
            Place("pillar", root, new Vector3(-4f, 0f, 2f), Quaternion.identity, true);
            Place("pillar", root, new Vector3(4f, 0f, 2f), Quaternion.identity, true);
            Place("column", root, new Vector3(-6.4f, 0f, 0f), Quaternion.identity, false);
            Place("column", root, new Vector3(6.4f, 0f, 0f), Quaternion.identity, false);
            Place("chest", root, new Vector3(-5.2f, 0f, -4.2f), Quaternion.Euler(0f, 25f, 0f), false);
            Place("barrel", root, new Vector3(5.1f, 0f, -3.5f), Quaternion.identity, false);
            Place("barrel", root, new Vector3(5.7f, 0f, -4.5f), Quaternion.Euler(0f, 35f, 0f), false);
        }

        static void Place(string key, Transform parent, Vector3 pos, Quaternion rot, bool collide)
        {
            var go = WardModels.Spawn(key, parent, collide);
            if (go == null) return;
            go.transform.localPosition = pos;
            go.transform.localRotation = rot;
        }

        static PlayerController BuildPlayer()
        {
            var go = new GameObject("Player");
            var start = WorldData.RoadStart;
            go.transform.position = new Vector3(start.x, 0f, start.y);
            var actor = AuthoredMeshFactory.BuildRaceProxy(RaceId.Human, Gender.Male, go.transform);
            actor.name = "Actor";
            return go.AddComponent<PlayerController>();
        }

        static Canvas BuildCanvas()
        {
            var go = new GameObject("UI", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = go.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            return canvas;
        }

        static GameObject Panel(Transform parent, string name, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            go.GetComponent<Image>().color = color;
            return go;
        }

        static Text AddLabel(Transform parent, string text, int size, Vector2 pos, TextAnchor anchor = TextAnchor.MiddleCenter)
        {
            var go = new GameObject("Label", typeof(RectTransform), typeof(Text));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(700, 80);
            rt.anchoredPosition = pos;
            var t = go.GetComponent<Text>();
            t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (t.font == null) t.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            t.text = text;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = new Color(0.92f, 0.85f, 0.7f);
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            return t;
        }

        static Button AddButton(Transform parent, string label, Vector2 pos, UnityEngine.Events.UnityAction action, TextAnchor anchor = TextAnchor.MiddleCenter)
        {
            var go = new GameObject(label + "Btn", typeof(RectTransform), typeof(Image), typeof(Button));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(180, 64);
            rt.anchoredPosition = pos;
            if (anchor == TextAnchor.LowerRight)
            {
                rt.anchorMin = rt.anchorMax = new Vector2(1, 0);
                rt.pivot = new Vector2(1, 0);
            }
            else if (anchor == TextAnchor.UpperRight)
            {
                rt.anchorMin = rt.anchorMax = new Vector2(1, 1);
                rt.pivot = new Vector2(1, 1);
            }
            else if (anchor == TextAnchor.LowerCenter)
            {
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0);
                rt.pivot = new Vector2(0.5f, 0);
                rt.sizeDelta = new Vector2(100, 56);
            }
            go.GetComponent<Image>().color = new Color(0.25f, 0.18f, 0.14f, 0.95f);
            var text = AddLabel(go.transform, label, 22, Vector2.zero);
            text.color = new Color(0.95f, 0.85f, 0.55f);
            var btn = go.GetComponent<Button>();
            btn.onClick.AddListener(action);
            return btn;
        }

        static void WireTitle(TitleView view, Text slotMeta, Transform root)
        {
            typeof(TitleView).GetField("slotMeta", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(view, slotMeta);
            var cont = AddButton(root, "Continue", new Vector2(0, -20), view.OnContinue);
            var neu = AddButton(root, "New Exile", new Vector2(0, -100), view.OnNew);
            var del = AddButton(root, "Delete", new Vector2(0, -180), view.OnDelete);
            typeof(TitleView).GetField("continueButton", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(view, cont);
            typeof(TitleView).GetField("newButton", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(view, neu);
            typeof(TitleView).GetField("deleteButton", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(view, del);
        }

        static void WireCreate(CreateView view, Transform root, RacePreviewPresenter preview)
        {
            AddLabel(root, "Create exile", 40, new Vector2(0, 320));
            var nameGo = new GameObject("Name", typeof(RectTransform), typeof(Image), typeof(InputField));
            nameGo.transform.SetParent(root, false);
            var nrt = nameGo.GetComponent<RectTransform>();
            nrt.sizeDelta = new Vector2(420, 56);
            nrt.anchoredPosition = new Vector2(0, 250);
            nameGo.GetComponent<Image>().color = new Color(0.15f, 0.12f, 0.14f);
            var input = nameGo.GetComponent<InputField>();
            var placeholder = AddLabel(nameGo.transform, "Name", 22, Vector2.zero);
            var text = AddLabel(nameGo.transform, "Exile", 22, Vector2.zero);
            text.supportRichText = false;
            input.textComponent = text;
            input.placeholder = placeholder;
            input.text = "Exile";

            var raceName = AddLabel(root, "Human", 28, new Vector2(0, 160));
            var raceIndex = AddLabel(root, "1 / 10", 18, new Vector2(0, 120));
            var blurb = AddLabel(root, "", 20, new Vector2(0, 70));
            blurb.rectTransform.sizeDelta = new Vector2(700, 80);
            var genderRow = new GameObject("Gender", typeof(RectTransform));
            genderRow.transform.SetParent(root, false);
            genderRow.GetComponent<RectTransform>().anchoredPosition = new Vector2(0, 200);
            var male = AddButton(genderRow.transform, "Male", new Vector2(-100, 0), view.OnMale);
            var female = AddButton(genderRow.transform, "Female", new Vector2(100, 0), view.OnFemale);
            var unisex = AddLabel(root, "Unisex form", 20, new Vector2(0, 200));
            unisex.gameObject.SetActive(false);
            AddButton(root, "‹", new Vector2(-300, 0), view.OnPrevRace);
            AddButton(root, "›", new Vector2(300, 0), view.OnNextRace);
            AddButton(root, "Enter the gate", new Vector2(0, -280), view.OnEnter);
            AddButton(root, "Back", new Vector2(0, -360), view.OnBack);

            var flags = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
            typeof(CreateView).GetField("nameField", flags)?.SetValue(view, input);
            typeof(CreateView).GetField("raceName", flags)?.SetValue(view, raceName);
            typeof(CreateView).GetField("raceBlurb", flags)?.SetValue(view, blurb);
            typeof(CreateView).GetField("raceIndex", flags)?.SetValue(view, raceIndex);
            typeof(CreateView).GetField("maleButton", flags)?.SetValue(view, male);
            typeof(CreateView).GetField("femaleButton", flags)?.SetValue(view, female);
            typeof(CreateView).GetField("genderRow", flags)?.SetValue(view, genderRow);
            typeof(CreateView).GetField("unisexLabel", flags)?.SetValue(view, unisex);
            typeof(CreateView).GetField("preview", flags)?.SetValue(view, preview);
        }

        static void WireHud(HudView hud, Text identity, Text place, Text hp, Text gold, GameObject dead, PlayerController player, RunSession session)
        {
            var flags = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
            typeof(HudView).GetField("identity", flags)?.SetValue(hud, identity);
            typeof(HudView).GetField("place", flags)?.SetValue(hud, place);
            typeof(HudView).GetField("hpText", flags)?.SetValue(hud, hp);
            typeof(HudView).GetField("goldText", flags)?.SetValue(hud, gold);
            typeof(HudView).GetField("deadPanel", flags)?.SetValue(hud, dead);
            typeof(HudView).GetField("player", flags)?.SetValue(hud, player);
            typeof(HudView).GetField("session", flags)?.SetValue(hud, session);
        }
    }
}
