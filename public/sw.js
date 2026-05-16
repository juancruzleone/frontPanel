const CACHE_NAME = "leonix-v2";

const APP_SHELL_URLS = [
	"/",
	"/index.html",
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

const STATIC_DESTINATIONS = new Set([
	"script",
	"style",
	"image",
	"font",
	"manifest",
]);

// Cachea cada recurso de forma tolerante: un archivo faltante no debe abortar
// la instalación completa del Service Worker ni dejar a la app sin fallback.
async function cacheUrls(cache, urls) {
	await Promise.allSettled(
		urls.map(async (url) => {
			const response = await fetch(url, { cache: "reload" });
			if (response.ok) {
				await cache.put(url, response);
			}
		}),
	);
}

async function discoverBuildAssets() {
	try {
		const response = await fetch("/index.html", { cache: "reload" });
		if (!response.ok) {
			return [];
		}

		const html = await response.text();
		const urls = new Set();
		const assetRegex = /\b(?:src|href)=["']([^"']+)["']/g;
		let match;

		while ((match = assetRegex.exec(html)) !== null) {
			const assetUrl = new URL(match[1], self.location.origin);
			if (assetUrl.origin === self.location.origin) {
				urls.add(assetUrl.pathname + assetUrl.search);
			}
		}

		return Array.from(urls);
	} catch {
		return [];
	}
}

function offlineResponse(message = "Recurso no disponible sin conexión") {
	return new Response(message, {
		status: 503,
		statusText: "Service Unavailable",
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

async function appShellFallback() {
	return (
		(await caches.match("/index.html")) ||
		offlineResponse("Aplicación no disponible sin conexión")
	);
}

async function networkFirst(request, fallback) {
	try {
		const response = await fetch(request);
		return response;
	} catch {
		return (await fallback()) || offlineResponse();
	}
}

async function staleWhileRevalidate(request) {
	const cachedResponse = await caches.match(request);

	const networkPromise = fetch(request)
		.then(async (networkResponse) => {
			if (networkResponse.ok) {
				const cache = await caches.open(CACHE_NAME);
				await cache.put(request, networkResponse.clone());
			}
			return networkResponse;
		})
		.catch(() => undefined);

	if (cachedResponse) {
		networkPromise.catch(() => undefined);
		return cachedResponse;
	}

	return (await networkPromise) || offlineResponse();
}

// Instalación del Service Worker
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			await cacheUrls(cache, APP_SHELL_URLS);
			const buildAssets = await discoverBuildAssets();
			await cacheUrls(cache, buildAssets);
			await self.skipWaiting();
		}),
	);
});

// Activación del Service Worker
self.addEventListener("activate", (event) => {
	const cachesToKeep = new Set([CACHE_NAME]);

	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) =>
				Promise.all(
					cacheNames.map((cacheName) => {
						if (!cachesToKeep.has(cacheName)) {
							return caches.delete(cacheName);
						}
						return undefined;
					}),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// Interceptar peticiones
self.addEventListener("fetch", (event) => {
	const request = event.request;

	if (request.method !== "GET") {
		return;
	}

	const url = new URL(request.url);

	// No cachear extensiones de Chrome, data URLs, o esquemas no soportados
	if (
		url.protocol === "chrome-extension:" ||
		url.protocol === "chrome:" ||
		url.protocol === "moz-extension:" ||
		url.protocol === "data:" ||
		url.protocol === "blob:" ||
		url.protocol === "file:"
	) {
		return;
	}

	// API Requests: no se cachean en el Service Worker porque usan cookies
	// HTTP-only. La persistencia offline de datos sensibles queda en la app,
	// con stores/colas explícitas por usuario.
	if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
		event.respondWith(
			networkFirst(
				request,
				async () =>
					new Response(
						JSON.stringify({ message: "Datos no disponibles sin conexión" }),
						{
							status: 503,
							statusText: "Service Unavailable",
							headers: { "Content-Type": "application/json; charset=utf-8" },
						},
					),
			),
		);
		return;
	}

	// Para rutas de la aplicación, siempre devolver index.html (Navigation fallback)
	if (request.mode === "navigate") {
		event.respondWith(networkFirst(request, appShellFallback));
		return;
	}

	// Para recursos estáticos, usar estrategia stale-while-revalidate.
	if (
		url.origin === self.location.origin &&
		STATIC_DESTINATIONS.has(request.destination)
	) {
		event.respondWith(staleWhileRevalidate(request));
		return;
	}

	// Fallback genérico: nunca resolver undefined, porque eso rompe FetchEvent.
	event.respondWith(networkFirst(request, async () => caches.match(request)));
});

// Manejo de mensajes para sincronización
self.addEventListener("sync", (event) => {
	if (event.tag === "offline-sync") {
		event.waitUntil(notifyClientsToSync());
	}
});

async function notifyClientsToSync() {
	const clientList = await clients.matchAll({
		type: "window",
		includeUncontrolled: true,
	});
	for (const client of clientList) {
		client.postMessage({ type: "TRIGGER_SYNC" });
	}
}

self.addEventListener("push", (event) => {
	if (!event.data) {
		return;
	}

	let payload = {};
	try {
		payload = event.data.json();
	} catch {
		payload = { message: event.data.text() };
	}

	const title = payload.title || "Nueva notificación";
	const options = {
		body: payload.message || payload.body || "",
		icon: payload.icon || "/logo leonix 5.svg",
		badge: payload.badge || "/logo leonix 5.svg",
		data: payload.data || { url: "/ordenes-trabajo" },
		tag: payload.tag || "leonix-push",
		renotify: true,
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = event.notification?.data?.url || "/ordenes-trabajo";

	const url = new URL(targetUrl, self.location.origin);
	const isSafeUrl = url.origin === self.location.origin;

	if (!isSafeUrl) {
		return;
	}

	const safeTargetUrl = url.href;

	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if ("focus" in client) {
						client.navigate(safeTargetUrl);
						return client.focus();
					}
				}
				if (clients.openWindow) {
					return clients.openWindow(safeTargetUrl);
				}
				return undefined;
			}),
	);
});
