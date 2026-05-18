#!/usr/bin/env bash
# Creates Play Store upload keystore (once). BACK UP upload-keystore.jks + passwords.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/android/app"
KS="$APP_DIR/upload-keystore.jks"
PROPS="$ROOT/android/keystore.properties"
CREDS="$ROOT/android/PLAY_UPLOAD_KEY_BACKUP.txt"

if [ -f "$KS" ] && [ -f "$PROPS" ]; then
  echo "Upload keystore already exists: $KS"
  echo "To rebuild AAB: npm run build:aab"
  exit 0
fi

export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || true)}"
PASS="${KEYSTORE_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)}"

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$KS" \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$PASS" \
  -keypass "$PASS" \
  -dname "CN=SmartLibDesk, OU=Mobile, O=SK Library, L=India, ST=India, C=IN"

cat > "$PROPS" <<EOF
storeFile=upload-keystore.jks
storePassword=$PASS
keyAlias=upload
keyPassword=$PASS
EOF

cat > "$CREDS" <<EOF
PLAY STORE UPLOAD KEY — keep safe (never commit to git)
Keystore file: android/app/upload-keystore.jks
Alias: upload
Store password: $PASS
Key password: $PASS
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

chmod 600 "$PROPS" "$CREDS" 2>/dev/null || true
echo ""
echo "Created upload keystore + android/keystore.properties"
echo "BACKUP saved to: android/PLAY_UPLOAD_KEY_BACKUP.txt"
echo "Run: npm run build:aab"
