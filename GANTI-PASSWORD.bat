@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Bardi Monitor - Ganti Password Laporan
node set-password.js
echo.
echo Tekan tombol apa saja untuk menutup jendela ini.
pause >nul
