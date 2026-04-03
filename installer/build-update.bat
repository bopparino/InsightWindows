@echo off
setlocal
title WHMetcalfe Bid System — Build Update Package

set ROOT=%~dp0..
set DIST=%~dp0..\dist
set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

echo [1/3] Building React frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 (echo [ERROR] Frontend build failed && pause && exit /b 1)

echo [2/3] Compiling update installer...
cd /d "%~dp0"
%ISCC% setup.iss /DUpdateOnly
if errorlevel 1 (echo [ERROR] Compile failed && pause && exit /b 1)

echo [3/3] Done.
echo   Output: dist\WHMetcalfe-BidSystem-Setup.exe
echo   This installer detects existing installs and updates code only.
echo   Database and .env are preserved.
pause
