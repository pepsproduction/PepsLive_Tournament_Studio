@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions

title PepsLive Tournament Studio
set "APP_DIR=%~dp0"
set "PORT="
set "BIND_HOST=0.0.0.0"

pushd "%APP_DIR%" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Could not open the project folder.
  pause
  exit /b 1
)

set "PY_EXE="
set "PY_ARGS="
where py >nul 2>&1
if not errorlevel 1 (
  set "PY_EXE=py"
  set "PY_ARGS=-3"
)

if not defined PY_EXE (
  where python >nul 2>&1
  if not errorlevel 1 set "PY_EXE=python"
)

if not defined PY_EXE (
  echo [ERROR] Python 3 is required to run this project.
  echo Download it from https://www.python.org/downloads/windows/
  popd
  pause
  exit /b 1
)

call :select_port
if errorlevel 1 (
  echo [ERROR] No available port was found for the local server.
  popd
  pause
  exit /b 1
)
set "LOCAL_URL=http://127.0.0.1:%PORT%/"

call :is_peps_server_running
if errorlevel 1 (
  echo [INFO] Starting the local server on port %PORT% ...
  start "PepsLive Local Server" /min "%PY_EXE%" %PY_ARGS% server.py --port %PORT% --bind %BIND_HOST%
)

call :wait_for_server
if errorlevel 1 (
  echo [ERROR] The local server could not start, or port %PORT% is already in use.
  echo Close the old server window and run this file again.
  popd
  pause
  exit /b 1
)

echo.
echo ===============================================
echo   PepsLive Tournament Studio is ready
echo ===============================================
echo   Control:  %LOCAL_URL%
echo   OBS Draw: %LOCAL_URL%?view=draw-animation
echo.
echo   The server accepts connections on the local network.
echo   Phones and other PCs must use this computer's LAN IP, not 127.0.0.1.
echo ===============================================
echo.

start "" "%LOCAL_URL%"
popd
exit /b 0

:is_peps_server_running
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%PORT%/' -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match 'PepsLive Tournament Studio') { exit 0 } } catch {}; exit 1" >nul 2>&1
exit /b %errorlevel%

:port_is_free
powershell -NoProfile -ExecutionPolicy Bypass -Command "$x=Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; if ($x) { exit 1 } else { exit 0 }" >nul 2>&1
exit /b %errorlevel%

:select_port
for %%P in (8765 8787 8766 8888) do (
  set "PORT=%%P"
  call :is_peps_server_running
  if not errorlevel 1 exit /b 0
  call :port_is_free
  if not errorlevel 1 exit /b 0
)
exit /b 1

:wait_for_server
for /l %%N in (1,1,15) do (
  call :is_peps_server_running
  if not errorlevel 1 exit /b 0
  >nul 2>&1 ping 127.0.0.1 -n 2
)
exit /b 1
