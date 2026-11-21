@echo off
setlocal
set "CHECKOUT=%~dp0."
rem The original workspace predates the GitHub release.
rem Use its prepared release checkout when launched from that workspace.
if /i "%~dp0"=="E:\Games\Codex\Eldritch Horrors\" set "CHECKOUT=%LOCALAPPDATA%\Temp\eldritch-release-DDWVeB"

pushd "%CHECKOUT%" || goto :failed
set "SAFE_PATH=%CD:\=/%"
git -c "safe.directory=%SAFE_PATH%" push origin main
set "RESULT=%ERRORLEVEL%"
popd
if not "%RESULT%"=="0" goto :failed
echo.
echo Git push finished.
pause
exit /b 0

:failed
echo.
echo Git push failed. Review the error above.
pause
exit /b 1
