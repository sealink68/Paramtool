@echo off
chcp 65001 >nul
setlocal EnableExtensions
echo.
echo Paramtool setup / configuration
echo NL: Mappen klaarzetten en snelkoppeling maken. Geen installatie, geen beheerder.
echo FR: Préparation des dossiers et du raccourci. Aucune installation, pas de droits administrateur.
echo.

call :tree "%OneDriveCommercial%"
call :tree "%USERPROFILE%\OneDrive - dormakaba Group"
if not exist "%USERPROFILE%\Downloads\OSI-param" mkdir "%USERPROFILE%\Downloads\OSI-param"
echo NL: Downloads\OSI-param klaar — %USERPROFILE%\Downloads\OSI-param
echo FR: Downloads\OSI-param prêt — %USERPROFILE%\Downloads\OSI-param

if not exist "%LOCALAPPDATA%\Paramtool" mkdir "%LOCALAPPDATA%\Paramtool"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri 'https://sealink68.github.io/Paramtool/refresh-shortcut.ps1' -OutFile (Join-Path $env:LOCALAPPDATA 'Paramtool\refresh-shortcut.ps1') -UseBasicParsing; exit 0 } catch { if (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'Paramtool\refresh-shortcut.ps1')) { exit 0 } else { exit 1 } }"
if errorlevel 1 (
  echo NL: Het icoon-script kon niet worden gedownload. Internet is nodig voor de eerste setup.
  echo FR: Impossible de télécharger le script d'icône. Internet est requis pour la première configuration.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\Paramtool\refresh-shortcut.ps1" -CreateIfMissing
if errorlevel 1 (
  echo NL: Snelkoppeling maken is mislukt. Google Chrome is nodig.
  echo FR: Échec de la création du raccourci. Google Chrome est requis.
  pause
  exit /b 1
)
echo NL: Snelkoppeling Paramtool staat op het bureaublad, met het dormakaba-icoon.
echo FR: Le raccourci Paramtool est sur le bureau, avec l'icône dormakaba.

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if defined CHROME start "" "%CHROME%" --app=https://sealink68.github.io/Paramtool/
exit /b 0

:tree
set "BASE=%~1"
if "%BASE%"=="" goto :eof
if not exist "%BASE%" goto :eof
if exist "%BASE%\ESC_Share" mkdir "%BASE%\ESC_Share\projecten\ESC-param" 2>nul
if exist "%BASE%\ESC_Share" echo NL: ESC_Share\projecten\ESC-param klaar — %BASE%
if exist "%BASE%\ESC_Share" echo FR: ESC_Share\projecten\ESC-param prêt — %BASE%
if exist "%BASE%\ESA_Share" mkdir "%BASE%\ESA_Share\projecten\ESA-param" 2>nul
if exist "%BASE%\ESA_Share" echo NL: ESA_Share\projecten\ESA-param klaar — %BASE%
if exist "%BASE%\ESA_Share" echo FR: ESA_Share\projecten\ESA-param prêt — %BASE%
goto :eof
