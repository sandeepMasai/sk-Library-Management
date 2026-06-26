#!/usr/bin/env bash
# Install pritamkumars-organization libdesk upload keystore for Play signing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
APP="$ANDROID/app"
DOWNLOADS="${HOME}/Downloads"

# Expo often names the file like this when downloaded from credentials page:
CANDIDATES=(
  "$DOWNLOADS/dowanlod/@pritamkumars-organization__libdesk-keystore.bak.jks"
  "$DOWNLOADS/@pritamkumars-organization__libdesk-keystore.bak.jks"
  "$DOWNLOADS/@pritamkumars-organization__libdesk.jks"
  "$DOWNLOADS/pritamkumars-organization__libdesk.jks"
  "$DOWNLOADS/libdesk.jks"
  "$DOWNLOADS/upload-keystore.jks"
)

SRC=""
for c in "${CANDIDATES[@]}"; do
  if [ -f "$c" ]; then
    SRC="$c"
    break
  fi
done

if [ -z "$SRC" ]; then
  echo "ERROR: Keystore .jks file not found in Downloads."
  echo ""
  echo "You have credentials.md but also need the binary keystore file."
  echo "Download from Expo:"
  echo "  https://expo.dev/accounts/pritamkumars-organization/projects/libdesk/credentials"
  echo "  → Android → Keystore → Download"
  echo ""
  echo "Save as one of:"
  printf '  - %s\n' "${CANDIDATES[@]}"
  exit 1
fi

cp "$SRC" "$APP/upload-keystore.jks"
cp "$ANDROID/key.properties.pritam.example" "$ANDROID/key.properties"
cp "$ANDROID/key.properties" "$ANDROID/keystore.properties"

export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || echo /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home)}"
echo "Installed: $APP/upload-keystore.jks"
echo ""
keytool -list -v -keystore "$APP/upload-keystore.jks" \
  -alias 6ea00d083879849ea23ef89b52551675 \
  -storepass cc76e4842fb3ff6ac859971f7ed98a18 2>&1 | grep SHA1

echo ""
cd "$ROOT" && npm run keystore:verify
