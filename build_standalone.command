#!/bin/bash
# macOS 用: public/config.js を書き換えたあとにこのファイルをダブルクリックすると、
# standalone/small-step-big-leap.html を作り直します。
# 出来上がった1ファイルをタブレットにコピーすれば、ご家庭用の設定で動きます。
# (初回のみ、ターミナルで `chmod +x build_standalone.command` の実行が必要な場合があります)

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js was not found on this Mac."
    echo
    echo "You have two options:"
    echo "  1) Install Node.js from https://nodejs.org/ and run this file again."
    echo "  2) Skip this step: open standalone/small-step-big-leap.html in a text"
    echo "     editor and edit the config block near the top of the file directly."
    echo
    exit 1
fi

echo "Building the standalone HTML file..."
if ! node tools/build-standalone.js; then
    echo
    echo "[ERROR] Build failed. Please check the message above."
    exit 1
fi

echo
echo "Done. Copy this file to your tablet:"
echo "  standalone/small-step-big-leap.html"
echo
