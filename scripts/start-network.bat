@echo off
:: Chakravyuh — Network Mode Launcher
:: Starts both backend and frontend accessible from any device on the same WiFi.
::
:: Your current WiFi IP: 192.168.1.93
::   Frontend → http://192.168.1.93:3000
::   Backend  → http://192.168.1.93:8000
::   API docs → http://192.168.1.93:8000/docs
::
:: If your IP changes, update:
::   1. apps/web/.env.local        (NEXT_PUBLIC_API_URL)
::   2. .env                        (CORS_ORIGINS)
::   Then re-run this script.

echo.
echo  ==========================================
echo   Chakravyuh — Network Mode
echo   WiFi IP: 192.168.1.93
echo  ==========================================
echo.

:: ── Backend (FastAPI) ─────────────────────────────────────────────────────────
echo [1/2] Starting FastAPI backend on 0.0.0.0:8000 ...
start "Chakravyuh API" cmd /k "cd /d %~dp0..\apps\api && call venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

:: ── Frontend (Next.js) ────────────────────────────────────────────────────────
echo [2/2] Starting Next.js frontend on 0.0.0.0:3000 ...
start "Chakravyuh Web" cmd /k "cd /d %~dp0..\apps\web && npm run dev:network"

echo.
echo  Both servers are starting in separate windows.
echo.
echo  Access from THIS machine:
echo    http://localhost:3000
echo.
echo  Access from OTHER devices on the same WiFi:
echo    http://192.168.1.93:3000
echo.
echo  (Make sure Windows Firewall allows ports 3000 and 8000)
echo.
pause
