@echo off
REM Run the portfolio + demo apps locally (same flag detection as start.sh).
REM The site opens at http://localhost:3000 — close this window to stop the server.
cd /d "%~dp0"

node -e "require('node:sqlite')" >nul 2>&1
if %errorlevel%==0 (
  node server.js
) else (
  node --experimental-sqlite server.js
)
