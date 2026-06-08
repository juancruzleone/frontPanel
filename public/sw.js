const CACHE_NAME = "leonix-v3";
const API_CACHE_NAME = "leonix-api-v1";

const API_CACHE_RULES = [
	{
		pattern: /^\/api\/.*\/formulario(\/|$)/,
		ttl: 24 * 60 * 60 * 1000,
	}, // 24h para formularios/catálogos
	{
		pattern: /^\/api\/.*\/mantenimientos(\/|$)/,
		ttl: 24 * 60 * 60 * 1000,
	}, // 24h para mantenimientos
	{
		pattern:
			/^\/api\/(ordenes-trabajo|mis-ordenes-trabajo|installations|mis-instalaciones)\/[^\/]+(\/|$)/,
		ttl: 60 * 60 * 1000,
	}, // 1h para detalles allowlisted (ej: /api/ordenes-trabajo/123)
	{
		pattern:
			/^\/api\/(ordenes-trabajo|mis-ordenes-trabajo|installations|mis-instalaciones|dashboard|home)(\/|$)/,
		ttl: 5 * 60 * 1000,
	}, // 5m para listas y dashboards
];

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

async function safeCachePut(request, response) {
	try {
		if (!response.ok) {
			return;
		}

		const responseToCache = response.clone();
		const cache = await caches.open(CACHE_NAME);
		await cache.put(request, responseToCache);
	} catch {
		// Cache Storage puede rechazar respuestas parciales/opacas o cuerpos ya usados.
		// La navegación no debe fallar por no poder actualizar el cache.
	}
}

// Cachea cada recurso de forma tolerante: un archivo faltante no debe abortar
// la instalación completa del Service Worker ni dejar a la app sin fallback.
async function cacheUrls(cache, urls) {
	await Promise.allSettled(
		urls.map(async (url) => {
			const response = await fetch(url, { cache: "reload" });
			if (response.ok) {
				await cache.put(url, response.clone());
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

async function createCachedResponse(response) {
	const clonedResponse = response.clone();
	const headers = new Headers(clonedResponse.headers);
	headers.set("X-SW-Cached-At", Date.now().toString());

	return new Response(await clonedResponse.blob(), {
		status: clonedResponse.status,
		statusText: clonedResponse.statusText,
		headers: headers,
	});
}

async function apiCacheStrategy(request, ttl) {
	const cache = await caches.open(API_CACHE_NAME);
	const cachedResponse = await cache.match(request);

	const isFresh = (res) => {
		const cachedAt = res.headers.get("X-SW-Cached-At");
		if (!cachedAt) return false;
		return Date.now() - parseInt(cachedAt, 10) < ttl;
	};

	if (cachedResponse && isFresh(cachedResponse)) {
		return cachedResponse;
	}

	try {
		const networkResponse = await fetch(request);
		if (networkResponse && networkResponse.ok) {
			const responseToCache = await createCachedResponse(networkResponse);
			await cache.put(request, responseToCache.clone());
			return responseToCache;
		}
		throw new Error("Network response not ok");
	} catch (err) {
		if (cachedResponse) {
			return cachedResponse;
		}
		return new Response(
			JSON.stringify({ message: "Datos no disponibles sin conexión" }),
			{
				status: 503,
				statusText: "Service Unavailable",
				headers: { "Content-Type": "application/json; charset=utf-8" },
			},
		);
	}
}

async function networkFirst(request, fallback) {
	try {
		const response = await fetch(request);
		if (response instanceof Response) return response;
		throw new Error("Invalid response from fetch");
	} catch (e) {
		try {
			const fallbackResponse = typeof fallback === 'function' ? await fallback() : await caches.match(request);
			if (fallbackResponse instanceof Response) return fallbackResponse;
			return offlineResponse();
		} catch (err) {
			return offlineResponse();
		}
	}
}

async function staleWhileRevalidate(request) {
	try {
		const cachedResponse = await caches.match(request);

		const networkPromise = fetch(request)
			.then(async (networkResponse) => {
				if (networkResponse && networkResponse.ok) {
					await safeCachePut(request, networkResponse);
				}
				return networkResponse;
			})
			.catch(() => undefined);

		if (cachedResponse instanceof Response) {
			return cachedResponse;
		}

		const networkResponse = await networkPromise;
		if (networkResponse instanceof Response) return networkResponse;
		
		return offlineResponse();
	} catch (e) {
		return offlineResponse();
	}
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
	const cachesToKeep = new Set([CACHE_NAME, API_CACHE_NAME]);

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
	try {
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

		// No interceptar terceros: analytics, extensiones y CDNs deben seguir su
		// camino normal para evitar errores CSP y respuestas 503 generadas por el SW.
		if (url.origin !== self.location.origin) {
			return;
		}

		// API Requests: no se cachean en el Service Worker porque usan cookies
		// HTTP-only. La persistencia offline de datos sensibles queda en la app,
		// con stores/colas explícitas por usuario.
		if (url.pathname.startsWith("/api/")) {
			const cacheRule = API_CACHE_RULES.find((rule) =>
				rule.pattern.test(url.pathname),
			);

			if (request.method === "GET" && cacheRule) {
				event.respondWith(apiCacheStrategy(request, cacheRule.ttl));
				return;
			}

			event.respondWith(
				(async () => {
					try {
						const response = await networkFirst(
							request,
							async () =>
								new Response(
									JSON.stringify({
										message: "Datos no disponibles sin conexión",
									}),
									{
										status: 503,
										statusText: "Service Unavailable",
										headers: {
											"Content-Type": "application/json; charset=utf-8",
										},
									},
								),
						);
						if (response instanceof Response) return response;
						return offlineResponse();
					} catch (err) {
						return offlineResponse();
					}
				})(),
			);
			return;
		}

		// Para rutas de la aplicación, siempre devolver index.html (Navigation fallback)
		if (request.mode === "navigate") {
			event.respondWith(networkFirst(request, appShellFallback).catch(() => appShellFallback()));
			return;
		}

		// Para recursos estáticos, usar estrategia stale-while-revalidate.
		if (STATIC_DESTINATIONS.has(request.destination)) {
			event.respondWith(staleWhileRevalidate(request).catch(() => offlineResponse()));
			return;
		}

		// Fallback genérico: nunca resolver undefined, porque eso rompe FetchEvent.
		event.respondWith(
			(async () => {
				try {
					const response = await networkFirst(request, async () => {
						const matched = await caches.match(request);
						if (matched instanceof Response) return matched;
						return offlineResponse();
					});
					if (response instanceof Response) return response;
					return offlineResponse();
				} catch (err) {
					return offlineResponse();
				}
			})()
		);
	} catch (e) {
		// En caso de error catastrófico en el propio listener, intentar devolver algo válido
		try {
			// Solo llamar a respondWith si no se llamó antes
			event.respondWith(offlineResponse("Error fatal en el Service Worker"));
		} catch (err) {
			// Ya se llamó a respondWith o es demasiado tarde
		}
	}
});

// Manejo de mensajes para sincronización y limpieza
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "TRIGGER_SYNC") {
		event.waitUntil(notifyClientsToSync());
	}
	if (
		event.data &&
		(event.data.type === "LOGOUT" || event.data.type === "SESSION_INVALIDATED")
	) {
		event.waitUntil(caches.delete(API_CACHE_NAME));
	}
});

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
