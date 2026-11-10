@echo off
chcp 65001 >nul
cd /d "%~dp0"
where npm >nul 2>&1
if errorlevel 1 (
  echo npm tidak ditemukan. Pastikan Node.js sudah terpasang ^(jalankan INSTALL.bat^).
  pause
  exit /b 1
)
echo Memasang pustaka ONVIF ^(onvif 0.8.3^)...
call npm install onvif@0.8.3 --save-exact --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo GAGAL memasang. Kirim tampilan layar ini ke Claude.
) else (
  echo.
  echo SELESAI. Tutup lalu buka lagi Bardi Monitor.
)
echo.
pause
