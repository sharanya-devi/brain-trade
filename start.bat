@echo off
echo ========================================================
echo             STARTING BRAIN TRADE PLATFORM
echo ========================================================
echo.

:: 1. Start Flask API Backend
echo [1/3] Starting Flask Backend API on http://127.0.0.1:5000 ...
start "Brain Trade - Flask Backend" cmd /k "cd /d %~dp0backend && python app.py"

:: 2. Start WebRTC Signaling Server
echo [2/3] Starting WebRTC Signaling Server on http://127.0.0.1:3000 ...
start "Brain Trade - Signaling Server" cmd /k "cd /d %~dp0backend && node signaling-server.js"

:: 3. Start Frontend HTTP Server
echo [3/3] Starting Frontend Server on http://127.0.0.1:8080 ...
start "Brain Trade - Frontend Server" cmd /k "cd /d %~dp0frontend && python -m http.server 8080"

:: Wait 2 seconds for servers to initialize
timeout /t 2 /nobreak >nul

:: 4. Open Web App in default browser
echo Opening Brain Trade in your browser...
start http://127.0.0.1:8080/index.html

echo.
echo ========================================================
echo   All 3 services are now running in separate windows!
echo   Close those windows whenever you want to stop them.
echo ========================================================
pause
