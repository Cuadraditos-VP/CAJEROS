@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Necesitas instalar Node.js: https://nodejs.org & pause & exit /b 1)
start "" http://localhost:8080
node server.js
pause
