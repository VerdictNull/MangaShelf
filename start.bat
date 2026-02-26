@echo off
setlocal
cd /d "%~dp0"

echo.
echo  MangaShelf
echo  ──────────────────────────────
echo.

:: ── Check Node.js ────────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js is not installed.
    echo.
    echo  Download it from https://nodejs.org ^(LTS version^) then run this again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js %NODE_VER% found.

:: ── Install dependencies ──────────────────────────────────────────────────────
if not exist "node_modules" (
    echo.
    echo  Installing dependencies ^(first run — this takes a minute^)...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERROR: npm install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
)

:: ── Rebuild native SQLite module if not compiled yet ─────────────────────────
if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo.
    echo  Compiling native database module for Electron...
    echo.
    call npm run rebuild
    if errorlevel 1 (
        echo.
        echo  ERROR: Native module build failed.
        echo  Make sure you have the Visual C++ Build Tools installed:
        echo  https://visualstudio.microsoft.com/visual-cpp-build-tools/
        echo.
        pause
        exit /b 1
    )
)

:: ── Start ─────────────────────────────────────────────────────────────────────
echo.
echo  Starting MangaShelf...
echo.
call npm run dev
