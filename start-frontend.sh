#!/usr/bin/env bash
# Starts the UI on http://localhost:5173 (proxies /api to the backend).
set -e
cd "$(dirname "$0")/frontend"
[ -d node_modules ] || npm install
exec npm run dev
