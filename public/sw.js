/* H.A. Overseas Order Creator service worker (FE-15, hand-rolled).
 *
 * Caching rules — deliberately conservative because this app handles
 * authenticated orders, invoices and payments:
 *   - Static build assets (JS/CSS/icons/fonts/images): cache-first.
 *   - Navigations / pages: network-first, falling back to the cached
 *     app shell when offline.
 *   - Product catalog API (GET /api/products*): stale-while-revalidate —
 *     the only API surface that is public and safe to cache.
 *   - EVERY other API request (orders, invoices, payments, auth, …):
 *     network-only. Authenticated responses are never written to a cache.
 *   - Non-GET requests are never intercepted for caching.
 *
 * Bump CACHE_VERSION on every release so `activate` purges old caches.
 */
const CACHE_VERSION = 'hao-v0.9.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const CATALOG_CACHE = `${CACHE_VERSION}-catalog`;
const KNOWN_CACHES = [STATIC_CACHE, PAGES_CACHE, CATALOG_CACHE];

const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo.jpg', '/logo-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !KNOWN_CACHES.includes(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isCatalogApi(url) {
  return url.pathname.startsWith('/api/products');
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(request, url) {
  return (
    ['script', 'style', 'image', 'font'].includes(request.destination) ||
    /\.(?:js|css|png|jpe?g|svg|ico|webp|woff2?)$/.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const shell = await caches.match('/index.html');
    if (shell) return shell;
    throw new Error('Offline and no cached page available');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CATALOG_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) {
    // Refresh in the background; serve the cached copy immediately.
    network.catch(() => {});
    return cached;
  }
  const response = await network;
  if (response) return response;
  throw new Error('Offline and catalog not cached yet');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  // The API may live on a different origin (VITE_API_URL); match it by
  // path so the catalog rule applies either way.
  if (isApiRequest(url)) {
    if (isCatalogApi(url)) {
      event.respondWith(staleWhileRevalidate(request));
    }
    // All other API traffic: do not respondWith — the browser performs a
    // plain network request and nothing is cached.
    return;
  }

  if (!sameOrigin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirst(request));
  }
});
