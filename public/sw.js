const CACHE_NAME = "setlistmaker-shell-v4";

// Derived from the registration scope rather than hardcoded, so this works
// whether the site is served from the root or a subpath (e.g. a GitHub
// Pages project site at /setlistmaker/).
const BASE = new URL(self.registration.scope).pathname;
const STATIC_PREFIX = `${BASE}_next/static/`;
const APP_SHELL = [`${BASE}manifest.webmanifest`];

/**
 * Stores a freshly fetched copy of the HTML shell, precaches every hashed
 * build asset it references, and prunes cached build assets it no longer
 * references (left over from previous deploys).
 *
 * This runs on install AND on every successful navigation: sw.js itself
 * doesn't change between deploys, so install alone would never see a new
 * build. Precaching here (rather than waiting for the page to request each
 * asset) is what makes the app work offline right after the first visit —
 * on that visit the assets load before the service worker controls the page.
 */
async function refreshShell(response) {
  const cache = await caches.open(CACHE_NAME);
  const html = await response.clone().text();
  await cache.put(BASE, response);

  const referenced = new Set(
    [...html.matchAll(/_next\/static\/[\w\-.~/]+/g)].map((m) => `${BASE}${m[0]}`)
  );

  // Fonts are only referenced from the stylesheets (via relative url(...)),
  // so follow those too — otherwise they'd be pruned on every navigation.
  const cssPaths = [...referenced].filter((path) => path.endsWith(".css"));
  await Promise.all(
    cssPaths.map(async (path) => {
      try {
        const res = (await cache.match(path)) ?? (await fetch(path));
        if (!res.ok) return;
        const css = await res.clone().text();
        const cssUrl = new URL(path, self.location.origin);
        for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
          const { pathname } = new URL(m[1], cssUrl);
          if (pathname.startsWith(STATIC_PREFIX)) referenced.add(pathname);
        }
      } catch {
        // Offline or blocked — skip; the asset gets cached on demand instead.
      }
    })
  );

  const cachedRequests = await cache.keys();
  const cachedPaths = new Set(cachedRequests.map((req) => new URL(req.url).pathname));

  await Promise.all(
    cachedRequests
      .filter((req) => {
        const { pathname } = new URL(req.url);
        return pathname.startsWith(STATIC_PREFIX) && !referenced.has(pathname);
      })
      .map((req) => cache.delete(req))
  );

  // Best-effort: one missing asset shouldn't abort the rest.
  await Promise.all(
    [...referenced]
      .filter((path) => !cachedPaths.has(path))
      .map((path) =>
        fetch(path)
          .then((res) => (res.ok ? cache.put(path, res) : undefined))
          .catch(() => undefined)
      )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => fetch(BASE))
      .then((response) => (response.ok ? refreshShell(response) : undefined))
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
    pathname.startsWith(STATIC_PREFIX) ||
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
          // Only a good response may replace the cached shell — otherwise a
          // 404/500 page would be served as the app when offline.
          if (response.ok) event.waitUntil(refreshShell(response.clone()));
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
