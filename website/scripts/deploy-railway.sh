#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLI="npx --yes @railway/cli@latest"
API_URL="${VITE_API_URL:-https://sk-library-management-production.up.railway.app}"
SERVICE="${RAILWAY_WEBSITE_SERVICE:-}"

if ! $CLI whoami &>/dev/null; then
  echo "Login first: npx @railway/cli login"
  echo "Or: export RAILWAY_TOKEN=... from https://railway.app/account/tokens"
  exit 1
fi

if [[ -z "$SERVICE" ]]; then
  echo "Set website service name/ID:"
  echo "  export RAILWAY_WEBSITE_SERVICE=your-service-name"
  echo "Find it in Railway → website service → Settings"
  exit 1
fi

echo "Setting VITE_API_URL=$API_URL on service $SERVICE ..."
$CLI variables set "VITE_API_URL=${API_URL}" --service "$SERVICE" --skip-deploys

echo "Deploying website..."
$CLI up --detach --service "$SERVICE"

echo "Done. Open Railway → Networking → Generate Domain if needed."
