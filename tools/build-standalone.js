/* ============================================================
   単一HTMLファイル版 ビルドスクリプト

   なぜ必要か:
   Androidの「ファイル」アプリからHTMLを開くと、Chromeには file:// ではなく
   content:// という「フォルダの概念が無い」アドレスで渡される。
   そのため <script src="vendor/..."> のような相対パス参照が一切解決できず、
   CSSもJSも読み込まれないまま真っ黒な画面になる。

   対策として、CSS・JS・フォント・画像をすべて1枚のHTMLに埋め込み、
   相対パス参照をゼロにしたファイルを生成する。
   画面遷移(experience.html <-> dashboard.html)もページ内の表示切り替えに置き換える。

   使い方: npm run build:standalone
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'standalone');
const OUT_FILE = path.join(OUT_DIR, 'small-step-big-leap.html');

const read = (...p) => fs.readFileSync(path.join(PUBLIC_DIR, ...p), 'utf8');
const readB64 = (...p) => fs.readFileSync(path.join(PUBLIC_DIR, ...p)).toString('base64');

/* インライン化するJSに "</script" が含まれるとHTMLのパースがそこで打ち切られる。
   (minifiedバンドルの文字列リテラル内に現れることがある) */
const escapeForInlineScript = (js) => js.replace(/<\/script/gi, '<\\/script');

/* <body> の中身だけを取り出す */
function extractBody(html) {
    const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (!m) throw new Error('<body> が見つかりませんでした');
    return m[1];
}

/* markup から <script> を取り除きつつ、インラインJSの中身は回収する */
function splitScripts(bodyHtml) {
    const inlineScripts = [];
    const markup = bodyHtml.replace(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
        (_full, attrs, inner) => {
            // src 属性付き(外部ファイル参照)は破棄。必要なものは後で明示的にインライン化する
            if (/\bsrc\s*=/i.test(attrs)) return '';
            inlineScripts.push(inner);
            return '';
        }
    );
    return { markup, inlineScripts };
}

// ---------- 1. 各パーツの読み込み ----------
const introHtml = read('experience.html');
const indexHtml = read('dashboard.html');

const intro = splitScripts(extractBody(introHtml));
const dashboard = splitScripts(extractBody(indexHtml));

// ---------- 2. CSS ----------
// フォントCSSの url(./xxx.woff2) を data URI に差し替える
let fontCss = read('vendor', 'fonts', 'zen-maru-gothic.css');
fontCss = fontCss.replace(/url\(\.\/(zen-maru-gothic-\d+\.woff2)\)/g, (_m, file) => {
    return `url(data:font/woff2;base64,${readB64('vendor', 'fonts', file)})`;
});

