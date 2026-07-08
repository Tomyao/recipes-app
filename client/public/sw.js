// Hand-written service worker (no Workbox). Lives in public/ so it is served
// byte-for-byte at the origin root ("/sw.js") in both `vite dev` and the
// production build — files under src/ are only emitted if they're part of
// the JS module graph, which a standalone worker script isn't.
//
// Bump CACHE_VERSION whenever precached asset contents change; activate()
// sweeps any cache whose name doesn't match the current version.
const CACHE_VERSION = "v1";
const PRECACHE = `recipes-precache-${CACHE_VERSION}`;
const STATIC_CACHE = `recipes-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `recipes-images-${CACHE_VERSION}`;
const API_CACHE = `recipes-api-${CACHE_VERSION}`;
const ALL_CACHES = [PRECACHE, STATIC_CACHE, IMAGE_CACHE, API_CACHE];

const OFFLINE_URL = "/offline.html";

// App shell: the handful of unhashed files we can name up front. Hashed
// build output (JS/CSS bundles) is picked up opportunistically by the
// "static assets" runtime strategy below the first time each is requested.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.error("[sw] precache failed", err)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !ALL_CACHES.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Lets the client trigger activation of a waiting worker immediately
// (paired with the "new version available" toast in registerSW.ts).
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Full-page navigations: network-first so users get fresh HTML when
  // online, falling back to a cached copy or the offline page when not.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Our own proxy API.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    if (url.pathname === "/api/categories") {
      event.respondWith(staleWhileRevalidate(request, API_CACHE));
    } else {
      // search / meal / filter — favor fresh results, fall back to cache offline.
      event.respondWith(networkFirst(request, API_CACHE));
    }
    return;
  }

  // Recipe photos (TheMealDB's CDN is cross-origin) and any local images.
  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Hashed JS/CSS/font build output — safe to cache aggressively.
  if (["script", "style", "font"].includes(request.destination)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

/** Try the network; on success, refresh the cache. On failure, serve the cache, then the offline page. */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(PRECACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? (await caches.match(OFFLINE_URL));
  }
}

/** Network-first for API data: fresh when online, last-known-good when not. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

/** Serve from cache immediately (if present) while revalidating in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached ?? (await networkFetch) ?? Response.error();
}

/** Cache-first for immutable, content-hashed static assets. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
