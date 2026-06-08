# Google Play Store — SmartLibDesk (AAB)

Play Store needs **AAB** (Android App Bundle), not APK.

---

## Option A — Build on your Mac (fast if Android SDK is set up)

```bash
cd frontend
npm run build:aab
```

**Output file:**

```
frontend/android/app/build/outputs/bundle/release/app-release.aab
```

Copy for upload:

```bash
mkdir -p dist
cp android/app/build/outputs/bundle/release/app-release.aab dist/SmartLibDesk-v1.0.2.aab
```

---

## Option B — Expo EAS cloud build (no local Android SDK)

1. Install & login:

```bash
npm install -g eas-cli
cd frontend
eas login
```

2. Build production AAB:

```bash
npm run build:play
```

(or `eas build --platform android --profile production`)

If EAS fails with **Gradle / Run gradlew** error, ensure `android/app/build.gradle` does not require local `key.properties` on EAS (signing comes from Expo credentials). Re-run after pulling latest code.

3. When finished, download from the link in terminal or:

```bash
eas build:download --platform android --profile production --latest
```

---

## Upload to Play Console

1. [Google Play Console](https://play.google.com/console) → **Create app** (if new).
2. **Release** → **Production** (or **Internal testing** first).
3. **Create new release** → Upload **`SmartLibDesk-v1.0.2.aab`** (or `app-release.aab`).
4. Fill **Release notes**, content rating, privacy policy URL:
   - `https://www.smartlibdesk.in/privacy-policy`
5. **Store listing**: screenshots, description, icon (512×512).
6. **App signing**: use **Google Play App Signing** (recommended). Upload key must match your keystore (`android/key.properties`).

---

## Version numbers (each Play upload)

Edit `frontend/android/app/build.gradle`:

```gradle
versionCode 4        // increase by 1 every upload
versionName "1.0.3"  // user-visible version
```

Also update `frontend/app.json` → `"version": "1.0.3"`.

Then rebuild AAB.

---

## Signing

Local builds use `android/key.properties` + upload keystore.  
Verify SHA1 matches Play Console:

```bash
npm run keystore:verify
```

---

## Checklist before publish

- [ ] Railway: live Razorpay keys (`rzp_live_*`)
- [ ] `EXPO_PUBLIC_API_URL` = production Railway URL (in `eas.json` / `.env`)
- [ ] Privacy policy live: https://www.smartlibdesk.in/privacy-policy
- [ ] Test login + payment on a real device build
- [ ] `versionCode` increased vs last Play upload

---

## Package name

`com.libdesk.app` — must match Play Console app id.
