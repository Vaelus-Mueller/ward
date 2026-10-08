# WardUnity

Native **Unity** client for Ward’s Google Play path (built-in render pipeline, IL2CPP, ARM64, ASTC on Android). The bundled URP 17.6 package in Unity 6000.6.4f1 does not compile against this editor, so the ship build stays on the built-in pipeline.

The Capacitor / Three.js tree under the repo root remains the design reference until this client reaches parity.

## Open

1. Install **Unity Hub** + **Unity 6000.6 LTS** with **Android Build Support** (SDK, NDK, OpenJDK), or use the extracted editor under `%LOCALAPPDATA%\Programs\Unity\Hub\Editor\6000.6.4f1`.
2. Sign in once: `unity auth login` then `unity license activate --personal --accept-eula` (Unity CLI under `%LOCALAPPDATA%\Unity\bin\unity.exe`).
3. Hub / Editor → Open → this `WardUnity` folder.

## Play in Editor

Enter Play. `RuntimeBootstrap` builds a small stone room, the authored race meshes, title/create/HUD, touch stick, two packs, sheet, and town.

## Android APK + AAB

Menu **Ward → Build Android APK (Debug)** / **AAB (Release signed)**, or ship both:

```powershell
powershell -File Tools/ship-android.ps1
```

Also: `Tools/build-android.ps1` (APK only), `Tools/build-aab.ps1` (AAB only).

Outputs: `Builds/ward-debug.apk`, `Builds/ward-release.aab`, copied to `G:\My Drive\Ward\releases\apk\`.

## Release AAB (Play)

Menu **Ward → Build Android AAB (Release signed)** or:

```powershell
powershell -File Tools/build-aab.ps1
```

Creates `UserSettings/ward-upload.keystore` on first run (gitignored), signs the AAB, writes `Builds/ward-release.aab`, and copies to `G:\My Drive\Ward\releases\apk\ward-release.aab`. Prefer Play App Signing for store uploads; keep this keystore as the upload key.

`applicationId`: `com.vaelus.arpg` · `versionName` 0.1.0 · `targetSdk` 36 · `minSdk` 26 (this Unity editor rejects API 24) · **ARM64 IL2CPP** · ASTC textures.
