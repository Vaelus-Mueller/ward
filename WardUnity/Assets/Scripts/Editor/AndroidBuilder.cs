#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Ward.EditorTools
{
    public static class AndroidBuilder
    {
        const string DriveApk = @"G:\My Drive\Ward\releases\apk\ward-debug.apk";
        const string DriveAab = @"G:\My Drive\Ward\releases\apk\ward-release.aab";
        const string KeystoreRel = "UserSettings/ward-upload.keystore";

        [MenuItem("Ward/Build Android APK (Debug)")]
        public static void BuildDebugApk()
        {
            EnsureAndroidSettings(appBundle: false, useUploadKeystore: false);
            var outDir = Path.Combine(Directory.GetParent(Application.dataPath)!.FullName, "Builds");
            Directory.CreateDirectory(outDir);
            var apkPath = Path.Combine(outDir, "ward-debug.apk");

            var opts = new BuildPlayerOptions
            {
                scenes = new[] { "Assets/Scenes/Boot.unity" },
                locationPathName = apkPath,
                target = BuildTarget.Android,
                options = BuildOptions.Development | BuildOptions.AllowDebugging
            };

            var report = BuildPipeline.BuildPlayer(opts);
            if (report.summary.result != BuildResult.Succeeded)
            {
                Debug.LogError($"Ward Android build failed: {report.summary.result}");
                EditorApplication.Exit(1);
                return;
            }

            TryCopyToDrive(apkPath, DriveApk);
            Debug.Log($"Ward APK ready: {apkPath}");
            if (Application.isBatchMode) EditorApplication.Exit(0);
        }

        [MenuItem("Ward/Build Android AAB (Release signed)")]
        public static void BuildReleaseAab()
        {
            EnsureAndroidSettings(appBundle: true, useUploadKeystore: true);
            var outDir = Path.Combine(Directory.GetParent(Application.dataPath)!.FullName, "Builds");
            Directory.CreateDirectory(outDir);
            var aabPath = Path.Combine(outDir, "ward-release.aab");
            var opts = new BuildPlayerOptions
            {
                scenes = new[] { "Assets/Scenes/Boot.unity" },
                locationPathName = aabPath,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };
            var report = BuildPipeline.BuildPlayer(opts);
            if (report.summary.result == BuildResult.Succeeded)
            {
                TryCopyToDrive(aabPath, DriveAab);
                Debug.Log($"Ward AAB ready (Play upload keystore): {aabPath}");
            }
            else
                Debug.LogError($"AAB failed: {report.summary.result}");
            if (Application.isBatchMode)
                EditorApplication.Exit(report.summary.result == BuildResult.Succeeded ? 0 : 1);
        }

        static void EnsureAndroidSettings(bool appBundle, bool useUploadKeystore)
        {
            PlayerSettings.companyName = "Vaelus";
            PlayerSettings.productName = "Ward";
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.vaelus.arpg");
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.Android.bundleVersionCode = 3;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = (AndroidSdkVersions)36;
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.forceSDCardPermission = false;
            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;
            EditorUserBuildSettings.buildAppBundle = appBundle;

            if (useUploadKeystore)
                EnsureUploadKeystore();
            else
            {
                PlayerSettings.Android.useCustomKeystore = false;
            }

            if (!File.Exists("Assets/Scenes/Boot.unity"))
                CreateBootScene();
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene("Assets/Scenes/Boot.unity", true)
            };
        }

        static void EnsureUploadKeystore()
        {
            var projectRoot = Directory.GetParent(Application.dataPath)!.FullName;
            var keystore = Path.Combine(projectRoot, KeystoreRel);
            Directory.CreateDirectory(Path.GetDirectoryName(keystore)!);
            const string pass = "ward-upload-local";
            const string alias = "ward";
            if (!File.Exists(keystore))
            {
                if (!TryCreateKeystoreWithKeytool(keystore, pass, alias))
                {
                    Debug.LogWarning("keytool unavailable — AAB will use Unity debug signing.");
                    PlayerSettings.Android.useCustomKeystore = false;
                    return;
                }
            }
            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = keystore.Replace('\\', '/');
            PlayerSettings.Android.keystorePass = pass;
            PlayerSettings.Android.keyaliasName = alias;
            PlayerSettings.Android.keyaliasPass = pass;
        }

        static bool TryCreateKeystoreWithKeytool(string keystore, string pass, string alias)
        {
            var keytool = FindKeytool();
            if (keytool == null) return false;
            var args =
                $"-genkeypair -v -keystore \"{keystore}\" -storepass {pass} -alias {alias} " +
                $"-keypass {pass} -keyalg RSA -keysize 2048 -validity 10000 " +
                "-dname \"CN=Ward, OU=Vaelus, O=Vaelus, L=Unknown, ST=Unknown, C=US\"";
            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = keytool,
                Arguments = args,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            using var p = System.Diagnostics.Process.Start(psi);
            p?.WaitForExit(120000);
            return File.Exists(keystore);
        }

        static string FindKeytool()
        {
            var candidates = new[]
            {
                Path.Combine(EditorApplication.applicationContentsPath, "PlaybackEngines", "AndroidPlayer", "OpenJDK", "bin", "keytool.exe"),
                Path.Combine(EditorApplication.applicationContentsPath, "PlaybackEngines", "AndroidPlayer", "OpenJDK", "bin", "keytool"),
            };
            foreach (var c in candidates)
                if (File.Exists(c)) return c;
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "where",
                    Arguments = "keytool",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true
                };
                using var p = System.Diagnostics.Process.Start(psi);
                var path = p?.StandardOutput.ReadLine();
                p?.WaitForExit(5000);
                if (!string.IsNullOrWhiteSpace(path) && File.Exists(path.Trim())) return path.Trim();
            }
            catch { /* ignore */ }
            return null;
        }

        static void CreateBootScene()
        {
            Directory.CreateDirectory("Assets/Scenes");
            var scene = UnityEditor.SceneManagement.EditorSceneManager.NewScene(
                UnityEditor.SceneManagement.NewSceneSetup.DefaultGameObjects,
                UnityEditor.SceneManagement.NewSceneMode.Single);
            // RuntimeBootstrap auto-runs; empty scene is enough.
            UnityEditor.SceneManagement.EditorSceneManager.SaveScene(scene, "Assets/Scenes/Boot.unity");
        }

        static void TryCopyToDrive(string srcPath, string destPath)
        {
            try
            {
                var dir = Path.GetDirectoryName(destPath);
                if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                File.Copy(srcPath, destPath, true);
                Debug.Log($"Copied to {destPath} ({new FileInfo(destPath).Length / (1024f * 1024f):0.0} MB)");
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"Drive copy skipped: {ex.Message}");
            }
        }

        // Batchmode entry: -executeMethod Ward.EditorTools.AndroidBuilder.BuildDebugApk
    }
}
#endif
