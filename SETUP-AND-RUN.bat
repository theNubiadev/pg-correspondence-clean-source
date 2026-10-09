@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title PG Correspondence — Setup and Run
echo.
echo ============================================
echo  PG Correspondence — one-time setup + start
echo ============================================
echo.
echo Requirements already installed on this PC:
echo   1) Node.js 20 LTS   https://nodejs.org
echo   2) XAMPP with MySQL started
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found. Install Node.js 20 LTS, then run this again.
  pause
  exit /b 1
)

for /f "tokens=1 delims=v" %%v in ('node -v') do set NODEVER=%%v
echo Found Node %NODEVER%

if not exist ".env" (
  echo Creating .env for local XAMPP MySQL...
  (
    echo DATABASE_URL="mysql://root@127.0.0.1:3306/postgraduate_correspondence"
    echo AUTH_SECRET="local-dev-auth-secret-change-me-32chars-min"
    echo SIGNATURE_SECRET="local-dev-signature-secret-change-me"
    echo SESSION_MAX_AGE="28800"
    echo NEXT_PUBLIC_APP_URL="http://localhost:3000"
    echo NEXT_PUBLIC_APP_NAME="PG School Correspondence System"
    echo NEXT_PUBLIC_ORG_NAME="The Postgraduate College, University of Ibadan"
    echo SEED_SUPER_ADMIN_EMAIL="registry.admin@pgcollege.ui.edu.ng"
    echo SEED_SUPER_ADMIN_PASSWORD="ChangeMe!2026"
  ) > ".env"
) else (
  echo .env already exists — leaving it as-is.
)

if not exist "storage\correspondence" mkdir "storage\correspondence" >nul 2>&1

echo.
echo Installing packages (first run can take several minutes)...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo.
echo Creating database if missing (needs XAMPP MySQL running)...
where mysql >nul 2>&1
if not errorlevel 1 (
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS postgraduate_correspondence CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
) else (
  echo mysql.exe not on PATH — create DB manually in phpMyAdmin if needed:
  echo   name: postgraduate_correspondence
)

echo.
echo Applying database schema...
call npx prisma db push
if errorlevel 1 (
  echo.
  echo ERROR: Could not reach MySQL. Start MySQL in XAMPP, then run this again.
  echo Or create database "postgraduate_correspondence" in phpMyAdmin first.
  pause
  exit /b 1
)

echo.
echo Seeding demo users...
call npm run db:seed
if errorlevel 1 (
  echo WARNING: seed failed — you can still try starting the app.
)

echo.
echo Starting app at http://localhost:3000
echo Login after seed:
echo   admin email: registry.admin@pgcollege.ui.edu.ng / ChangeMe!2026
echo   or username: provost / Staff@2026
echo.
echo Keep this window open while using the app.
echo.
call npm run dev
pause
