@echo off
setlocal

cd /d "%~dp0\.."

echo Ejecutando migraciones D1...
echo.

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File ".\scripts\d1-migrate.ps1" -EnvFile ".env"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Resultado: FAIL
) else (
  echo Resultado: OK
)
echo.
pause
exit /b %EXIT_CODE%
