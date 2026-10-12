@echo off
echo ===================================================
echo Credit Portfolio Risk Engine - Startup Script
echo ===================================================

echo Starting FastAPI Backend Server on port 8000...
start cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting React Vite Frontend Server on port 5173...
start cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Backend API: http://127.0.0.1:8000/docs
echo Frontend UI: http://localhost:5173
echo.
echo To stop the servers, simply close the two command prompt windows that opened.
pause
