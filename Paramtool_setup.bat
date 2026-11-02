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

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined CHROME (
  echo NL: Google Chrome niet gevonden. Installeer Chrome en start dit script opnieuw.
  echo FR: Google Chrome est introuvable. Installez Chrome et relancez ce script.
  pause
  exit /b 1
)

set "CHROME_PATH=%CHROME%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$desk = [Environment]::GetFolderPath('Desktop'); $sc = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desk 'Paramtool.lnk')); $sc.TargetPath = $env:CHROME_PATH; $sc.Arguments = '--app=https://sealink68.github.io/Paramtool/'; $sc.WorkingDirectory = $desk; $sc.Description = 'Paramtool'; $sc.Save()"
if errorlevel 1 (
  echo NL: Snelkoppeling maken is mislukt.
  echo FR: Échec de la création du raccourci.
  pause
  exit /b 1
)
echo NL: Snelkoppeling Paramtool staat op het bureaublad. De app wordt geopend.
echo FR: Le raccourci Paramtool est sur le bureau. Ouverture de l'application.
start "" "%CHROME%" --app=https://sealink68.github.io/Paramtool/
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
