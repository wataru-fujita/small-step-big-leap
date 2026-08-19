/* Service Worker 登録
   一度読み込めば、以降はネット接続が無くても起動できるようにする。
   file:// では Service Worker が使えないため、その場合は何もしない。
   ※単一ファイル版(standalone)ではこのファイルは同梱されない。 */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function (err) {
            console.warn('Service Worker registration failed:', err);
        });
    });
}
