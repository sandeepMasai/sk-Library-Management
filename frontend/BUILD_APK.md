# SmartLibDesk Android APK

## Ready APK (phone install)

File:

```
frontend/dist/SmartLibDesk-v1.0.2.apk
```

(~54 MB · package `com.libdesk.app` · API: Railway production)

## Install on phone

1. Copy `SmartLibDesk-v1.0.2.apk` to your phone (USB, AirDrop, Google Drive, WhatsApp).
2. Open the file on the phone → **Install**.
3. If blocked: **Settings → Security → Install unknown apps** → allow your file manager / Chrome.
4. Open **SmartLibDesk** → login → subscription / payments use live keys from the server after you set them on Railway.

## Build a new APK (on your Mac)

```bash
cd frontend
npm install
npm run build:apk
```

Output:

```
android/app/build/outputs/apk/release/app-release.apk
```

Copy to `dist/`:

```bash
cp android/app/build/outputs/apk/release/app-release.apk dist/SmartLibDesk-v1.0.2.apk
```

Requirements: Java 17, Android SDK (`ANDROID_HOME`), `android/key.properties` with upload keystore.

## Cloud build (Expo EAS) — optional

```bash
cd frontend
npx eas login
npm run build:expo-apk
npm run download:expo-apk
```

Needs Expo account linked to project `8bde25ff-7919-4ae3-aef4-f36e1b0a1292`.

## Notes

- APK uses `EXPO_PUBLIC_API_URL` from `frontend/.env` at build time (currently production Railway).
- Razorpay keys are **not** in the APK — they come from the backend when you pay.
- For Play Store use `npm run build:play` (AAB, not APK).
