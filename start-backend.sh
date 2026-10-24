#!/usr/bin/env bash
# Starts the API on http://localhost:8000 (creates a virtualenv on first run).
set -e
cd "$(dirname "$0")/backend"
[ -d venv ] || python3 -m venv venv
. venv/bin/activate
pip install -q -r requirements.txt
exec uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --reload-dir app