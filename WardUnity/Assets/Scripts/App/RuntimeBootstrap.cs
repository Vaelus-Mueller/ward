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
            var brand = AddLabel(splash.transform, "Ward", 72, new Vector2(0, 36));
            brand.fontSize = 72;
            brand.rectTransform.sizeDelta = new Vector2(900, 120);
            var tag = AddLabel(splash.transform, "Gate of the ruined ward", 28, new Vector2(0, -48));
            tag.rectTransform.sizeDelta = new Vector2(900, 48);

            var title = Panel(canvas.transform, "Title", new Color(0.07f, 0.06f, 0.08f, 1f));
            var titleView = title.AddComponent<TitleView>();
            WireTitle(titleView, title.transform);

            var create = Panel(canvas.transform, "Create", new Color(0.07f, 0.06f, 0.08f, 1f));
            var createView = create.AddComponent<CreateView>();
            var previewHost = new GameObject("RacePreview");
            previewHost.transform.position = new Vector3(0f, -40f, 0f);
            var preview = previewHost.AddComponent<RacePreviewPresenter>();
            preview.Configure(512, 640);
            WireCreate(createView, create.transform, preview);

            title.SetActive(false);
            create.SetActive(false);

            var hudGo = Panel(canvas.transform, "HUD", new Color(0, 0, 0, 0));
            hudGo.GetComponent<Image>().raycastTarget = false;
            var identity = PlaceLabel(hudGo.transform, "Exile", 22, new Vector2(0f, 1f), new Vector2(20f, -12f), new Vector2(420f, 32f));
            identity.alignment = TextAnchor.MiddleLeft;
            var place = PlaceLabel(hudGo.transform, "Threshold", 16, new Vector2(0f, 1f), new Vector2(20f, -44f), new Vector2(420f, 24f));
            place.alignment = TextAnchor.MiddleLeft;
            var hp = PlaceLabel(hudGo.transform, "50 / 50", 22, new Vector2(0f, 0f), new Vector2(20f, 188f), new Vector2(220f, 32f));
            hp.alignment = TextAnchor.MiddleLeft;
            var gold = PlaceLabel(hudGo.transform, "0", 22, new Vector2(1f, 1f), new Vector2(-16f, -12f), new Vector2(180f, 32f));
            gold.alignment = TextAnchor.MiddleRight;
            var dead = Panel(hudGo.transform, "Dead", new Color(0.1f, 0.05f, 0.05f, 0.85f));
            dead.SetActive(false);
            AddLabel(dead.transform, "You fall", 40, Vector2.zero);
            var retry = AddButton(dead.transform, "Retry", new Vector2(0, -80), () => session.Retry());
            WireHud(hud, identity, place, hp, gold, dead, player, session);
            var skillWheel = hudGo.AddComponent<SkillWheelView>();
            var s1 = PlaceButton(hudGo.transform, "S1", new Vector2(1f, 0f), new Vector2(-148f, 156f), new Vector2(84f, 64f), () => player.TryCastSkill(0));
            var s2 = PlaceButton(hudGo.transform, "S2", new Vector2(1f, 0f), new Vector2(-148f, 84f), new Vector2(84f, 64f), () => player.TryCastSkill(1));
            var s3 = PlaceButton(hudGo.transform, "S3", new Vector2(1f, 0f), new Vector2(-148f, 16f), new Vector2(84f, 64f), () => player.TryCastSkill(2));
            typeof(SkillWheelView).GetField("slotLabels", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                ?.SetValue(skillWheel, new[]
                {
                    s1.GetComponentInChildren<Text>(),
                    s2.GetComponentInChildren<Text>(),
                    s3.GetComponentInChildren<Text>()
                });
            PlaceButton(hudGo.transform, "Attack", new Vector2(1f, 0f), new Vector2(-16f, 16f), new Vector2(116f, 116f), () => player.TryAttack());
            PlaceButton(hudGo.transform, "Sheet", new Vector2(1f, 1f), new Vector2(-16f, -56f), new Vector2(140f, 44f), () => flow.OpenSheet());
            PlaceButton(hudGo.transform, "Town", new Vector2(1f, 1f), new Vector2(-16f, -108f), new Vector2(140f, 44f), () => flow.OpenTown());
            PlaceButton(hudGo.transform, "Save", new Vector2(1f, 1f), new Vector2(-16f, -160f), new Vector2(140f, 44f), () =>
            {
                SaveService.Write(session.ToSave());
                flow.ShowTitle();
            });

            var stick = new GameObject("Stick", typeof(RectTransform), typeof(Image));
            stick.transform.SetParent(hudGo.transform, false);
            var stickRt = stick.GetComponent<RectTransform>();
            stickRt.anchorMin = stickRt.anchorMax = new Vector2(0f, 0f);
            stickRt.pivot = new Vector2(0f, 0f);
            stickRt.anchoredPosition = new Vector2(24f, 24f);
            stickRt.sizeDelta = new Vector2(150f, 150f);
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

            hudGo.SetActive(false);
            splash.SetActive(true);
            splash.transform.SetAsLastSibling();

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
            cam.cullingMask &= ~(1 << RacePreviewPresenter.Layer);
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
            scaler.matchWidthOrHeight = 0.5f;
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

        static void WireTitle(TitleView view, Transform root)
        {
            var heading = PlaceLabel(root, "Ward", 48, new Vector2(0.5f, 1f), new Vector2(0f, -18f), new Vector2(700f, 64f));
            heading.alignment = TextAnchor.MiddleCenter;
            var names = new Text[3];
            var metas = new Text[3];
            var portraits = new RawImage[3];
            var empties = new Text[3];
            var playLabels = new Text[3];
            var deletes = new Button[3];
            var previews = new RacePreviewPresenter[3];
            for (var i = 0; i < 3; i++)
            {
                var slot = i;
                var card = new GameObject("Slot" + i, typeof(RectTransform), typeof(Image));
                card.transform.SetParent(root, false);
                var rt = card.GetComponent<RectTransform>();
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
                rt.pivot = new Vector2(0.5f, 0.5f);
                rt.sizeDelta = new Vector2(400f, 520f);
                rt.anchoredPosition = new Vector2((i - 1) * 440f, -16f);
                card.GetComponent<Image>().color = new Color(0.14f, 0.11f, 0.12f, 0.96f);

                var host = new GameObject("SlotPreview" + i);
                host.transform.position = new Vector3((i - 1) * 6f, -24f, 0f);
                var preview = host.AddComponent<RacePreviewPresenter>();
                preview.Configure(256, 320);
                previews[i] = preview;

                var frame = new GameObject("Portrait", typeof(RectTransform), typeof(RawImage));
                frame.transform.SetParent(card.transform, false);
                var frt = frame.GetComponent<RectTransform>();
                frt.anchorMin = frt.anchorMax = new Vector2(0.5f, 1f);
                frt.pivot = new Vector2(0.5f, 1f);
                frt.anchoredPosition = new Vector2(0f, -16f);
                frt.sizeDelta = new Vector2(240f, 280f);
                var raw = frame.GetComponent<RawImage>();
                raw.texture = preview.Texture;
                raw.color = Color.white;
                raw.enabled = false;
                portraits[i] = raw;

                var empty = PlaceLabel(card.transform, "Empty", 22, new Vector2(0.5f, 1f), new Vector2(0f, -130f), new Vector2(220f, 40f));
                empty.alignment = TextAnchor.MiddleCenter;
                empties[i] = empty;

                names[i] = PlaceLabel(card.transform, "Empty", 24, new Vector2(0.5f, 0f), new Vector2(0f, 148f), new Vector2(360f, 36f));
                names[i].alignment = TextAnchor.MiddleCenter;
                metas[i] = PlaceLabel(card.transform, "No exile yet", 16, new Vector2(0.5f, 0f), new Vector2(0f, 112f), new Vector2(360f, 28f));
                metas[i].alignment = TextAnchor.MiddleCenter;
                metas[i].color = new Color(0.75f, 0.68f, 0.58f);

                var play = PlaceButton(card.transform, "New", new Vector2(0.5f, 0f), new Vector2(0f, 58f), new Vector2(220f, 48f), () => view.Play(slot));
                playLabels[i] = play.GetComponentInChildren<Text>();
                deletes[i] = PlaceButton(card.transform, "Delete", new Vector2(0.5f, 0f), new Vector2(0f, 8f), new Vector2(220f, 42f), () => view.Delete(slot));
            }

            var flags = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
            typeof(TitleView).GetField("names", flags)?.SetValue(view, names);
            typeof(TitleView).GetField("metas", flags)?.SetValue(view, metas);
            typeof(TitleView).GetField("portraits", flags)?.SetValue(view, portraits);
            typeof(TitleView).GetField("empties", flags)?.SetValue(view, empties);
            typeof(TitleView).GetField("playLabels", flags)?.SetValue(view, playLabels);
            typeof(TitleView).GetField("deleteButtons", flags)?.SetValue(view, deletes);
            typeof(TitleView).GetField("previews", flags)?.SetValue(view, previews);
        }

        static void WireCreate(CreateView view, Transform root, RacePreviewPresenter preview)
        {
            var back = PlaceButton(root, "Back", new Vector2(0f, 1f), new Vector2(24f, -20f), new Vector2(150f, 52f), view.OnBack);
            back.GetComponent<RectTransform>().pivot = new Vector2(0f, 1f);
            var heading = PlaceLabel(root, "Create exile", 36, new Vector2(0.5f, 1f), new Vector2(0f, -16f), new Vector2(640f, 56f));
            heading.alignment = TextAnchor.MiddleCenter;

            var nameGo = new GameObject("Name", typeof(RectTransform), typeof(Image), typeof(InputField));
            nameGo.transform.SetParent(root, false);
            var nrt = nameGo.GetComponent<RectTransform>();
            nrt.anchorMin = nrt.anchorMax = new Vector2(0.5f, 1f);
            nrt.pivot = new Vector2(0.5f, 1f);
            nrt.anchoredPosition = new Vector2(0f, -84f);
            nrt.sizeDelta = new Vector2(460f, 52f);
            nameGo.GetComponent<Image>().color = new Color(0.15f, 0.12f, 0.14f);
            var input = nameGo.GetComponent<InputField>();
            var placeholder = AddLabel(nameGo.transform, "Name", 22, Vector2.zero);
            var text = AddLabel(nameGo.transform, "Exile", 22, Vector2.zero);
            text.supportRichText = false;
            input.textComponent = text;
            input.placeholder = placeholder;
            input.text = "Exile";

            var genderRow = new GameObject("Gender", typeof(RectTransform));
            genderRow.transform.SetParent(root, false);
            var grt = genderRow.GetComponent<RectTransform>();
            grt.anchorMin = grt.anchorMax = new Vector2(0.5f, 1f);
            grt.pivot = new Vector2(0.5f, 1f);
            grt.anchoredPosition = new Vector2(0f, -148f);
            grt.sizeDelta = new Vector2(460f, 52f);
            var male = PlaceButton(genderRow.transform, "Male", new Vector2(0.5f, 0.5f), new Vector2(-110f, 0f), new Vector2(180f, 48f), view.OnMale);
            var female = PlaceButton(genderRow.transform, "Female", new Vector2(0.5f, 0.5f), new Vector2(110f, 0f), new Vector2(180f, 48f), view.OnFemale);
            var unisex = PlaceLabel(root, "Unisex form", 22, new Vector2(0.5f, 1f), new Vector2(0f, -156f), new Vector2(400f, 40f));
            unisex.alignment = TextAnchor.MiddleCenter;
            unisex.gameObject.SetActive(false);

            var frame = new GameObject("RacePortrait", typeof(RectTransform), typeof(RawImage));
            frame.transform.SetParent(root, false);
            var frt = frame.GetComponent<RectTransform>();
            frt.anchorMin = frt.anchorMax = new Vector2(0.5f, 0.5f);
            frt.pivot = new Vector2(0.5f, 0.5f);
            frt.anchoredPosition = new Vector2(0f, 8f);
            frt.sizeDelta = new Vector2(300f, 380f);
            var portrait = frame.GetComponent<RawImage>();
            portrait.texture = preview.Texture;
            portrait.color = Color.white;

            PlaceButton(root, "‹", new Vector2(0.5f, 0.5f), new Vector2(-230f, 8f), new Vector2(72f, 72f), view.OnPrevRace);
            PlaceButton(root, "›", new Vector2(0.5f, 0.5f), new Vector2(230f, 8f), new Vector2(72f, 72f), view.OnNextRace);

            var raceName = PlaceLabel(root, "Human", 26, new Vector2(0.5f, 0f), new Vector2(0f, 156f), new Vector2(640f, 36f));
            raceName.alignment = TextAnchor.MiddleCenter;
            var raceIndex = PlaceLabel(root, "1 / 10", 16, new Vector2(0.5f, 0f), new Vector2(0f, 128f), new Vector2(200f, 24f));
            raceIndex.alignment = TextAnchor.MiddleCenter;
            var blurb = PlaceLabel(root, "", 18, new Vector2(0.5f, 0f), new Vector2(0f, 86f), new Vector2(760f, 36f));
            blurb.alignment = TextAnchor.MiddleCenter;
            PlaceButton(root, "Enter the gate", new Vector2(0.5f, 0f), new Vector2(0f, 18f), new Vector2(280f, 56f), view.OnEnter);

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
            typeof(CreateView).GetField("portrait", flags)?.SetValue(view, portrait);
        }

        static Text PlaceLabel(Transform parent, string text, int size, Vector2 anchor, Vector2 pos, Vector2 sizeDelta)
        {
            var label = AddLabel(parent, text, size, pos);
            var rt = label.rectTransform;
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot = anchor;
            rt.anchoredPosition = pos;
            rt.sizeDelta = sizeDelta;
            return label;
        }

        static Button PlaceButton(Transform parent, string label, Vector2 anchor, Vector2 pos, Vector2 size, UnityEngine.Events.UnityAction action)
        {
            var button = AddButton(parent, label, pos, action);
            var rt = button.GetComponent<RectTransform>();
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot = anchor;
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
            return button;
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
