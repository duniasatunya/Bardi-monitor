@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Bardi Monitor - Instalasi

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Meminta izin Administrator. Klik "Yes" pada jendela yang muncul...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
echo Tekan tombol apa saja untuk menutup jendela ini.
pause >nul
