@echo off
title LDP Technical Consultant - Local Server
cd /d "%~dp0"

echo ========================================================
echo   Menjalankan Website LDP Technical Consultant (Local)
echo ========================================================
echo.

if not exist "node_modules" (
    echo [INFO] Folder node_modules tidak ditemukan. Memulai npm install...
    call npm install
    echo.
)

echo [INFO] Membuka server lokal dan browser...
echo [INFO] Tekan Ctrl + C untuk menghentikan server.
echo.

call npm run dev -- --open

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server berhenti atau mengalami kendala.
    pause
)

