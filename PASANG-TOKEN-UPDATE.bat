@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Bardi Monitor - Pasang Token Pembaruan
node set-update-token.js
echo.
echo Tekan tombol apa saja untuk menutup jendela ini.
pause >nul
