@echo off
echo ========================================
echo Trading Pivot Points Platform Setup
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version (18.x or higher^)
    echo.
    echo After installation, run this script again.
    pause
    exit /b 1
)

echo Node.js found:
node --version
echo.

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo npm is not installed!
    echo Please reinstall Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo npm found:
npm --version
echo.

:: Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Dependencies installed successfully!
echo ========================================
echo.
echo Starting development server...
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.

:: Start the development server
call npm run dev
