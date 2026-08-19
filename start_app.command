#!/bin/bash
# macOS 用: 開発サーバーを起動し、ブラウザで開きます。
# Finder でこのファイルをダブルクリックすると実行できます。
# (初回のみ、ターミナルで `chmod +x start_app.command` の実行が必要な場合があります)

cd "$(dirname "$0")" || exit 1

PORT=3000
URL="http://localhost:${PORT}"

# 既にサーバーが動いていれば起動しない
if curl -s -o /dev/null "${URL}"; then
    echo "Server is already running."
else
    echo "Starting the dev server..."
    npm run dev >/dev/null 2>&1 &
    SERVER_PID=$!

    # 固定秒数で待つとPCの速度によっては間に合わないため、応答するまで待つ(最大30秒)
    echo "Waiting for the dev server to start..."
    for _ in $(seq 1 30); do
        if curl -s -o /dev/null "${URL}"; then
            break
        fi
        sleep 1
    done

    if ! curl -s -o /dev/null "${URL}"; then
        echo "[ERROR] The server did not respond within 30 seconds."
        echo "Try running 'npm install' first, then run this file again."
        exit 1
    fi
    echo "Server is ready (pid ${SERVER_PID})."
fi

# Google Chrome があればそれで、無ければ既定のブラウザで開く
if [ -d "/Applications/Google Chrome.app" ]; then
    open -a "Google Chrome" "${URL}"
else
    echo "Google Chrome was not found. Opening in the default browser instead."
    open "${URL}"
fi

echo
echo "To stop the server, close this window or press Ctrl+C."
wait
