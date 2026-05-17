#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLI="npx --yes @railway/cli@latest"

if ! $CLI whoami &>/dev/null; then
  echo "Railway login required. Run:"
  echo "  cd backend && npx @railway/cli login"
  echo "Or set RAILWAY_TOKEN from https://railway.app/account/tokens"
  exit 1
fi

ENV_FILE="${ROOT}/.railway-deploy.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run: node scripts/build-railway-env.js"
  exit 1
fi

echo "Linking service (select/create project if prompted)..."
$CLI link 2>/dev/null || true

echo "Setting variables from .railway-deploy.env..."
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  $CLI variables set "$key=$val" --skip-deploys 2>/dev/null || $CLI variables --set "$key=$val" 2>/dev/null || true
done < "$ENV_FILE"

echo "Deploying..."
$CLI up --detach

echo "Generating public domain..."
$CLI domain 2>/dev/null || true

echo ""
echo "Done. Health check:"
$CLI status 2>/dev/null || true
echo "  curl \$(railway domain)/health"
