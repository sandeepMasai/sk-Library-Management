# Google Play upload signing (SmartLibDesk)

Package: `com.libdesk.app`

## Required upload key (Play Console — May 2026)

```
SHA1: 36:47:F1:EF:A2:6C:9E:B5:46:EE:45:8F:B4:0E:B0:8F:7E:9D:7F:5D
```

## Other keys (do NOT upload AAB signed with these)

| Source | SHA1 |
|--------|------|
| EAS `upload-keystore.jks` (com.sk245444.libdesk) | `F1:C4:FE:7B:...` |
| EAS “generate new keystore” | `7B:AB:7B:70:...` |
| Local `npm run keystore:generate` | `D1:B9:74:9B:...` |

Your last upload used **F1:C4:FE** — Play rejects it because this app expects **36:47:F1**.

---

## Option A — Find the original `36:47:F1` keystore (best)

Search backups, old laptop, email, teammate, or first machine that created the Play listing.

```bash
keytool -list -v -keystore /path/to/file.jks -alias YOUR_ALIAS
```

When found:

1. Copy to `android/app/upload-keystore.jks`
2. Update `android/key.properties`
3. `npm run keystore:verify` → must show **OK**
4. `npm run build:aab`
5. Upload new AAB to Play

---

## Option B — Upload key reset (if `36:47` keystore is lost)

1. Export certificate from the key you **want** to use (e.g. current EAS key):

```bash
cd frontend/android/app
keytool -export -rfc \
  -keystore upload-keystore.jks \
  -alias "$(grep keyAlias ../key.properties | cut -d= -f2)" \
  -storepass "$(grep storePassword ../key.properties | cut -d= -f2)" \
  -file upload_certificate.pem
```

2. Play Console → **App integrity** → **Request upload key reset**
3. Upload `upload_certificate.pem` (SHA1 `F1:C4:FE:...` after reset approval)
4. Rebuild AAB: `npm run build:aab`
5. Upload to Play

Until Google approves the reset, only **36:47:F1** signed AABs work.

---

## Verify before upload

```bash
npm run keystore:verify
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab | grep SHA1
```

Must match **36:47:F1:EF:...** (or your newly approved key after reset).
