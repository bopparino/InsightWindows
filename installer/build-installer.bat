@echo off
setlocal enabledelayedexpansion
title WHMetcalfe Bid System — Installer Builder

:: ─────────────────────────────────────────────────────────────────────────────
:: Configuration
:: ─────────────────────────────────────────────────────────────────────────────
set ROOT=%~dp0..
:: Use a short root path to avoid Windows MAX_PATH (260 char) errors during pip install
set BUILD=C:\WMBuild
set DIST=%~dp0..\dist
set PYTHON_VER=3.12.9
set PYTHON_ZIP=python-%PYTHON_VER%-embed-amd64.zip
set PYTHON_URL=https://www.python.org/ftp/python/%PYTHON_VER%/%PYTHON_ZIP%
set PG_VER=16.3-1
set PG_ZIP=postgresql-%PG_VER%-windows-x64-binaries.zip
set PG_URL=https://get.enterprisedb.com/postgresql/%PG_ZIP%
set NSSM_URL=https://nssm.cc/release/nssm-2.24.zip
set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

echo.
echo ============================================================
echo  WHMetcalfe Bid System - Installer Build Script
echo ============================================================
echo.

:: ─── Prerequisites check ─────────────────────────────────────────────────────
where node >nul 2>&1 || (echo [ERROR] Node.js not found. Install from nodejs.org && pause && exit /b 1)
where py   >nul 2>&1 || (echo [ERROR] Python not found. Install from python.org  && pause && exit /b 1)
if not exist %ISCC% (echo [ERROR] Inno Setup 6 not found at %ISCC% && echo Install from https://jrsoftware.org/isinfo.php && pause && exit /b 1)

:: ─── 1. Build React frontend ─────────────────────────────────────────────────
echo [1/6] Building React frontend...
cd /d "%ROOT%\frontend"
call npm install --silent
call npm run build
if errorlevel 1 (echo [ERROR] Frontend build failed && pause && exit /b 1)
echo      Done.

:: ─── 2. Prepare build directory ──────────────────────────────────────────────
echo [2/6] Preparing build directory...
if exist "%BUILD%" rmdir /s /q "%BUILD%"
mkdir "%BUILD%"
mkdir "%BUILD%\nssm"
mkdir "%DIST%" 2>nul

:: ─── 3. Download + set up embedded Python ────────────────────────────────────
echo [3/6] Setting up embedded Python...
cd /d "%~dp0"

if not exist "downloads\%PYTHON_ZIP%" (
    echo      Downloading Python %PYTHON_VER%...
    mkdir downloads 2>nul
    powershell -Command "Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile 'downloads\%PYTHON_ZIP%'"
)

mkdir "%BUILD%\python"
powershell -Command "Expand-Archive -Path 'downloads\%PYTHON_ZIP%' -DestinationPath '%BUILD%\python' -Force"

:: Enable site-packages in embedded Python
:: The ._pth file controls what gets imported — we need to uncomment 'import site'
powershell -Command "(Get-Content '%BUILD%\python\python312._pth') -replace '#import site','import site' | Set-Content '%BUILD%\python\python312._pth'"

:: Bootstrap pip into embedded Python
powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%BUILD%\get-pip.py'"
"%BUILD%\python\python.exe" "%BUILD%\get-pip.py" --quiet

:: Install all packages
echo      Installing Python packages (this takes a moment)...
"%BUILD%\python\python.exe" -m pip install -r "%ROOT%\backend\requirements.txt" ^
    --quiet --no-warn-script-location
if errorlevel 1 (echo [ERROR] pip install failed && pause && exit /b 1)
del "%BUILD%\get-pip.py"
echo      Done.

:: ─── 4. Download + extract PostgreSQL binaries ───────────────────────────────
echo [4/6] Setting up PostgreSQL binaries...

if not exist "downloads\%PG_ZIP%" (
    echo      Downloading PostgreSQL %PG_VER% binaries (~200MB)...
    powershell -Command "Invoke-WebRequest -Uri '%PG_URL%' -OutFile 'downloads\%PG_ZIP%'"
)

powershell -Command "Expand-Archive -Path 'downloads\%PG_ZIP%' -DestinationPath '%BUILD%\pg_tmp' -Force"
:: EDB zip extracts to a 'pgsql' subfolder
xcopy /e /i /q "%BUILD%\pg_tmp\pgsql" "%BUILD%\pgsql"
rmdir /s /q "%BUILD%\pg_tmp"
echo      Done.

:: ─── 5. Download NSSM ────────────────────────────────────────────────────────
echo [5/6] Setting up NSSM...

if not exist "downloads\nssm.zip" (
    powershell -Command "Invoke-WebRequest -Uri '%NSSM_URL%' -OutFile 'downloads\nssm.zip'"
)
powershell -Command "Expand-Archive -Path 'downloads\nssm.zip' -DestinationPath '%BUILD%\nssm_tmp' -Force"
:: Grab the win64 binary
copy /y "%BUILD%\nssm_tmp\nssm-2.24\win64\nssm.exe" "%BUILD%\nssm\nssm.exe"
rmdir /s /q "%BUILD%\nssm_tmp"
echo      Done.

:: ─── 6. Compile Inno Setup installer ─────────────────────────────────────────
echo [6/6] Compiling installer...
cd /d "%~dp0"

:: Create placeholder icon if missing
if not exist "assets\icon.ico" (
    mkdir assets 2>nul
    powershell -Command ^
        "$img = [System.Drawing.Icon]::ExtractAssociatedIcon((Get-Command 'python.exe').Source); " ^
        "$stream = [System.IO.File]::OpenWrite('assets\icon.ico'); " ^
        "$img.Save($stream); $stream.Close()"
)

%ISCC% setup.iss
if errorlevel 1 (echo [ERROR] Inno Setup compile failed && pause && exit /b 1)

echo.
echo ============================================================
echo  Build complete!
echo  Installer: dist\WHMetcalfe-BidSystem-Setup.exe
echo ============================================================
echo.
pause
