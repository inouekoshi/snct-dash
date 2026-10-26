// 高専ダッシュ！ Service Worker
// ・ゲーム画面（HTML）はネット優先。つながらないときだけ前回のキャッシュを出す（デプロイ直後も古い画面が残らない）
// ・/_next/static は中身が変わるとURLも変わるので、キャッシュ優先でよい
// ・API（ランキング・登録）はキャッシュしない
// キャッシュの中身を変えたら VERSION を上げる（古いキャッシュは activate で消える）
const VERSION = 'v1'
const PAGES = `kosendash-pages-${VERSION}`
const ASSETS = `kosendash-assets-${VERSION}`
const PRECACHE = ['/', '/game', '/leaderboard', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGES).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/sponsor/')) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(PAGES).then((cache) => cache.put(req, res.clone()))
          return res
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/')) || Response.error()),
    )
  }
})
