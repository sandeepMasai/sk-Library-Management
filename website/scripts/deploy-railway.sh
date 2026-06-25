#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLI="npx --yes @railway/cli@latest"
API_URL="${VITE_API_URL:-https://api.smartlibdesk.in}"
SERVICE="${RAILWAY_WEBSITE_SERVICE:-8bab4f3f-ec5d-41a3-83d3-66bf0bfe2bcc}"

if ! $CLI whoami &>/dev/null; then
  echo "Login first: npx @railway/cli login"
  echo "Or: export RAILWAY_TOKEN=... from https://railway.app/account/tokens"
  exit 1
fi

echo "Setting VITE_API_URL=$API_URL on service $SERVICE ..."
$CLI variables set "VITE_API_URL=${API_URL}" --service "$SERVICE" --skip-deploys

echo "Deploying website..."
$CLI up --detach --service "$SERVICE"

echo "Done. Open Railway → Networking → Generate Domain if needed."
