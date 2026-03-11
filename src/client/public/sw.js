/**
 * VedaClue Service Worker
 * Strategy:
 *   - Static assets (JS/CSS/fonts/images): Cache-first (stale-while-revalidate)
 *   - API requests (/api/): Network-first with 5 s timeout, no caching
 *   - HTML navigation: Network-first, fallback to cached shell
 */

const CACHE_NAME = 'vedaclue-v1';
const SHELL_URL  = '/';

// Assets to pre-cache on install (shell)
const PRECACHE = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ─── Install ──────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).catch(() => {})
  );
});

// ─── Activate ─────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API calls → network only (never cache auth/data)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static hashed assets (JS/CSS bundles have hash in filename) → cache-first
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Images → cache-first (with background revalidate)
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // HTML / navigation → network-first, fallback to shell
  event.respondWith(networkFirstWithShellFallback(request));
});

// ─── Strategies ───────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstWithShellFallback(request) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fall back to app shell (SPA root)
    const shell = await caches.match(SHELL_URL);
    return shell || new Response(offlinePage(), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function offlinePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>VedaClue – Offline</title>
  <style>
    body { margin:0; font-family: sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#fff1f2; }
    .card { text-align:center; padding:40px 24px; border-radius:24px; background:#fff; box-shadow:0 4px 32px rgba(0,0,0,0.08); max-width:320px; }
    .icon { font-size:56px; margin-bottom:16px; }
    h1 { color:#f43f5e; margin:0 0 8px; font-size:22px; font-weight:800; }
    p  { color:#6b7280; font-size:14px; margin:0 0 24px; line-height:1.5; }
    button { background:linear-gradient(135deg,#f43f5e,#db2777); color:#fff; border:none; border-radius:14px; padding:12px 28px; font-size:14px; font-weight:700; cursor:pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🌸</div>
    <h1>You're offline</h1>
    <p>VedaClue needs a connection to load your health data. Check your internet and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`;
}

// ─── Push Notifications (future use) ─────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'VedaClue', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'VedaClue', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'vedaclue',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const url = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
