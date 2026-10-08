#!/usr/bin/env bash
# ===========================================================================
# sorani-ai: one-command local production start (no Docker required).
# Starts the API (port 4000) + web (port 3000) + a public tunnel, then prints
# the public URL. For a PERMANENT address, use a named tunnel (see
# deploy/cloudflared/config.yml) or deploy to a VPS/PaaS.
#
# Usage:  bash deploy/start-all.sh
# ===========================================================================
set -e
# Node 20 is installed system-wide under C:/Program Files/nodejs (in PATH).
# (Old override below kept for reference; not needed now.)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p /tmp/sorani-logs
echo "==> Starting API (port 4000)"
(nohup node apps/api/dist/index.js > /tmp/sorani-logs/api.log 2>&1 &)
sleep 3

echo "==> Starting Web (port 3000)"
(cd apps/web && nohup node ../../node_modules/next/dist/bin/next start -p 3000 > /tmp/sorani-logs/web.log 2>&1 &)
sleep 3

echo "==> Starting public tunnel (quick tunnel — EPHEMERAL URL)"
CLOUDFLARED="$(command -v cloudflared || echo /tmp/cloudflared.exe)"
("$CLOUDFLARED" tunnel --url http://localhost:3000 --no-autoupdate > /tmp/sorani-logs/tunnel.log 2>&1 &)
sleep 8

echo ""
echo "Public URL (temporary):"
grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/sorani-logs/tunnel.log | head -1
echo ""
echo "Local URLs:  http://localhost:3000  (web)   http://localhost:4000/api/health  (api)"
echo ""
echo "For a PERMANENT address: run the named-tunnel guide in deploy/cloudflared/config.yml"
