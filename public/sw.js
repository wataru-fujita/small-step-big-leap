/* ============================================
   Service Worker — オフラインキャッシュ
   一度読み込んだアセットをキャッシュしておき、
   以降はネット接続が無くても起動できるようにする。
   ============================================ */

// キャッシュの中身を更新したいときは、このバージョン文字列を変更する
// (変更すると古いキャッシュが破棄され、新しいキャッシュが作られる)
const CACHE_NAME = 'ssbl-cache-v2';

// 起動に必要な最低限のファイル一式(初回アクセス時にまとめて取得・保存する)
const PRECACHE_URLS = [
  './experience.html',
  './dashboard.html',
  './app.js',
  './runtime.js',
  './sw-register.js',
  './config.js',
  './index.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './vendor/babylonjs/babylon.js',
  './vendor/tailwind/tailwind.js',
  './vendor/fonts/zen-maru-gothic.css',
  './vendor/fonts/zen-maru-gothic-400.woff2',
  './vendor/fonts/zen-maru-gothic-700.woff2',
  './vendor/fonts/zen-maru-gothic-900.woff2',
  './vendor/textures/stardust.png',
];

// インストール時: 上記ファイルをまとめてキャッシュに保存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 有効化時: 古いバージョンのキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* 取得方針は2種類に分ける。

   ネットワーク優先(network-first):
     HTMLと config.js。
     すべてキャッシュ優先にしてしまうと、保護者が config.js で名前やお約束を
     書き換えても古い内容が表示され続け、「config.js を書き換えるだけ」という
     使い方が成立しなくなるため。
     オフライン時はキャッシュにフォールバックするので、オフライン動作は保たれる。

   キャッシュ優先(cache-first):
     Babylon.js・フォント・画像など、書き換える必要のない大きなファイル。
     毎回ネットワークを見に行かないぶん起動が速い。 */
function isAlwaysFresh(request) {
  if (request.mode === 'navigate') return true;
  const path = new URL(request.url).pathname;
  return path.endsWith('/config.js') || path.endsWith('.html');
}

function putInCache(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (isAlwaysFresh(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => putInCache(event.request, response))
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => putInCache(event.request, response))
        .catch(() => cached);
    })
  );
});
