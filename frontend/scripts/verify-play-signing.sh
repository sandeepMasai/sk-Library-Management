#!/usr/bin/env bash
# Verify local upload keystore SHA1 matches Google Play Console expected upload key.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
APP="$ANDROID/app"

# Google Play Console → App signing → Upload key certificate → SHA-1
EXPECTED_SHA1="${PLAY_EXPECTED_SHA1:-F1:C4:FE:7B:2E:AA:96:CF:C8:AA:02:AF:C3:54:10:08:7F:7B:B2:D1}"
EXPECTED_NORM="$(echo "$EXPECTED_SHA1" | tr '[:lower:]' '[:upper:]' | tr -d ' ')"

export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || echo /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home)}"

load_props() {
  local f="$1"
  [ -f "$f" ] || return 1
  STORE_FILE="$(grep -E '^storeFile=' "$f" | cut -d= -f2- | tr -d '\r')"
  STORE_PASS="$(grep -E '^storePassword=' "$f" | cut -d= -f2- | tr -d '\r')"
  KEY_ALIAS="$(grep -E '^keyAlias=' "$f" | cut -d= -f2- | tr -d '\r')"
}

PROPS=""
for candidate in "$ANDROID/key.properties" "$ANDROID/keystore.properties"; do
  if load_props "$candidate"; then
    PROPS="$candidate"
    break
  fi
done

if [ -z "$PROPS" ]; then
  echo "ERROR: Missing android/key.properties or android/keystore.properties"
  exit 1
fi

if [[ "$STORE_FILE" = /* ]]; then
  KS="$STORE_FILE"
else
  KS="$APP/$STORE_FILE"
fi

if [ ! -f "$KS" ]; then
  echo "ERROR: Keystore not found: $KS"
  exit 1
fi

echo "Using properties: $PROPS"
echo "Keystore: $KS"
echo "Alias: $KEY_ALIAS"
echo "Expected Play SHA1: $EXPECTED_SHA1"
echo ""

OUT="$(keytool -list -v -keystore "$KS" -alias "$KEY_ALIAS" -storepass "$STORE_PASS" 2>&1)"
ACTUAL="$(echo "$OUT" | grep -E 'SHA1:' | head -1 | sed 's/.*SHA1: //' | tr -d ' ')"
ACTUAL_NORM="$(echo "$ACTUAL" | tr '[:lower:]' '[:upper:]')"

echo "Actual keystore SHA1:   $ACTUAL"
echo ""

if [ "$ACTUAL_NORM" = "$EXPECTED_NORM" ]; then
  echo "OK — SHA1 matches Google Play upload key."
  exit 0
fi

echo "MISMATCH — this keystore is NOT the Play upload key."
echo ""
echo "Known fingerprints from this project:"
echo "  Local upload-keystore.jks (current): D1:B9:74:9B:B8:A5:FC:01:ED:CA:DF:1D:42:BF:C4:B8:C1:B7:74:67"
echo "  EAS-generated (wrong upload):        7B:AB:7B:70:4F:A6:53:D2:F0:9F:69:2F:76:EF:8F:02:88:37:F2:16"
echo ""
echo "Fix:"
echo "  1. Find the original .jks used for first Play upload (SHA1 above)."
echo "  2. Copy it to android/app/upload-keystore.jks (or set storeFile in key.properties)."
echo "  3. Update passwords/alias in android/key.properties."
echo "  4. Run: npm run keystore:verify"
echo "  5. For EAS: eas credentials → Android → production → Use existing keystore."
exit 1
