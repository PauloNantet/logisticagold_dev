@echo off
start "" cmd /k "cd /d %~dp0 && npm run dev:all"
timeout /t 5 /nobreak >nul
start chrome http://localhost:5173
