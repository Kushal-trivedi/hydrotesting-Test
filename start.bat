@echo off
title HydroSafe Compliance OS
echo Starting HydroSafe Compliance Operating System...
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
