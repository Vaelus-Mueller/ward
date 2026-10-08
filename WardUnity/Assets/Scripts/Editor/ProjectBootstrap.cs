#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;

namespace Ward.EditorTools
{
    /// <summary>Ensures the Boot scene is in the build list. Uses the built-in render pipeline.</summary>
    [InitializeOnLoad]
    public static class ProjectBootstrap
    {
        static ProjectBootstrap()
        {
            EditorApplication.delayCall += Ensure;
        }

        [MenuItem("Ward/Ensure Project Setup")]
        public static void Ensure()
        {
            const string path = "Assets/Scenes/Boot.unity";
            if (!File.Exists(path))
            {
                Directory.CreateDirectory("Assets/Scenes");
                var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, path);
            }
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(path, true) };
        }
    }
}
#endif
