@echo off
setlocal
if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  python -m venv .venv
)
call .venv\Scripts\activate
echo Installing Python dependencies...
pip install -r requirements.txt
if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  cd /d %~dp0frontend
  npm install
  cd /d %~dp0
)
echo Setup complete.
endlocal
