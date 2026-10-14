@echo off
REM IELTS Coach: install packages once, then start the server.
cd /d "%~dp0backend"
python -m pip install -q -r requirements.txt
start "" http://localhost:8000
python -m uvicorn main:app --port 8000
pause
