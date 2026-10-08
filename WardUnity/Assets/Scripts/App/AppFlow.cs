using UnityEngine;
using Ward.Game;
using Ward.UI;

namespace Ward.App
{
    public class AppFlow : MonoBehaviour
    {
        public static AppFlow Instance { get; private set; }

        [SerializeField] GameObject splashPanel;
        [SerializeField] GameObject titlePanel;
        [SerializeField] GameObject createPanel;
        [SerializeField] GameObject hudPanel;
        [SerializeField] GameObject sheetPanel;
        [SerializeField] GameObject townPanel;
        [SerializeField] RunSession runSession;
        [SerializeField] PlayerController player;
        [SerializeField] TouchControls touch;
        [SerializeField] HudView hud;
        [SerializeField] SheetView sheet;
        [SerializeField] TownView town;
        [SerializeField] SkillWheelView skills;
        [SerializeField] Camera mainCamera;
        [SerializeField] Transform cameraRig;

        void Awake()
        {
            Instance = this;
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Screen.autorotateToPortrait = false;
            Screen.autorotateToPortraitUpsideDown = false;
            Screen.autorotateToLandscapeLeft = true;
            Screen.autorotateToLandscapeRight = true;
            Screen.orientation = ScreenOrientation.AutoRotation;
        }

        void Start()
        {
            ShowSplashThenTitle();
        }

        void ShowSplashThenTitle()
        {
            SetOnly(splashPanel);
            Invoke(nameof(ShowTitle), 1.2f);
        }

        public void ShowTitle()
        {
            Time.timeScale = 1f;
            SetOnly(titlePanel);
            titlePanel?.GetComponent<TitleView>()?.Refresh();
        }

        public void ShowCreate()
        {
            SetOnly(createPanel);
        }

        public void StartRun(CharacterData character, SaveSlot save)
        {
            SetOnly(hudPanel);
            if (runSession == null) runSession = FindFirstObjectByType<RunSession>();
            if (player == null) player = FindFirstObjectByType<PlayerController>();
            runSession.Begin(character, save);
            touch?.Bind(player);
            hud?.Bind(player, runSession);
            sheet?.Bind(player);
            town?.Bind(player);
            skills?.Bind(player);
            skills?.AssignDefaultsIfEmpty();
            SaveService.Write(runSession.ToSave());
        }

        public void OpenSheet()
        {
            if (sheetPanel == null) return;
            sheetPanel.SetActive(true);
            sheet?.Refresh();
        }

        public void CloseSheet() => sheetPanel?.SetActive(false);

        public void OpenTown()
        {
            if (townPanel == null) return;
            townPanel.SetActive(true);
            town?.Refresh();
        }

        public void CloseTown() => townPanel?.SetActive(false);

        void LateUpdate()
        {
            if (player == null || hudPanel == null || !hudPanel.activeSelf) return;
            var t = player.transform.position;
            var cam = cameraRig != null ? cameraRig : (mainCamera != null ? mainCamera.transform : Camera.main?.transform);
            if (cam == null) return;
            var target = t + WorldData.CameraOffset;
            cam.position = Vector3.Lerp(cam.position, target, 1f - Mathf.Exp(-6f * Time.deltaTime));
            cam.LookAt(t + Vector3.up * 1.1f);
            if (Time.frameCount % 120 == 0 && runSession != null && !runSession.Dead)
                SaveService.Write(runSession.ToSave());
        }

        void SetOnly(GameObject active)
        {
            splashPanel?.SetActive(active == splashPanel);
            titlePanel?.SetActive(active == titlePanel);
            createPanel?.SetActive(active == createPanel);
            hudPanel?.SetActive(active == hudPanel);
            sheetPanel?.SetActive(false);
            townPanel?.SetActive(false);
        }
    }
}
