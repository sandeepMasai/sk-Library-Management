#!/usr/bin/env bash
# Frees disk before Android release builds (fixes "No space left on device").
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Disk before cleanup ==="
df -h / | tail -1

pkill -9 -f GradleDaemon 2>/dev/null || true
pkill -9 -f gradlew 2>/dev/null || true
sleep 1

if [ -d "$ROOT/android" ]; then
  export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 17 2>/dev/null || true)}"
  (cd "$ROOT/android" && ./gradlew --stop 2>/dev/null) || true
fi

echo "Cleaning project Android build folders..."
rm -rf "$ROOT/android/app/build" "$ROOT/android/build" "$ROOT/android/.gradle"
find "$ROOT/node_modules" -type d -name ".gradle" -prune -exec rm -rf {} + 2>/dev/null || true

echo "Cleaning user Gradle caches (~/.gradle/caches) — saves many GB..."
rm -rf "$HOME/.gradle/caches" "$HOME/.gradle/daemon" 2>/dev/null || true

echo "Cleaning Expo / Metro temp caches..."
rm -rf "$ROOT/.expo" "$TMPDIR"/metro-* "$TMPDIR"/haste-map-* 2>/dev/null || true

echo "=== Disk after cleanup ==="
df -h / | tail -1
AVAIL=$(df -k / | tail -1 | awk '{print $4}')
if [ "${AVAIL:-0}" -lt 5242880 ]; then
  echo ""
  echo "WARNING: Less than 5 GB free. Free more space (Trash, Downloads, Android Studio SDK old images), then run: npm run build:aab"
  exit 1
fi
echo "OK — enough space to try build:aab"
