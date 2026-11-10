@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Bardi Monitor - Pulihkan Versi Lama
echo Ini mengembalikan file ke versi sebelum pembaruan terakhir.
echo Tutup Bardi Monitor dulu kalau sedang berjalan.
echo.
pause
node restore.js
echo.
echo Tekan tombol apa saja untuk menutup jendela ini.
pause >nul
