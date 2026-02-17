@echo off
setlocal

cd /d "%~dp0\.."

echo Ejecutando smoke test de variables de entorno...
echo.

set "CONNECTIONS=%~1"
if "%CONNECTIONS%"=="" (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File ".\scripts\smoke-env.ps1" -EnvFile ".env" -ExpectedSupabaseProjectRef "hzvojttkhjqsbejmudqz" -Interactive
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File ".\scripts\smoke-env.ps1" -EnvFile ".env" -ExpectedSupabaseProjectRef "hzvojttkhjqsbejmudqz" -Connections "%CONNECTIONS%"
)
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
