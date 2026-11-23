// ─────────────────────────────────────────────────────────────────────────────
// Ganga Aarti Booking — service worker (PWA offline support).
//
// Neeyam (suraksha ke liye sakht):
//  • Sirf SAME-ORIGIN GET requests handle hote hain.
//  • Cross-origin requests (Supabase API / storage aadi) ko KABHI nahi roka
//    jata — booking, payment aur login ka data hamesha live network se jata hai.
//  • Non-GET (POST/PUT/DELETE) requests ko bhi haath nahi lagaya jata.
//  • Page navigations: network-first, offline par cached home page fallback.
//  • Static assets (hashed JS/CSS, images, fonts, icons): cache-first.
// Naya deploy aane par CACHE_NAME ka version badhayein (v1 → v2 …).
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_NAME = 'gab-cache-v1'
const PRECACHE_URLS = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => { /* precache fail ho to bhi install aage badhe */ })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/images/')
    || url.pathname.startsWith('/icons/')
    || /\.(?:js|css|png|jpe?g|svg|webp|gif|ico|woff2?|ttf)$/i.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  let url
  try { url = new URL(request.url) } catch { return }
  if (url.origin !== self.location.origin) return // cross-origin — hamesha live

  // Page navigations — network pehle, offline par cache/home fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
          return res
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: true }))
          || (await caches.match('/'))
          || Response.error())
    )
    return
  }

  // Static assets — cache pehle (hashed file-naam wale hamesha surakshit).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return res
      }))
    )
  }
  // Baaki same-origin GET (jaise sitemap/robots) — browser ka default network.
})
