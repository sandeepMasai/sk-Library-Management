#!/usr/bin/env bash
# Print Mac LAN IP for Metro / dev client (Wi‑Fi en0, else en1).
set -e
for iface in en0 en1; do
  ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  if [ -n "$ip" ]; then
    echo "$ip"
    exit 0
  fi
done
echo "127.0.0.1"
