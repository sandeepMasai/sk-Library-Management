#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v vercel &>/dev/null && ! npx vercel --version &>/dev/null 2>&1; then
  echo "Installing Vercel CLI..."
fi

CLI="npx vercel"

if ! $CLI whoami &>/dev/null 2>&1; then
  echo "Login first:"
  echo "  npx vercel login"
  exit 1
fi

echo "Deploying website/ to Vercel (production)..."
echo "Ensure VITE_API_URL is set in Vercel project settings."
echo ""

$CLI --prod

echo ""
echo "After deploy: add Vercel URL to Railway backend ALLOWED_ORIGINS + WEBSITE_URL"
