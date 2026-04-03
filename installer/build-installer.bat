@echo off
setlocal enabledelayedexpansion
title WHMetcalfe Bid System — Installer Builder

:: ─────────────────────────────────────────────────────────────────────────────
:: Configuration — edit these if versions change
:: ─────────────────────────────────────────────────────────────────────────────
set SCRIPT_DIR=%~dp0
set ROOT=%SCRIPT_DIR%..
set BUILD=C:\WMBuild
set DOWNLOADS=%SCRIPT_DIR%downloads
set DIST=%SCRIPT_DIR%..\dist
set LOG=%BUILD%\build.log

set PYTHON_VER=3.12.9
set PYTHON_ZIP=python-%PYTHON_VER%-embed-amd64.zip
set PYTHON_URL=https://www.python.org/ftp/python/%PYTHON_VER%/%PYTHON_ZIP%

:: PostgreSQL 16 binaries from EDB
set PG_VER=16.3-1
set PG_ZIP=postgresql-%PG_VER%-windows-x64-binaries.zip
set PG_URL=https://get.enterprisedb.com/postgresql/%PG_ZIP%

set NSSM_ZIP=nssm-2.24.zip
set NSSM_URL=https://nssm.cc/release/%NSSM_ZIP%

set ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe

echo.
echo ============================================================
echo  WHMetcalfe Bid System - Installer Build Script
echo ============================================================
echo.

:: ─── Prerequisites ────────────────────────────────────────────────────────────
echo Checking prerequisites...

where node >nul 2>&1
if errorlevel 1 ( echo [ERROR] Node.js not found. Install from nodejs.org & pause & exit /b 1 )

where py >nul 2>&1
if errorlevel 1 ( echo [ERROR] Python not found. Install from python.org & pause & exit /b 1 )

if not exist "%ISCC%" (
    echo [ERROR] Inno Setup 6 not found.
    echo         Install from: https://jrsoftware.org/isinfo.php
    pause & exit /b 1
)
echo   OK.
echo.

:: ─── Create directories ───────────────────────────────────────────────────────
if exist "%BUILD%" rmdir /s /q "%BUILD%"
mkdir "%BUILD%"
mkdir "%BUILD%\python"
mkdir "%BUILD%\pgsql"
mkdir "%BUILD%\nssm"
mkdir "%DOWNLOADS%" 2>nul
mkdir "%DIST%"     2>nul

:: ─── STEP 1: Build React frontend ─────────────────────────────────────────────
echo [1/6] Building React frontend...
cd /d "%ROOT%\frontend"
call npm install
if errorlevel 1 ( echo [ERROR] npm install failed & pause & exit /b 1 )
call npm run build
if errorlevel 1 ( echo [ERROR] npm build failed & pause & exit /b 1 )
echo   Done.
echo.

:: ─── STEP 2: Embedded Python ──────────────────────────────────────────────────
echo [2/6] Setting up embedded Python...
cd /d "%SCRIPT_DIR%"

if not exist "%DOWNLOADS%\%PYTHON_ZIP%" (
    echo   Downloading Python %PYTHON_VER%...
    powershell -NoProfile -Command ^
        "try { Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%DOWNLOADS%\%PYTHON_ZIP%' -TimeoutSec 300; Write-Host 'OK' } catch { Write-Host 'FAIL:' $_.Exception.Message; exit 1 }"
    if errorlevel 1 ( echo [ERROR] Python download failed & pause & exit /b 1 )
) else (
    echo   Using cached %PYTHON_ZIP%
)

echo   Extracting Python...
powershell -NoProfile -Command ^
    "try { Expand-Archive -Path '%DOWNLOADS%\%PYTHON_ZIP%' -DestinationPath '%BUILD%\python' -Force; Write-Host 'OK' } catch { Write-Host 'FAIL:' $_.Exception.Message; exit 1 }"
if errorlevel 1 ( echo [ERROR] Python extract failed & pause & exit /b 1 )

:: Enable site-packages (uncomment 'import site' in the ._pth file)
powershell -NoProfile -Command ^
    "$pth = Get-ChildItem '%BUILD%\python\*.pth' | Select-Object -First 1; (Get-Content $pth.FullName) -replace '#import site','import site' | Set-Content $pth.FullName"
if errorlevel 1 ( echo [ERROR] Python .pth patch failed & pause & exit /b 1 )

:: Bootstrap pip
echo   Installing pip...
powershell -NoProfile -Command ^
    "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%BUILD%\get-pip.py' -TimeoutSec 60"
if errorlevel 1 ( echo [ERROR] get-pip.py download failed & pause & exit /b 1 )

"%BUILD%\python\python.exe" "%BUILD%\get-pip.py"
if errorlevel 1 ( echo [ERROR] pip bootstrap failed & pause & exit /b 1 )
del "%BUILD%\get-pip.py"

