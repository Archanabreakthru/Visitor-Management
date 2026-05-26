@echo off
title 🚀 Breakthru VMS - Instant Tunnel Manager
mode con: cols=80 lines=28
color 0B

:menu
cls
echo ================================================================================
echo                   🚀 BREAKTHRU.AI VMS - INSTANT TUNNEL MANAGER                  
echo ================================================================================
echo.
echo   This tool will help you expose your local VMS server (port 3001) to the web
echo   so you can share your demo, test the Telegram Bot, or access it on mobile!
echo.
echo   [1] ⚡ ngrok (Official, Requires Free Account)
echo       Best for stable, official tunneling. Requires adding your Authtoken first.
echo.
echo   [2] 🔗 localtunnel (Zero Setup, Instant)
echo       Quick and free. No signup needed. Runs via Node.js/npx.
echo.
echo   [3] 🟢 Pinggy.io SSH Tunnel (Zero Install, Instant)
echo       No installation needed! Uses built-in Windows SSH to create a tunnel.
echo.
echo   [4] 🌐 Localhost.run SSH Tunnel (Zero Install, Instant)
echo       Another zero-installation SSH tunnel. Simple and reliable.
echo.
echo   [5] 🔑 Configure ngrok Authtoken
echo       Paste and save your ngrok authtoken to authorize this PC.
echo.
echo   [6] ❌ Exit
echo.
echo ================================================================================
set /p opt="👉 Select an option (1-6) and press Enter: "

if "%opt%"=="1" goto ngrok
if "%opt%"=="2" goto localtunnel
if "%opt%"=="3" goto pinggy
if "%opt%"=="4" goto localhostrun
if "%opt%"=="5" goto auth
if "%opt%"=="6" goto exit
goto menu

:ngrok
cls
echo ================================================================================
echo                     ⚡ STARTING NGROK TUNNEL (PORT 3001)                        
echo ================================================================================
echo.
echo   Launching ngrok on port 3001...
echo   If it fails, make sure you configured your Authtoken using Option [5] first!
echo.
echo   Press Ctrl+C to stop the tunnel and return to menu.
echo.
cd /d "%~dp0\backend"
npx ngrok http 3001
pause
goto menu

:localtunnel
cls
echo ================================================================================
echo                  🔗 STARTING LOCALTUNNEL (PORT 3001)                             
echo ================================================================================
echo.
echo   Launching localtunnel on port 3001...
echo   No account or installation required!
echo.
echo   Press Ctrl+C to stop the tunnel and return to menu.
echo.
cd /d "%~dp0\backend"
npx localtunnel --port 3001
pause
goto menu

:pinggy
cls
echo ================================================================================
echo                  🟢 STARTING PINGGY SSH TUNNEL (PORT 3001)                       
echo ================================================================================
echo.
echo   Launching Pinggy tunnel on port 3001 using Windows SSH...
echo   No installation or account needed!
echo.
echo   Press Ctrl+C to stop the tunnel and return to menu.
echo.
ssh -R 80:localhost:3001 free@pinggy.io
pause
goto menu

:localhostrun
cls
echo ================================================================================
echo                 🌐 STARTING LOCALHOST.RUN SSH TUNNEL (PORT 3001)                  
echo ================================================================================
echo.
echo   Launching Localhost.run tunnel on port 3001...
echo   No installation or account needed!
echo.
echo   Press Ctrl+C to stop the tunnel and return to menu.
echo.
ssh -R 80:localhost:3001 nokey@localhost.run
pause
goto menu

:auth
cls
echo ================================================================================
echo                    🔑 CONFIGURE NGROK AUTHTOKEN                                 
echo ================================================================================
echo.
echo   To use ngrok, you need a free authtoken from https://dashboard.ngrok.com
echo.
set /p token="👉 Paste your ngrok Authtoken here: "
if "%token%"=="" (
    echo.
    echo   ❌ Error: Authtoken cannot be empty.
    pause
    goto menu
)
echo.
echo   Setting ngrok authtoken...
cd /d "%~dp0\backend"
npx ngrok config add-authtoken %token%
echo.
echo   ✅ Authtoken successfully saved!
pause
goto menu

:exit
cls
echo Thank you for using Breakthru VMS Tunnel Manager!
timeout /t 2 >nul
exit
