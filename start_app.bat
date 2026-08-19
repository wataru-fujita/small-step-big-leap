@echo off
cd /d "%~dp0"

:: Next.jsの開発サーバーをバックグラウンドで起動 (ポート3000)
start /B cmd /c "npm run dev"

:: サーバーが実際に応答するまで待つ（最大30秒、1秒間隔でチェック）
:: 固定5秒待機だと、PCが遅い場合などに間に合わず、
:: 「このサイトにアクセスできません」の画面が開いてしまうことがあったため
:: 注意: echoで表示する文言は日本語版Windowsの既定コードページ(Shift-JIS)と
:: このファイルの文字コード(UTF-8)が食い違うと文字化けでバッチ自体が壊れるため
:: あえて英語表記にしています。日本語はコメント(::)内でのみ使用してください。
echo Waiting for the dev server to start...
set /a SSBL_COUNT=0

:SSBL_WAIT_LOOP
curl -s -o nul -w "%%{http_code}" http://localhost:3000 > "%TEMP%\ssbl_status.txt" 2>nul
set /p SSBL_STATUS=<"%TEMP%\ssbl_status.txt"
if "%SSBL_STATUS%"=="200" goto SSBL_SERVER_READY

set /a SSBL_COUNT+=1
if %SSBL_COUNT% GEQ 30 goto SSBL_TIMEOUT
timeout /t 1 >nul
goto SSBL_WAIT_LOOP

:SSBL_SERVER_READY
echo Server is ready. Opening the browser...
goto SSBL_LAUNCH

:SSBL_TIMEOUT
echo [WARNING] Server did not respond within 30 seconds. Launching browser anyway...
echo If you see a connection error, please wait a moment and reload the page.

:SSBL_LAUNCH
del "%TEMP%\ssbl_status.txt" >nul 2>nul

:: 既定のブラウザで通常のウィンドウとして開く
start "" http://localhost:3000
