@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 goto erro
)
call npm run dev
if errorlevel 1 goto erro
goto fim
:erro
echo.
echo Nao foi possivel iniciar. Confira se Node.js e npm estao instalados.
pause
:fim
