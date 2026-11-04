@echo off
setlocal
cd /d "%~dp0"
set "TESTROOT=%cd%\saves\career-check-%RANDOM%-%RANDOM%"
set "PEREKUP_EXE=%cd%\Perekup.exe"
mkdir "%TESTROOT%\assets\wallpapers" >nul 2>&1
xcopy "%cd%\data" "%TESTROOT%\data" /E /I /Y >nul
xcopy "%cd%\assets\wallpapers" "%TESTROOT%\assets\wallpapers" /E /I /Y >nul
set "QT_QPA_PLATFORM=offscreen"
set "QT_FORCE_STDERR_LOGGING=1"
powershell -NoProfile -Command "$p=Start-Process -FilePath $env:PEREKUP_EXE -ArgumentList @(([string][char]34+$env:TESTROOT+[char]34),'--career-test') -WorkingDirectory (Get-Location) -RedirectStandardOutput ($env:TESTROOT+'\stdout.log') -RedirectStandardError ($env:TESTROOT+'\stderr.log') -PassThru; if(-not $p.WaitForExit(30000)){$p.Kill();Write-Output 'CAREER TIMEOUT';exit 124}; $p.Refresh();exit $p.ExitCode"
set "RESULT=%ERRORLEVEL%"
(echo Result code: %RESULT% & echo Test folder: %TESTROOT% & type "%TESTROOT%\stderr.log") > CAREER-RESULT.txt
if exist "%TESTROOT%\saves\native-save.log" type "%TESTROOT%\saves\native-save.log" >> CAREER-RESULT.txt
type CAREER-RESULT.txt
pause
exit /b %RESULT%