:: Install packages
echo   Installing Python packages (this may take a few minutes)...
"%BUILD%\python\python.exe" -m pip install -r "%ROOT%\backend\requirements.txt" --no-warn-script-location
if errorlevel 1 ( echo [ERROR] pip install failed - see output above & pause & exit /b 1 )
echo   Done.
echo.

:: ─── STEP 3: PostgreSQL binaries ──────────────────────────────────────────────
echo [3/6] Setting up PostgreSQL binaries...

if not exist "%DOWNLOADS%\%PG_ZIP%" (
    echo   Downloading PostgreSQL %PG_VER% binaries - this is ~200MB, please wait...
    powershell -NoProfile -Command ^
        "try { Invoke-WebRequest -Uri '%PG_URL%' -OutFile '%DOWNLOADS%\%PG_ZIP%' -TimeoutSec 600; Write-Host 'OK' } catch { Write-Host 'FAIL:' $_.Exception.Message; exit 1 }"
    if errorlevel 1 (
        echo [ERROR] PostgreSQL download failed.
        echo         Check your internet connection or manually download:
        echo         %PG_URL%
        echo         Save it to: %DOWNLOADS%\%PG_ZIP%
        pause & exit /b 1
    )
) else (
    echo   Using cached %PG_ZIP%
)

if not exist "%DOWNLOADS%\%PG_ZIP%" (
    echo [ERROR] PostgreSQL zip not found: %DOWNLOADS%\%PG_ZIP%
    pause & exit /b 1
)

echo   Extracting PostgreSQL (large archive, takes a moment)...
powershell -NoProfile -Command ^
    "try { Expand-Archive -Path '%DOWNLOADS%\%PG_ZIP%' -DestinationPath '%BUILD%\pg_tmp' -Force; Write-Host 'OK' } catch { Write-Host 'FAIL:' $_.Exception.Message; exit 1 }"
if errorlevel 1 ( echo [ERROR] PostgreSQL extract failed & pause & exit /b 1 )

xcopy /e /i /q "%BUILD%\pg_tmp\pgsql" "%BUILD%\pgsql" >nul
if errorlevel 1 ( echo [ERROR] PostgreSQL xcopy failed & pause & exit /b 1 )
rmdir /s /q "%BUILD%\pg_tmp"

echo   Done.
echo.

:: ─── STEP 4: NSSM ─────────────────────────────────────────────────────────────
echo [4/6] Setting up NSSM...

if not exist "%DOWNLOADS%\%NSSM_ZIP%" (
    powershell -NoProfile -Command ^
        "try { Invoke-WebRequest -Uri '%NSSM_URL%' -OutFile '%DOWNLOADS%\%NSSM_ZIP%' -TimeoutSec 60; Write-Host 'OK' } catch { Write-Host 'FAIL:' $_.Exception.Message; exit 1 }"
    if errorlevel 1 ( echo [ERROR] NSSM download failed & pause & exit /b 1 )
) else (
    echo   Using cached %NSSM_ZIP%
)

powershell -NoProfile -Command ^
    "Expand-Archive -Path '%DOWNLOADS%\%NSSM_ZIP%' -DestinationPath '%BUILD%\nssm_tmp' -Force"
copy /y "%BUILD%\nssm_tmp\nssm-2.24\win64\nssm.exe" "%BUILD%\nssm\nssm.exe" >nul
if errorlevel 1 ( echo [ERROR] NSSM copy failed & pause & exit /b 1 )
rmdir /s /q "%BUILD%\nssm_tmp"
echo   Done.
echo.

:: ─── STEP 5: Icon ─────────────────────────────────────────────────────────────
if not exist "%SCRIPT_DIR%assets\icon.ico" (
    mkdir "%SCRIPT_DIR%assets" 2>nul
    powershell -NoProfile -Command ^
        "Add-Type -AssemblyName System.Drawing; $icon = [System.Drawing.SystemIcons]::Application; $stream = [System.IO.File]::OpenWrite('%SCRIPT_DIR%assets\icon.ico'); $icon.Save($stream); $stream.Close()"
)

:: ─── STEP 6: Compile installer ────────────────────────────────────────────────
echo [5/6] Verifying build contents...
if not exist "%BUILD%\python\python.exe"   ( echo [ERROR] Python missing from build & pause & exit /b 1 )
if not exist "%BUILD%\pgsql\bin\initdb.exe" ( echo [ERROR] PostgreSQL missing from build & pause & exit /b 1 )
if not exist "%BUILD%\nssm\nssm.exe"        ( echo [ERROR] NSSM missing from build & pause & exit /b 1 )
echo   All components present.
echo.

echo [6/6] Compiling Inno Setup installer...
cd /d "%SCRIPT_DIR%"
"%ISCC%" setup.iss
if errorlevel 1 ( echo [ERROR] Inno Setup compile failed - see output above & pause & exit /b 1 )

echo.
echo ============================================================
echo  BUILD COMPLETE
echo  Output: %DIST%\WHMetcalfe-BidSystem-Setup.exe
echo ============================================================
echo.
pause
