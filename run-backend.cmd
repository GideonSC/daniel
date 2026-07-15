@echo off
call .venv\Scripts\activate
python -m uvicorn app.api:app --reload --port 8002
