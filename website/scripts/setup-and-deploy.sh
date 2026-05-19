#!/usr/bin/env bash
# One-command website deploy (run in your terminal after Railway login).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLI="npx --yes @railway/cli@latest"
API_URL="${VITE_API_URL:-https://sk-library-management-production.up.railway.app}"
SERVICE="${RAILWAY_WEBSITE_SERVICE:-website}"

echo "=== SmartLibDesk website → Railway ==="
echo ""

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  if ! $CLI whoami &>/dev/null; then
    echo "Step 1: Login to Railway (browser will open)"
    $CLI login
  fi
else
  export RAILWAY_TOKEN
  echo "Using RAILWAY_TOKEN from environment"
fi

echo ""
echo "Step 2: Link to your website service"
echo "  → Select the SAME project as backend (sk-library-management)"
echo "  → Select or create service named: ${SERVICE}"
echo "  → If creating new: set Root Directory = website in Railway Settings after"
read -r -p "Press Enter when linked (or if already linked)..."

echo ""
echo "Step 3: Set VITE_API_URL and deploy"
$CLI variables set "VITE_API_URL=${API_URL}" --service "$SERVICE" --skip-deploys 2>/dev/null || \
  $CLI variables set "VITE_API_URL=${API_URL}" --skip-deploys

$CLI up --detach --service "$SERVICE" 2>/dev/null || $CLI up --detach

echo ""
echo "Step 4: Generate domain (if needed)"
$CLI domain --service "$SERVICE" 2>/dev/null || $CLI domain 2>/dev/null || true

echo ""
echo "Done! Open Railway → your website service → Networking for the public URL."
echo "Then set on BACKEND service:"
echo "  ALLOWED_ORIGINS=https://YOUR-WEBSITE.up.railway.app"
echo "  WEBSITE_URL=https://YOUR-WEBSITE.up.railway.app"
