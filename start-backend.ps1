# Starts the API on http://localhost:8000 (creates a virtualenv on first run).
Set-Location "$PSScriptRoot\backend"
if (-not (Test-Path venv)) { python -m venv venv }
& .\venv\Scripts\python.exe -m pip install -q -r requirements.txt
& .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --reload-dir app