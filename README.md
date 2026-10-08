# Ward

Early alpha.

Ward is a touch-first action RPG. You hold a ruined gate: move, strike, and spend what you earn.

It is an original game. The shape of the systems follows three references, without using their stories, items, or names:

- **Oniro** — one character, several class paths, and a mix of passives, actives, auras, and channels. Three skills can be readied. Landing hits shortens cooldowns, so standing still is the weak choice.
- **Diablo II** — each level gives 5 attribute points and 1 skill point. Points wait until you spend them. Attributes are Strength, Agility, Endurance, and Wisdom.
- **Diablo I** — readable melee, life and mana, and positioning. Enemy slams are telegraphed so you walk out of them.

Bulwark, Shade, and Rite are the three spokes of the skill wheel. At level 2 you can open a spoke. A specialization on that spoke asks for level 6 and four points already spent in the spoke. The outer skill asks for level 10 and four points in the specialization. Those gates are early on purpose so a single session can reach them.

The ward is now a 3D dark-fantasy dungeon. Models are Kay Lousberg's KayKit packs (CC0): a knight, rogue, and mage for the exile, and skeletons for the things that walk the ward. Floor, walls, and columns are from the same dungeon pack. See `public/models/CREDITS.txt`.

Ward does not include Oniro's art, models, or writing. The interface is the original stone-and-ember layout: life and mana, three skill slots, the stick, and the skill wheel.

**Google Play ship path is Unity** (`WardUnity/`: URP, IL2CPP, ARM64). This Capacitor / Three.js tree stays as the design reference until the Unity client reaches parity.

Play the web prototype with `npm run dev`. Legacy Capacitor debug APKs still build via `npm run android:sync` + Gradle. Prefer `WardUnity/Tools/build-android.ps1` for native Play installs.

Install Node.js 22 or newer, then from this folder:

```powershell
npm install
npm test
npm run dev
```

Open the address Vite prints. On a phone-sized window, use the stick and the buttons. On a keyboard: WASD, click the ground, click an enemy, Space to attack, 1–3 for skills, C / K / I for character, skills, and pack.

## Android package for Google Play

The store build is an Android App Bundle produced from the `android` project. New Play submissions need to target **Android 16 (API 36)**.

1. Install Android Studio and the Android SDK 36 platform.
2. `npm run build`
3. `npm run android:add` the first time, then `npm run android:sync` after every web change.
4. Confirm `android/variables.gradle` still says `compileSdkVersion` and `targetSdkVersion` **36**, and `minSdkVersion` **24**. That matches Google Play’s target for new apps.
5. `npm run android:open`
6. Build a signed **Android App Bundle** (Build > Generate Signed Bundle). Save the upload keystore somewhere you can back up. Play Console will ask for it on every upload.
7. Create the app in Play Console. Upload the `.aab`. Complete the store listing, content rating (fantasy violence, no realistic gore), and Data safety. Declare that no data is collected, and host the in-game privacy statement at a public URL for the listing.

A 512×512 icon for the Play listing is at `store/icon-512.png`. The `INTERNET` permission is there because the Android shell loads the game through a local WebView. The game itself does not open network connections.

The app id is `com.vaelus.arpg`. Change it before the first upload if you want a different package name. After the first upload it cannot change.

This early alpha is the playable foundation: combat, the wheel, level-up attributes, and loot. Store art, audio, and a longer campaign are still ahead.
