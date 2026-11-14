@echo off
chcp 65001 >nul
title NextS — Auto-Slide Teleprompter & Host Launcher

echo ======================================================================
echo    NextS: Tram Thuyet Trinh Thong Minh & May Nhac Chu Tu Dong
echo ======================================================================
echo.

:: 1. Kiem tra dependencies cua desktop-host
if not exist "desktop-host\node_modules" (
    echo [1/3] Cai dat thu vien Node.js cho desktop-host...
    cd desktop-host
    call npm install
    cd ..
) else (
    echo [1/3] Thu vien backend desktop-host: SAN SANG.
)

:: 2. Kiem tra ban build giao dien mobile-client
if not exist "mobile-client\dist\index.html" (
    echo [2/3] Bien dich giao dien san xuat (mobile-client dist)...
    cd mobile-client
    if not exist "node_modules" (
        call npm install
    )
    call npm run build
    cd ..
) else (
    echo [2/3] Giao dien san xuat (dist): SAN SANG.
)

:: 3. Mo trinh duyet va khoi chay Host Server
echo [3/3] Dang khoi chay NextS Host Server tren cong 3000...
start "" "http://localhost:3000"

cd desktop-host
node server.js
pause
