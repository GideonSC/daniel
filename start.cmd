@echo off
call "%~dp0setup.cmd"
echo Starting backend and frontend in new windows...
start "Backend" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate && python -m uvicorn app.api:app --reload --port 8003"
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1 --port 5174"
echo Backend: http://127.0.0.1:8003
echo Frontend: http://127.0.0.1:5174
pause