// イントロ用CSS。
// 元の `html, body { ... }` はページ全体を overflow:hidden に固定してしまい、
// スクロールが必要なダッシュボードと衝突するため、イントロ表示中だけに限定する。
let introCss = read('index.css');
const HTML_BODY_RULE = /html,\s*body\s*\{/;
if (!HTML_BODY_RULE.test(introCss)) {
    throw new Error('index.css の `html, body {` ルールが見つかりませんでした(構造変更?)');
}
introCss = introCss.replace(
    HTML_BODY_RULE,
    'html.ssbl-mode-intro, html.ssbl-mode-intro body {'
);

// ダッシュボード表示中の body スタイル(元 dashboard.html の <style> 相当)
const dashboardCss = `
html.ssbl-mode-dashboard, html.ssbl-mode-dashboard body {
    width: 100%;
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    background-color: #05010d;
    color: #ffffff;
    font-family: 'Zen Maru Gothic', sans-serif;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
}
/* ビュー切り替え。index.css 側に display 指定を持つ要素があるため !important で確実に隠す */
#view-intro[hidden], #view-dashboard[hidden] { display: none !important; }

/* 元の experience.html では body 直下だった要素をラッパーで包んでいるため、
   #renderCanvas の height:100% が解決できるようラッパーにも高さを与える */
#view-intro { width: 100%; height: 100%; }
`;

// ---------- 3. ダッシュボード背景テクスチャ ----------
// dashboard.html 側は style 属性で相対パス指定しているので、それを data URI に差し替える
const STARDUST_URL = "url('vendor/textures/stardust.png')";
if (!dashboard.markup.includes(STARDUST_URL)) {
    throw new Error('dashboard.html の stardust 背景指定が見つかりませんでした(構造変更?)');
}
const stardustDataUri = `data:image/png;base64,${readB64('vendor', 'textures', 'stardust.png')}`;
dashboard.markup = dashboard.markup.replace(
    STARDUST_URL,
    `url('${stardustDataUri}')`
);

// ---------- 4. ビュー切り替えシェル ----------
const shellJs = `
/* 単一ファイル版のビュー切り替え。
   通常配信版では別ファイルへの遷移だった部分を、ページ内の表示切り替えに置き換える。
   runtime.js の SSBL.navigate() から window.SSBL_SHOW_VIEW として呼ばれる。 */
(function () {
    function show(name) {
        var intro = document.getElementById('view-intro');
        var dash = document.getElementById('view-dashboard');
        var target = (name === 'dashboard') ? 'dashboard' : 'intro';

        if (target === 'dashboard') {
            // 証明書を描画できない(未発行/破損)ならイントロに戻す
            var ok = typeof window.SSBL_RENDER_DASHBOARD === 'function' && window.SSBL_RENDER_DASHBOARD();
            if (!ok) { show('intro'); return; }
        }

        if (target === 'intro' && window.__ssblIntroFinished) {
            // 一度完走したあとの「もう一度見る」。3Dエンジンは破棄済みで
            // 作り直しが難しいため、単一ファイルごと読み直して初期状態に戻す。
            window.location.reload();
            return;
        }

        intro.hidden = (target !== 'intro');
        dash.hidden = (target !== 'dashboard');
        document.documentElement.className = 'ssbl-mode-' + target;
        window.scrollTo(0, 0);

        if (target === 'intro' && typeof window.SSBL_START_INTRO === 'function') {
            window.SSBL_START_INTRO();
        }
    }

    window.SSBL_SHOW_VIEW = show;

    document.addEventListener('DOMContentLoaded', function () {
        // 証明書が既にあればダッシュボード、無ければイントロから
        show(SSBL.storage.get('adventureCertificate') ? 'dashboard' : 'intro');
    });
})();
`;

// ---------- 5. 組み立て ----------
// Tailwind Play CDN の preflight(全体リセット)は、イントロ側の index.css と
// 衝突する可能性があるため無効化する。ダッシュボードのリセットは index.css の
// `*, *::before, *::after` ルールが担う。
const tailwindConfigJs = `window.tailwind = window.tailwind || {};
window.tailwind.config = { corePlugins: { preflight: false } };`;

const html = `<!DOCTYPE html>
<html lang="ja" class="ssbl-mode-intro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0a0a2e">
<title>✨ ようこそ！冒険のはじまり</title>
<!--
  このファイルは tools/build-standalone.js が自動生成した単一HTMLファイルです。
  外部ファイルを一切参照しないため、タブレットにこの1ファイルを置くだけで動きます。

  【ご家庭用に書き換える方法】
  すぐ下の「ここから」〜「ここまで」の間だけをテキストエディタで書き換えれば、
  お子様のお名前やお約束の文章をご家庭用に変更できます(ビルド作業は不要です)。
  ※このファイルは大きいため、メモ帳よりも VS Code や Notepad++ を推奨します。

  リポジトリから作り直す場合は public/config.js を編集してから
  build_standalone.bat をダブルクリック(または npm run build:standalone)してください。
-->

<!-- ▼▼▼ ここからご家庭用の設定(自由に書き換えてください) ▼▼▼ -->
<script>
${escapeForInlineScript(read('config.js'))}
</script>
<!-- ▲▲▲ ここまで。これより下は書き換えないでください ▲▲▲ -->

<style>
${fontCss}
</style>
<style>
${introCss}
</style>
<style>
${dashboardCss}
</style>
<script>${escapeForInlineScript(tailwindConfigJs)}</script>
<script>${escapeForInlineScript(read('vendor', 'tailwind', 'tailwind.js'))}</script>
</head>
<body>

<div id="view-intro">
${intro.markup}
</div>

<div id="view-dashboard" class="relative min-h-screen overflow-x-hidden pb-12" hidden>
${dashboard.markup}
</div>

<script>${escapeForInlineScript(read('vendor', 'babylonjs', 'babylon.js'))}</script>
<script>${escapeForInlineScript(read('runtime.js'))}</script>
<script>${escapeForInlineScript(shellJs)}</script>
<script>${escapeForInlineScript(dashboard.inlineScripts.join('\n'))}</script>
<script>${escapeForInlineScript(read('app.js'))}</script>

</body>
</html>
`;

// ---------- 6. 出力 & 検証 ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, html, 'utf8');

// 相対パス参照が残っていないか(=外部ファイルを読みに行かないか)を機械的に確認する。
// 検査対象は自前のCSSとマークアップのみ。圧縮済みベンダーJSは文字列リテラルに
// "url(" 等を含み誤検出するため対象外にする(そもそも実行時に外部を読まないことは確認済み)。
const leftovers = [];
const checkedCss = [fontCss, introCss, dashboardCss].join('\n');
const checkedMarkup = [intro.markup, dashboard.markup].join('\n');

const cssUrlRefs = checkedCss.match(/url\(\s*['"]?(?!data:)[^)'"]+\)/gi) || [];
cssUrlRefs.forEach((ref) => leftovers.push(`CSS: ${ref.slice(0, 120)}`));

const markupRefs = checkedMarkup.match(/\b(?:src|href)\s*=\s*['"](?!data:|#)[^'"]+['"]/gi) || [];
markupRefs.forEach((ref) => leftovers.push(`markup: ${ref.slice(0, 120)}`));

const sizeMb = (Buffer.byteLength(html, 'utf8') / 1024 / 1024).toFixed(2);
console.log(`生成しました: ${path.relative(ROOT, OUT_FILE)} (${sizeMb} MB)`);

if (leftovers.length) {
    console.error('外部ファイルへの参照が残っています:');
    leftovers.forEach((l) => console.error('  - ' + l));
    process.exit(1);
}
console.log('外部ファイル参照: なし (単一ファイルで完結)');
