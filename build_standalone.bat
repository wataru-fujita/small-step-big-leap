@echo off
cd /d "%~dp0"

:: public\config.js を書き換えたあと、このファイルをダブルクリックすると
:: standalone\small-step-big-leap.html を作り直します。
:: 出来上がった1ファイルをタブレットにコピーすれば、ご家庭用の設定で動きます。
::
:: 注意: echo で表示する文言は日本語版Windowsの既定コードページ(Shift-JIS)と
:: このファイルの文字コードが食い違うと文字化けでバッチ自体が壊れるため、
:: あえて英語表記にしています。日本語はコメント(::)内でのみ使用してください。

where node >nul 2>nul
if errorlevel 1 goto NO_NODE

echo Building the standalone HTML file...
node tools\build-standalone.js
if errorlevel 1 goto BUILD_FAILED

echo.
echo Done. Copy this file to your tablet:
echo   standalone\small-step-big-leap.html
echo.
pause
exit /b 0

:NO_NODE
echo [ERROR] Node.js was not found on this PC.
echo.
echo You have two options:
echo   1) Install Node.js from https://nodejs.org/ and run this file again.
echo   2) Skip this step: open standalone\small-step-big-leap.html in a text
echo      editor and edit the config block near the top of the file directly.
echo.
pause
exit /b 1

:BUILD_FAILED
echo.
echo [ERROR] Build failed. Please check the message above.
echo.
pause
exit /b 1
