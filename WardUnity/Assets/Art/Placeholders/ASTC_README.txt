Android texture imports for WardUnity should use ASTC (Unity default on modern Android).

In the Editor: select textures → Inspector → Override for Android → Format: ASTC 6x6 (or 4x4 for hero albedo).
PlayerSettings already prefer ASTC via m_BuildTargetDefaultTextureCompressionFormat.
