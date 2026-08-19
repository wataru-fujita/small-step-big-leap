/* ============================================
   SSBL Runtime — 実行環境の差を吸収する薄い層
   ============================================

   このアプリは2通りの開き方をされる:

   (A) 通常配信モード
       HTTPサーバー(npm run dev / python -m http.server)や file:// でフォルダごと開く。
       experience.html と dashboard.html は別ファイルとして遷移する。

   (B) 単一ファイルモード
       tools/build-standalone.js が生成する1枚のHTML。
       Androidのファイルアプリから開くと content:// という
       「フォルダの概念が無い」アドレスで渡されるため、相対パスが一切使えない。
       そのため全アセットを埋め込み、画面遷移もページ内の表示切り替えで行う。

   この2つの違いを navigate() と storage で吸収し、
   app.js / dashboard.html 側は同じコードのまま両方で動くようにする。
*/
(function () {
    'use strict';

    // ----- localStorage フォールバック -----
    // content:// や data: のような不透明オリジンでは localStorage への
    // アクセス自体が例外を投げる。その場合はメモリ上に保持して、
    // 少なくともその場の一連の流れ(同意 → 証明書表示)が完走するようにする。
    // ※メモリ保持なのでアプリを閉じると消える点は仕様上どうにもならない。
    var memoryStore = {};
    var localStorageUsable = (function () {
        try {
            var probe = '__ssbl_probe__';
            window.localStorage.setItem(probe, '1');
            window.localStorage.removeItem(probe);
            return true;
        } catch (e) {
            return false;
        }
    })();

    var storage = {
        isPersistent: localStorageUsable,

        get: function (key) {
            if (localStorageUsable) {
                try {
                    var value = window.localStorage.getItem(key);
                    // null の場合はメモリ側を見に行く。
                    // localStorage が「読めるが書けない」状態(容量超過やプライベート
                    // モード等)だと、set() が失敗して値がこちらに無いことがあるため。
                    if (value !== null) return value;
                } catch (e) {
                    /* 途中で使えなくなった場合もメモリへフォールバック */
                }
            }
            return Object.prototype.hasOwnProperty.call(memoryStore, key)
                ? memoryStore[key]
                : null;
        },

        set: function (key, value) {
            memoryStore[key] = String(value);
            if (localStorageUsable) {
                try {
                    window.localStorage.setItem(key, value);
                } catch (e) {
                    /* 容量超過やプライベートモード等。メモリ側には入っているので続行 */
                }
            }
        },

        remove: function (key) {
            delete memoryStore[key];
            if (localStorageUsable) {
                try {
                    window.localStorage.removeItem(key);
                } catch (e) {
                    /* 無視して続行 */
                }
            }
        }
    };

    // ----- 画面遷移 -----
    // target: 'intro' | 'dashboard'
    function navigate(target) {
        // 単一ファイルモード: ページ内でビューを切り替える
        // (ビルドスクリプトが window.SSBL_SHOW_VIEW を注入する)
        if (typeof window.SSBL_SHOW_VIEW === 'function') {
            window.SSBL_SHOW_VIEW(target);
            return;
        }
        // 通常配信モード: 従来通りファイル間を遷移する
        window.location.href = target === 'dashboard' ? 'dashboard.html' : 'experience.html';
    }

    // 保存されている状態のキー
    var KEYS = {
        certificate: 'adventureCertificate',   // 発行済みのオーナー証
        // 旧版が保存していた「準備済みフラグ」。現在は参照していないが、
        // 以前のバージョンを試した端末に残っているため reset() で掃除する。
        prepared: 'ssblIntroPrepared'
    };

    // 初期状態に戻す(証明書を破棄して、最初の演出から見られるようにする)
    function reset() {
        storage.remove(KEYS.certificate);
        storage.remove(KEYS.prepared);
    }

    // URLの末尾に ?reset を付けて開くと、初期状態から始められる
    // 例: file:///sdcard/Download/small-step-big-leap.html?reset
    if (/(^|[?&#])reset(\b|=)/.test(window.location.search + window.location.hash)) {
        reset();
    }

    window.SSBL = {
        navigate: navigate,
        storage: storage,
        keys: KEYS,
        reset: reset
    };
})();
