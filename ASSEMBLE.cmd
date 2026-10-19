@echo off
setlocal
pushd "%~dp0" || exit /b 1
echo Perekup.ru - restore original ZIP
echo.
if not exist "Perekup-Portable-Windows-x64.zip.part01" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part01
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part02" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part02
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part03" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part03
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part04" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part04
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part05" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part05
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part06" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part06
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part07" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part07
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part08" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part08
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part09" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part09
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part10" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part10
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part11" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part11
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part12" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part12
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part13" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part13
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part14" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part14
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if not exist "Perekup-Portable-Windows-x64.zip.part15" (
  echo Missing part: Perekup-Portable-Windows-x64.zip.part15
  echo Download and extract the ENTIRE branch ZIP first.
  pause
  exit /b 1
)
if exist "Perekup-Portable-Windows-x64.zip" (
  echo Perekup-Portable-Windows-x64.zip already exists.
  echo Extract that ZIP, or move it before assembling again.
  pause
  exit /b 1
)
echo Joining 15 parts...
copy /b "Perekup-Portable-Windows-x64.zip.part01"+"Perekup-Portable-Windows-x64.zip.part02"+"Perekup-Portable-Windows-x64.zip.part03"+"Perekup-Portable-Windows-x64.zip.part04"+"Perekup-Portable-Windows-x64.zip.part05"+"Perekup-Portable-Windows-x64.zip.part06"+"Perekup-Portable-Windows-x64.zip.part07"+"Perekup-Portable-Windows-x64.zip.part08"+"Perekup-Portable-Windows-x64.zip.part09"+"Perekup-Portable-Windows-x64.zip.part10"+"Perekup-Portable-Windows-x64.zip.part11"+"Perekup-Portable-Windows-x64.zip.part12"+"Perekup-Portable-Windows-x64.zip.part13"+"Perekup-Portable-Windows-x64.zip.part14"+"Perekup-Portable-Windows-x64.zip.part15" "Perekup-Portable-Windows-x64.zip" >nul
if errorlevel 1 (
  echo Copy failed. Check free disk space.
  pause
  exit /b 1
)
echo Checking SHA256...
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; if ((Get-FileHash -LiteralPath 'Perekup-Portable-Windows-x64.zip' -Algorithm SHA256).Hash -ne '13aa2e2a9b40a2ae23a087f8e6a33c2bb42392e0e476af6a055e8d78bb96246c') { exit 1 }"
if errorlevel 1 (
  echo ERROR: ZIP checksum does not match. Do not use this ZIP.
  pause
  exit /b 1
)
echo.
echo DONE: Perekup-Portable-Windows-x64.zip
echo Extract the ZIP completely, then run Perekup.exe.
pause
popd
endlocal
