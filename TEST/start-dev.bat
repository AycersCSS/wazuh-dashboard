@echo off
title MergeIT Dashboard - Dev Server
echo Starting MergeIT Dashboard Development Server...
echo.

echo Starting Next.js dev server (WebApp + API)...
start "MergeIT WebApp" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo WebApp + API starting at http://localhost:3000
echo.
echo Press any key to close this window (servers will keep running in separate windows)...
pause >nul