@echo off
cd /d "%~dp0"
title PG Correspondence
if not exist "node_modules" (
  echo First time? Double-click SETUP-AND-RUN.bat instead.
  pause
  exit /b 1
)
if not exist ".env" (
  echo Missing .env — run SETUP-AND-RUN.bat first.
  pause
  exit /b 1
)
echo Starting http://localhost:3000 ...
call npm run dev
pause
