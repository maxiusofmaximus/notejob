@echo off
setlocal
set "ROOT=%~dp0.."
set "WEB=%ROOT%\app\web"
set "BUN=%USERPROFILE%\.bun\bin\bun.exe"

if not exist "%WEB%\package.json" (
  echo No se encontro %WEB%\package.json
  pause
  exit /b 1
)

if not exist "%BUN%" (
  echo Bun no esta instalado en %BUN%
  echo Instala Bun: powershell -c "irm bun.sh/install.ps1 ^| iex"
  pause
  exit /b 1
)

start "NoteJob Astro Dev" cmd /k "cd /d ""%WEB%"" && ""%BUN%"" install && ""%BUN%"" run dev --host 127.0.0.1 --port 4321"
timeout /t 2 >nul
start "" "http://127.0.0.1:4321"
echo NoteJob abierto en http://127.0.0.1:4321
