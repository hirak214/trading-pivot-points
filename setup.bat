@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "d:\Hirak Desai\workspace\programHosting\allSpot"
echo Cleaning node_modules...
if exist node_modules rd /s /q node_modules
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Installation failed!
    exit /b 1
)
echo.
echo Installation complete!
echo Starting development server...
call npm run dev
