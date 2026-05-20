# Google Play upload signing (SmartLibDesk)

Package: `com.smartlibdesk.app`

## Expected upload key (Play Console)

```
SHA1: F1:C4:FE:7B:2E:AA:96:CF:C8:AA:02:AF:C3:54:10:08:7F:7B:B2:D1
```

## Wrong keys (do not use)

| Source | SHA1 |
|--------|------|
| EAS "Generate new keystore" (2026-05-19) | `7B:AB:7B:70:4F:A6:53:D2:F0:9F:69:2F:76:EF:8F:02:88:37:F2:16` |
| Local `upload-keystore.jks` (npm run keystore:generate) | `D1:B9:74:9B:B8:A5:FC:01:ED:CA:DF:1D:42:BF:C4:B8:C1:B7:74:67` |

## Fix steps

1. Locate the **original** upload `.jks` / `.keystore` (backup, old laptop, teammate, password manager).
2. Copy it to `android/app/upload-keystore.jks` (or set absolute path in `key.properties`).
3. Edit `android/key.properties` with correct `storePassword`, `keyAlias`, `keyPassword`.
4. Verify:

   ```bash
   npm run keystore:verify
   ```

5. Build signed AAB locally:

   ```bash
   npm run build:aab
   ```

   Output: `android/app/build/outputs/bundle/release/app-release.aab`

6. **EAS Build:** upload the same keystore to Expo (do not generate a new one):

   ```bash
   eas credentials
   ```

   → Android → production → Keystore → **Upload existing keystore**

7. Upload AAB in [Google Play Console](https://play.google.com/console) → Release → Production.

## Verify any keystore file

```bash
keytool -list -v -keystore /path/to/your.keystore -alias YOUR_ALIAS
```

Compare the **SHA1** line with Play Console.

## Lost upload key?

Play Console → **App integrity** → **Request upload key reset** (Google approval required). Do not generate another random keystore until reset is approved.
