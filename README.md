# Ward

Early alpha.

Ward is a touch-first action RPG. You hold a ruined gate: move, strike, and spend what you earn.

It is an original game. The shape of the systems follows three references, without using their stories, items, or names:

- **Oniro** — one character, mixed skill kinds, three ready skills, hit-charged tempo.
- **Diablo II** — level-up spendable points and loot depth.
- **Diablo I** — readable melee and telegraphed enemy hits.

Attributes are Strength, Agility, Stamina, Luck, and Spirit. Skills spend **energy** charged from basic-attack hits (no timed skill cooldowns). The skill wheel has seven damage-pair cones (bleed, holy, air, fire, water, poison, unholy).

The ward is a 3D dark-fantasy dungeon. Models are Kay Lousberg's KayKit packs (CC0). Floor textures include Poly Haven CC0 materials. See `public/models/CREDITS.txt`.

Skill-button and skill-wheel icons use CC0 packs:

- **Viktor** — RPG skill icons (CC0), [itch](https://v-ktor.itch.io/rpg-skill-icons) / [OpenGameArt](https://opengameart.org/content/rpg-icons-3)
- **496 LPC fantasy icons** (CC0 / public domain), [Liberated Pixel Cup](https://lpc.opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg)

See `public/icons/CREDITS.txt`.

Ward does not include Oniro's art, models, or writing. The interface is the original stone-and-ember layout: life and energy, three skill slots, the stick, and the skill wheel.

Play it on this computer with `npm run dev`. A phone build is a debug APK after `npm run android:sync` and a Gradle debug build.

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
