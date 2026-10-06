const CACHE_NAME = "setlistmaker-shell-v3";

// Derived from the registration scope rather than hardcoded, so this works
// whether the site is served from the root or a subpath (e.g. a GitHub
// Pages project site at /setlistmaker/).
const BASE = new URL(self.registration.scope).pathname;
const APP_SHELL = [BASE, `${BASE}manifest.webmanifest`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith(`${BASE}_next/static/`) ||
    pathname.startsWith(`${BASE}icons/`) ||
    pathname === `${BASE}manifest.webmanifest`
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // The HTML document itself: always prefer the network so a new build/
  // deploy is picked up immediately. A cache-first navigation response is
  // a classic PWA trap — it would keep serving an old page (with script
  // references that may no longer exist) indefinitely. Only fall back to
  // the cached shell when genuinely offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(BASE, copy));
          return response;
        })
        .catch(() => caches.match(BASE))
    );
    return;
  }

  // Hashed build assets and icons are immutable per URL, so cache-first is
  // safe and avoids a network round-trip on repeat visits.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first, falling back to cache if offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
