@echo off
title Wazuh Dashboard + Connector Demo
color 0A

echo =====================================================
echo   MergeIT Wazuh Demo — Single Launch (Windows)
echo =====================================================
echo.

set ROOT=%~dp0
cd /d %ROOT%

echo [1/4] Ensuring Python dependencies...
cd MergeIT-WazuhConnector
pip install -r requirements.txt --quiet
cd ..

echo [2/4] Ensuring Node dependencies...
cd TEST
if not exist "node_modules" (
    npm install
)
cd ..

echo [3/4] Starting services...
start "Connector (5000)" /min cmd /c "cd /d %ROOT%MergeIT-WazuhConnector && python main.py"
timeout /t 3 >nul
start "Dashboard (3000)" /min cmd /c "cd /d %ROOT%TEST && npm run dev"

echo [4/4] Waiting for services...
timeout /t 8 >nul

echo.
echo =====================================================
echo   Demo ready!
echo   Login:           http://localhost:3000/login
echo   Admin shortcut:  http://localhost:3000/login  (click Admin access)
echo   Tenant dashboard:http://localhost:3000/tenant
echo   Connector:       http://localhost:5000/tenants
echo =====================================================
echo.
echo Press any key to stop all services (or close this window)
pause >nul

taskkill /FI "WINDOWTITLE eq Connector (5000)*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Dashboard (3000)*" /F >nul 2>&1
echo Services stopped.
