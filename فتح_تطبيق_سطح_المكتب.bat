@echo off
chcp 65001 > nul
title تشغيل المنظومة كنافذة تطبيق مستقلة

cd /d "%~dp0"

echo جاري فتح المنظومة كتطبيق سطح مكتب محلي مستقل...

:: Try launching in Edge App Mode
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge --app=http://localhost:5174 --window-size=1440,900
    exit
)

:: Try launching in Chrome App Mode
where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start chrome --app=http://localhost:5174 --window-size=1440,900
    exit
)

:: Default Browser Fallback
start "" "http://localhost:5174"
exit
