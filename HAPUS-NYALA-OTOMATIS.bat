@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0nyala-otomatis.ps1" hapus
echo.
pause
