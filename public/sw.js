const CACHE_NAME = "leonix-v5";

const APP_SHELL_URLS = [
  "/", "/index.html", "/site.webmanifest", "/favicon.ico", "/favicon.svg",
  "/favicon-96x96.png", "/apple-touch-icon.png", "/logo leonix 5.svg",
  "/theme-init.js", "/web-app-manifest-192x192.png", "/web-app-manifest-512x512.png",
];

const STATIC_DESTINATIONS = new Set(["script", "style", "image", "font", "manifest"]);

// ── Helpers ─────────────────────────────────────────────────────────────

function offlineResponse(message = "Recurso no disponible sin conexión") {
  return new Response(message, {
    status: 503, statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function appShellFallback() {
  return caches.match("/index.html") || offlineResponse("Aplicación no disponible sin conexión");
}

async function safeCachePut(request, response) {
  try {
    if (!response.ok) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch { /* ignore */ }
}

async function cacheUrls(cache, urls) {
  await Promise.allSettled(
    urls.map(async (url) => {
      const r = await fetch(url, { cache: "reload" });
      if (r.ok) await cache.put(url, r.clone());
    }),
  );
}

async function discoverBuildAssets() {
  try {
    const r = await fetch("/index.html", { cache: "reload" });
    if (!r.ok) return [];
    const html = await r.text();
    const urls = new Set();
    const re = /\b(?:src|href)=["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const u = new URL(m[1], self.location.origin);
      if (u.origin === self.location.origin) urls.add(u.pathname + u.search);
    }
    return Array.from(urls);
  } catch { return []; }
}

// ── Install: cache app shell only ───────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cacheUrls(cache, APP_SHELL_URLS);
      await cacheUrls(cache, await discoverBuildAssets());
      await self.skipWaiting();
    }),
  );
});

// ── Activate: purge ALL legacy API caches + claim ───────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => {
        // Keep only current app-shell cache; delete everything else
        if (n === CACHE_NAME) return undefined;
        return caches.delete(n);
      }))
    ).then(() => self.clients.claim()),
  );
});

// ── Notify in-app encrypted coordinator to sync ─────────────────────────
async function notifyAppSync() {
  const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({ type: "SYNC_TO_APP" });
  }
}

// ── Fetch: API = network-only; static = stale-while-revalidate ──────────
self.addEventListener("fetch", (event) => {
  try {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (/^(chrome|moz-extension|data|blob|file):/.test(url.protocol)) return;

    // ALL /api/ requests: network-only, NO cache read/write
    // Authenticated responses, tenant-scoped data, offline protocol — never cached
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(
        (async () => {
          try { return await fetch(request); }
          catch { return offlineResponse("Endpoint no disponible sin conexión"); }
        })()
      );
      return;
    }

    // Navigation: network-first → app shell fallback
    if (request.mode === "navigate") {
      event.respondWith(
        (async () => {
          try { return await fetch(request); }
          catch { return appShellFallback(); }
        })()
      );
      return;
    }

    // Static assets: stale-while-revalidate (same-origin immutable files)
    if (STATIC_DESTINATIONS.has(request.destination)) {
      event.respondWith(staleWhileRevalidate(request));
      return;
    }

    // Other same-origin: network-first
    event.respondWith(
      (async () => {
        try { return await fetch(request); }
        catch { return (await caches.match(request)) || offlineResponse(); }
      })()
    );
  } catch {
    try { event.respondWith(offlineResponse("Error en Service Worker")); } catch { /* already responded */ }
  }
});

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then(async (res) => {
    if (res.ok) await safeCachePut(request, res);
    return res;
  }).catch(() => undefined);
  if (cached instanceof Response) return cached;
  const net = await networkPromise;
  return (net instanceof Response) ? net : offlineResponse();
}

// ── Message handling ────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "TRIGGER_SYNC") {
    event.waitUntil(notifyAppSync());
  }
  // Logout/purge: delete ALL caches (API + app shell)
  if (event.data?.type === "LOGOUT" || event.data?.type === "SESSION_INVALIDATED") {
    event.waitUntil(
      caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "offline-sync") {
    event.waitUntil(notifyAppSync());
  }
});

// ── Push notifications ──────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { message: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(payload.title || "Nueva notificación", {
    body: payload.message || payload.body || "",
    icon: payload.icon || "/logo leonix 5.svg",
    badge: payload.badge || "/logo leonix 5.svg",
    data: payload.data || { url: "/ordenes-trabajo" },
    tag: payload.tag || "leonix-push",
    renotify: true,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/ordenes-trabajo";
  const url = new URL(targetUrl, self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) { if ("focus" in c) { c.navigate(url.href); return c.focus(); } }
      if (clients.openWindow) return clients.openWindow(url.href);
    }),
  );
});
