@echo off
REM Run this any time you want a point-in-time backup of the database.
REM Output lands in the /backups folder with a timestamp in the filename.

set PGPASSWORD=bullet
set BACKUP_DIR=%~dp0backups
set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set OUTFILE=%BACKUP_DIR%\hvac_poc_%TIMESTAMP%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Backing up hvac_poc to %OUTFILE% ...
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d hvac_poc -F p -f "%OUTFILE%"

if %ERRORLEVEL% == 0 (
    echo Done. Backup saved to %OUTFILE%
) else (
    echo ERROR: pg_dump failed. Check that PostgreSQL 16 is installed at the default path.
)
pause
