// Vision Wealth Service Worker
// Strategy: Cache-first for static assets, Network-first for API/pages, Offline fallback

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `vision-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `vision-dynamic-${CACHE_VERSION}`;
const API_CACHE = `vision-api-${CACHE_VERSION}`;

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/watchlist',
  '/screener',
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Max entries for dynamic cache to prevent unbounded growth
const DYNAMIC_CACHE_MAX = 60;
const API_CACHE_MAX = 30;
const API_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently skip URLs that fail (e.g. /offline page not yet built)
      })
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/screenshots/') ||
    /\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf|otf|css)$/.test(url.pathname)
  );
}

function isApiRoute(url) {
  return url.pathname.startsWith('/api/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
  }
}

// ─── Fetch: routing strategies ───────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin + https requests (skip chrome-extension, etc.)
  if (!['http:', 'https:'].includes(url.protocol)) return;
  // Skip non-GET requests (POST/PATCH/DELETE go straight to network)
  if (event.request.method !== 'GET') return;

  // 1. Static assets → Cache First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 2. Live market / screener APIs → always network (no stale quotes)
  if (isApiRoute(url)) {
    const livePaths = ['/api/watchlist', '/api/search', '/api/screener'];
    if (livePaths.some((p) => url.pathname.startsWith(p))) {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
      );
      return;
    }
    event.respondWith(networkFirstWithTTL(event.request, API_CACHE, API_CACHE_TTL_MS, API_CACHE_MAX));
    return;
  }

  // 3. Page navigations → Network First with dynamic cache fallback
  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  // 4. Everything else → Network First with dynamic cache
  event.respondWith(networkFirst(event.request, DYNAMIC_CACHE, DYNAMIC_CACHE_MAX));
});

// ─── Strategy: Cache First ────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

// ─── Strategy: Network First ──────────────────────────────────────────────────
async function networkFirst(request, cacheName, maxEntries) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      trimCache(cacheName, maxEntries);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// ─── Strategy: Network First for API with TTL ─────────────────────────────────
async function networkFirstWithTTL(request, cacheName, ttlMs, maxEntries) {
  // Check cache freshness via custom header stored in response
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    const cachedAt = cached.headers.get('x-sw-cached-at');
    if (cachedAt && Date.now() - Number(cachedAt) < ttlMs) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone and inject cache timestamp header
      const headers = new Headers(response.headers);
      headers.set('x-sw-cached-at', String(Date.now()));
      const cachedResponse = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, cachedResponse);
      trimCache(cacheName, maxEntries);
    }
    return response;
  } catch {
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline — cached data unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─── Strategy: Network First for Navigation with offline fallback ─────────────
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_MAX);
    }
    return response;
  } catch {
    // Try exact URL match first
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fall back to cached homepage shell
    const shell = await caches.match('/');
    if (shell) return shell;
    // Last resort: offline page
    const offline = await caches.match('/offline');
    return offline || new Response('<h1>You are offline</h1>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ─── Background Sync: retry failed watchlist mutations ───────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-watchlist') {
    event.waitUntil(replayPendingRequests());
  }
});

async function replayPendingRequests() {
  // Reads queued requests from IndexedDB (populated by the app when offline)
  try {
    const db = await openDB();
    const tx = db.transaction('pending-requests', 'readwrite');
    const store = tx.objectStore('pending-requests');
    const all = await storeGetAll(store);
    for (const item of all) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        await store.delete(item.id);
      } catch {
        // Leave in queue for next sync
      }
    }
  } catch {
    // IndexedDB not available
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vision-sw-db', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}

function storeGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}

// ─── Push Notifications (price alerts) ───────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }

  const title = payload.title || 'Vision Wealth Alert';
  const options = {
    body: payload.body || 'Price alert triggered.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: payload.tag || 'vision-alert',
    renotify: true,
    data: { url: payload.url || '/watchlist' },
    actions: [
      { action: 'view', title: 'View Stock' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/watchlist';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
