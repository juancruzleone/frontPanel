const SHELL_VERSION = "v6";
const LEGACY_CACHE_NAME = `leonix-shell-${SHELL_VERSION}`;
const GENERATION_CACHE_PREFIX = `${LEGACY_CACHE_NAME}-generation-`;
const METADATA_CACHE_NAME = `${LEGACY_CACHE_NAME}-metadata`;
const ACTIVE_GENERATION_URL = "/__leonix_active_generation__";
const PREVIOUS_GENERATION_URL = "/__leonix_previous_generation__";
const PENDING_GENERATION_URL = "/__leonix_pending_generation__";
const SHELL_COMPLETE_URL = "/__leonix_shell_complete__";
const SHELL_ASSET_LIST_URL = "/__leonix_shell_assets__";
const BUILD_MANIFEST_URL = "/asset-manifest.json";

let activeGeneration = null;
let canonicalRefreshQueue = Promise.resolve();

const CORE_SHELL_URLS = [
  "/site.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/favicon-96x96.png",
  "/apple-touch-icon.png",
  "/logo leonix 5.svg",
  "/theme-init.js",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

function offlineResponse(message = "Recurso no disponible sin conexión") {
  return new Response(message, {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function isValidResponse(response) {
  return response instanceof Response && response.ok;
}

function isHtmlResponse(response) {
  return isValidResponse(response) &&
    (response.headers.get("Content-Type") || "").includes("text/html");
}

function isLocalDevelopmentHost() {
  return ["localhost", "127.0.0.1"].includes(self.location.hostname);
}

function requestKey(value) {
  const source = typeof value === "string"
    ? value
    : value instanceof URL
      ? value.href
      : value.url;
  const url = new URL(source, self.location.origin);
  try {
    return decodeURI(url.pathname) + url.search;
  } catch {
    return url.pathname + url.search;
  }
}

function isAllowedShellUrl(value) {
  const key = requestKey(value);
  if (["/", "/index.html", SHELL_COMPLETE_URL, SHELL_ASSET_LIST_URL].includes(key)) return true;
  if (CORE_SHELL_URLS.includes(key) || key.startsWith("/assets/")) return true;
  return isLocalDevelopmentHost() && (
    key.startsWith("/src/") || key.startsWith("/@") || key.startsWith("/node_modules/")
  );
}

function isGenerationCacheName(name) {
  return name === LEGACY_CACHE_NAME || (
    typeof name === "string" &&
    name.startsWith(GENERATION_CACHE_PREFIX) &&
    name.length > GENERATION_CACHE_PREFIX.length
  );
}

function createGenerationCacheName() {
  const randomPart = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
  return `${GENERATION_CACHE_PREFIX}${Date.now()}-${randomPart}`;
}

function discoverShellAssetUrls(html) {
  const urls = new Set();
  const attributePattern = /\b(?:src|href)=["']([^"']+)["']/g;
  let match;

  while ((match = attributePattern.exec(html)) !== null) {
    const url = new URL(match[1], self.location.origin);
    if (url.origin === self.location.origin && !url.pathname.startsWith("/api/")) {
      urls.add(url.pathname + url.search);
    }
  }

  return Array.from(urls);
}

async function discoverBuildAssetUrls() {
  let response;
  try {
    response = await fetch(BUILD_MANIFEST_URL, {
      cache: "reload",
      credentials: "same-origin",
    });
  } catch (error) {
    if (isLocalDevelopmentHost()) return [];
    throw error;
  }

  if (!isValidResponse(response)) {
    if (isLocalDevelopmentHost()) return [];
    throw new Error("Required build manifest failed");
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    if (isLocalDevelopmentHost() && contentType.includes("text/html")) return [];
    throw new Error("Required build manifest is not JSON");
  }

  let manifest;
  try {
    manifest = await response.json();
  } catch (error) {
    if (isLocalDevelopmentHost()) return [];
    throw new Error("Required build manifest is malformed", { cause: error });
  }

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    if (isLocalDevelopmentHost()) return [];
    throw new Error("Required build manifest has an invalid shape");
  }

  const urls = new Set();
  for (const chunk of Object.values(manifest)) {
    if (!chunk || typeof chunk !== "object" || typeof chunk.file !== "string") {
      if (isLocalDevelopmentHost()) return [];
      throw new Error("Required build manifest contains an invalid chunk");
    }
    urls.add(`/${chunk.file}`);
    for (const field of ["css", "assets"]) {
      if (chunk[field] === undefined) continue;
      if (!Array.isArray(chunk[field]) || chunk[field].some((asset) => typeof asset !== "string")) {
        if (isLocalDevelopmentHost()) return [];
        throw new Error("Required build manifest contains invalid assets");
      }
      for (const asset of chunk[field]) urls.add(`/${asset}`);
    }
  }

  if (urls.size === 0 || Array.from(urls).some((url) => !url.startsWith("/assets/"))) {
    if (isLocalDevelopmentHost()) return [];
    throw new Error("Required build manifest contains no public build assets");
  }
  return Array.from(urls);
}

async function fetchRequired(url) {
  const response = await fetch(url, { cache: "reload", credentials: "same-origin" });
  if (!isValidResponse(response)) {
    throw new Error(`Required app-shell resource failed: ${url}`);
  }
  return response;
}

async function cacheRequiredUrls(cache, urls) {
  const uniqueUrls = Array.from(new Set(urls));
  const resources = await Promise.all(
    uniqueUrls.map(async (url) => ({ url, response: await fetchRequired(url) })),
  );
  for (const { url, response } of resources) await cache.put(url, response);
}

function completeShellUrlSet(assetUrls) {
  return new Set([
    "/",
    "/index.html",
    SHELL_COMPLETE_URL,
    SHELL_ASSET_LIST_URL,
    ...CORE_SHELL_URLS,
    ...assetUrls,
  ]);
}

async function putShellAssetList(cache, urls) {
  await cache.put(SHELL_ASSET_LIST_URL, new Response(JSON.stringify(Array.from(urls)), {
    headers: { "Content-Type": "application/json" },
  }));
}

async function readValidatedShellUrls(cacheName) {
  if (!isGenerationCacheName(cacheName)) throw new Error("Invalid app-shell generation name");
  const cache = await caches.open(cacheName);
  const listResponse = await cache.match(SHELL_ASSET_LIST_URL, { ignoreVary: true });
  if (!isValidResponse(listResponse)) throw new Error("App-shell asset list is missing");

  let listedUrls;
  try {
    listedUrls = await listResponse.json();
  } catch (error) {
    throw new Error("App-shell asset list is malformed", { cause: error });
  }

  if (!Array.isArray(listedUrls) || listedUrls.some((url) => (
    typeof url !== "string" || !isAllowedShellUrl(url)
  ))) {
    throw new Error("App-shell asset list is invalid");
  }

  const urls = new Set(listedUrls);
  const requiredUrls = [
    SHELL_COMPLETE_URL,
    SHELL_ASSET_LIST_URL,
    "/index.html",
    ...CORE_SHELL_URLS,
  ];
  if (requiredUrls.some((url) => !urls.has(url))) {
    throw new Error("App-shell asset list is incomplete");
  }

  const resources = await Promise.all(
    Array.from(urls).map((url) => cache.match(url, { ignoreVary: true })),
  );
  if (resources.some((response) => !isValidResponse(response))) {
    throw new Error("App-shell cache is incomplete");
  }

  const marker = await cache.match(SHELL_COMPLETE_URL, { ignoreVary: true });
  if ((await marker.text()) !== SHELL_VERSION) {
    throw new Error("App-shell marker has the wrong version");
  }
  return urls;
}

async function purgeUnknownCacheEntries(cacheName, allowedUrls) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  await Promise.all(requests.map((request) => (
    allowedUrls.has(requestKey(request)) ? Promise.resolve(false) : cache.delete(request)
  )));
}

async function fetchCanonicalShell() {
  const response = await fetchRequired("/index.html");
  if (!isHtmlResponse(response)) throw new Error("Canonical app shell is not HTML");
  const html = await response.clone().text();
  if (!html.includes('id="root"')) throw new Error("Canonical app shell is invalid");
  return { response, assetUrls: discoverShellAssetUrls(html) };
}

async function prepareGeneration(cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const [{ response, assetUrls }, buildAssetUrls] = await Promise.all([
      fetchCanonicalShell(),
      discoverBuildAssetUrls(),
    ]);
    const requiredAssetUrls = Array.from(new Set([
      ...CORE_SHELL_URLS,
      ...assetUrls,
      ...buildAssetUrls,
    ]));
    const shellUrls = completeShellUrlSet(requiredAssetUrls);
    await cacheRequiredUrls(cache, requiredAssetUrls);
    await Promise.all([
      cache.put("/", response.clone()),
      cache.put("/index.html", response.clone()),
    ]);
    await cache.put(SHELL_COMPLETE_URL, new Response(SHELL_VERSION));
    await putShellAssetList(cache, shellUrls);
    await readValidatedShellUrls(cacheName);
    return shellUrls;
  } catch (error) {
    await caches.delete(cacheName);
    throw error;
  }
}

async function readGenerationPointer(url) {
  const metadata = await caches.open(METADATA_CACHE_NAME);
  const response = await metadata.match(url, { ignoreVary: true });
  if (!isValidResponse(response)) return null;
  const cacheName = await response.text();
  return isGenerationCacheName(cacheName) ? cacheName : null;
}

async function writeGenerationPointer(url, cacheName) {
  if (!isGenerationCacheName(cacheName)) throw new Error("Invalid generation pointer");
  const metadata = await caches.open(METADATA_CACHE_NAME);
  await metadata.put(url, new Response(cacheName));
}

async function clearPendingPointer(cacheName) {
  try {
    const pending = await readGenerationPointer(PENDING_GENERATION_URL);
    if (pending !== cacheName) return;
    const metadata = await caches.open(METADATA_CACHE_NAME);
    await metadata.delete(PENDING_GENERATION_URL);
  } catch {
    // The committed active pointer is authoritative; stale pending metadata is harmless.
  }
}

async function resolveCommittedGeneration() {
  if (activeGeneration) return activeGeneration;

  const committedName = await readGenerationPointer(ACTIVE_GENERATION_URL);
  if (committedName) {
    try {
      const urls = await readValidatedShellUrls(committedName);
      activeGeneration = { cacheName: committedName, urls };
      return activeGeneration;
    } catch {
      // Fall through to deterministic recovery without trusting a corrupt pointer.
    }
  }

  const pendingName = await readGenerationPointer(PENDING_GENERATION_URL);
  const names = (await caches.keys())
    .filter((name) => isGenerationCacheName(name) && name !== pendingName)
    .sort()
    .reverse();

  for (const cacheName of names) {
    try {
      const urls = await readValidatedShellUrls(cacheName);
      activeGeneration = { cacheName, urls };
      return activeGeneration;
    } catch {
      // Ignore incomplete generations and continue deterministically.
    }
  }
  throw new Error("No committed app-shell generation is available");
}

async function resolvePreviousGeneration(selectedCacheName) {
  const previousName = await readGenerationPointer(PREVIOUS_GENERATION_URL);
  if (!previousName || previousName === selectedCacheName) return null;
  try {
    const urls = await readValidatedShellUrls(previousName);
    return { cacheName: previousName, urls };
  } catch {
    return null;
  }
}

async function cleanupCachesBestEffort(retainedCacheNames) {
  try {
    const retained = new Set([METADATA_CACHE_NAME, ...retainedCacheNames.filter(Boolean)]);
    const names = await caches.keys();
    await Promise.allSettled(
      names.filter((name) => !retained.has(name)).map((name) => caches.delete(name)),
    );
  } catch {
    // Storage cleanup must never invalidate a committed generation or activation.
  }
}

async function stageInstallGeneration() {
  const cacheName = createGenerationCacheName();
  await prepareGeneration(cacheName);
  try {
    await writeGenerationPointer(PENDING_GENERATION_URL, cacheName);
  } catch (error) {
    await caches.delete(cacheName);
    throw error;
  }
}

async function commitPendingGeneration() {
  const pendingName = await readGenerationPointer(PENDING_GENERATION_URL);
  if (!pendingName) {
    const selected = await resolveCommittedGeneration();
    const previous = await resolvePreviousGeneration(selected.cacheName);
    return { selected, previous };
  }

  const previous = await resolveCommittedGeneration().catch(() => null);
  const urls = await readValidatedShellUrls(pendingName);
  if (previous && previous.cacheName !== pendingName) {
    await writeGenerationPointer(PREVIOUS_GENERATION_URL, previous.cacheName);
  }
  await writeGenerationPointer(ACTIVE_GENERATION_URL, pendingName);
  activeGeneration = { cacheName: pendingName, urls };
  await clearPendingPointer(pendingName);
  return { selected: activeGeneration, previous };
}

async function prepareAndCommitRefresh() {
  const previous = await resolveCommittedGeneration();
  const cacheName = createGenerationCacheName();
  let committed = false;
  try {
    const urls = await prepareGeneration(cacheName);
    await writeGenerationPointer(PENDING_GENERATION_URL, cacheName);
    if (previous.cacheName !== cacheName) {
      await writeGenerationPointer(PREVIOUS_GENERATION_URL, previous.cacheName);
    }
    await writeGenerationPointer(ACTIVE_GENERATION_URL, cacheName);
    committed = true;
    activeGeneration = { cacheName, urls };
    await clearPendingPointer(cacheName);
    await cleanupCachesBestEffort([cacheName, previous.cacheName]);
  } catch (error) {
    if (!committed) {
      activeGeneration = previous;
      await clearPendingPointer(cacheName);
      await caches.delete(cacheName);
    }
    throw error;
  }
}

function refreshCanonicalShell() {
  const refresh = canonicalRefreshQueue
    .catch(() => undefined)
    .then(() => prepareAndCommitRefresh());
  canonicalRefreshQueue = refresh.catch(() => undefined);
  return refresh;
}

async function appShellFallback() {
  try {
    const selected = await resolveCommittedGeneration();
    const cache = await caches.open(selected.cacheName);
    const fallback = await cache.match("/index.html", { ignoreVary: true });
    return isValidResponse(fallback)
      ? fallback
      : offlineResponse("Aplicación no disponible sin conexión");
  } catch {
    return offlineResponse("Aplicación no disponible sin conexión");
  }
}

async function publicAssetOrNetwork(request, url) {
  try {
    const selected = await resolveCommittedGeneration();
    if (!selected.urls.has(requestKey(url))) {
      return fetch(request).catch(() => offlineResponse());
    }
    const cache = await caches.open(selected.cacheName);
    const cached = await cache.match(request, { ignoreVary: true });
    if (isValidResponse(cached)) return cached;
    return fetch(request).catch(() => offlineResponse());
  } catch {
    return fetch(request).catch(() => offlineResponse());
  }
}

async function purgePrivateCaches() {
  try {
    const selected = await resolveCommittedGeneration();
    const previous = await resolvePreviousGeneration(selected.cacheName);
    await Promise.allSettled([
      purgeUnknownCacheEntries(selected.cacheName, selected.urls),
      previous
        ? purgeUnknownCacheEntries(previous.cacheName, previous.urls)
        : Promise.resolve(),
    ]);
    await cleanupCachesBestEffort([
      selected.cacheName,
      previous?.cacheName,
    ]);
  } catch {
    const names = await caches.keys();
    await Promise.allSettled(
      names
        .filter((name) => name !== METADATA_CACHE_NAME && !isGenerationCacheName(name))
        .map((name) => caches.delete(name)),
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(stageInstallGeneration().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const { selected, previous } = await commitPendingGeneration();
      await self.clients.claim();
      await cleanupCachesBestEffort([
        selected.cacheName,
        previous?.cacheName,
      ]);
    })(),
  );
});

async function notifyAppSync() {
  const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clientList) client.postMessage({ type: "SYNC_TO_APP" });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => offlineResponse("Endpoint no disponible sin conexión")),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (isHtmlResponse(response)) {
            event.waitUntil(refreshCanonicalShell().catch(() => undefined));
          }
          return response instanceof Response ? response : offlineResponse();
        } catch {
          return appShellFallback();
        }
      })(),
    );
    return;
  }

  event.respondWith(publicAssetOrNetwork(request, url));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "TRIGGER_SYNC") event.waitUntil(notifyAppSync());
  if (event.data?.type === "LOGOUT" || event.data?.type === "SESSION_INVALIDATED") {
    event.waitUntil(purgePrivateCaches());
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "offline-sync") event.waitUntil(notifyAppSync());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { message: event.data.text() };
  }
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
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url.href);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url.href);
      return undefined;
    }),
  );
});
