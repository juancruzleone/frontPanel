import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

const ORIGIN = "http://localhost:5173";
const CURRENT_CACHE = "leonix-shell-v6";
const GENERATION_PREFIX = `${CURRENT_CACHE}-generation-`;
const METADATA_CACHE = `${CURRENT_CACHE}-metadata`;
const ACTIVE_POINTER = "/__leonix_active_generation__";
const PREVIOUS_POINTER = "/__leonix_previous_generation__";
const PENDING_POINTER = "/__leonix_pending_generation__";

class MockResponse {
	readonly body: string;
	readonly status: number;
	readonly statusText: string;
	readonly headers: Headers;

	constructor(body = "", init: ResponseInit = {}) {
		this.body = body;
		this.status = init.status ?? 200;
		this.statusText = init.statusText ?? "";
		this.headers = new Headers(init.headers);
	}

	get ok() {
		return this.status >= 200 && this.status < 300;
	}

	clone() {
		return new MockResponse(this.body, {
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
		});
	}

	async text() {
		return this.body;
	}

	async json() {
		return JSON.parse(this.body) as unknown;
	}
}

interface MockRequestInit {
	method?: string;
	mode?: string;
	destination?: string;
}

class MockRequest {
	readonly url: string;
	readonly method: string;
	readonly mode: string;
	readonly destination: string;

	constructor(url: string, init: MockRequestInit = {}) {
		this.url = new URL(url, ORIGIN).href;
		this.method = init.method ?? "GET";
		this.mode = init.mode ?? "cors";
		this.destination = init.destination ?? "";
	}
}

type Listener = (event: Record<string, unknown>) => void;
type PutInterceptor = (cacheName: string, key: string) => void | Promise<void>;
type DeleteInterceptor = (cacheName: string) => void | Promise<void>;

function cacheKey(input: string | MockRequest) {
	const value = typeof input === "string" ? input : input.url;
	const url = new URL(value, ORIGIN);
	return `${url.pathname}${url.search}`;
}

function htmlResponse(version: string, asset = `/assets/js/main-${version}.js`) {
	return new MockResponse(
		`<!doctype html><html><body><div id="root"></div><script src="${asset}"></script></body></html>`,
		{ headers: { "Content-Type": "text/html; charset=utf-8" } },
	);
}

function manifestResponse(version: string) {
	return new MockResponse(JSON.stringify({
		"src/main.tsx": {
			file: `assets/js/main-${version}.js`,
			css: [`assets/css/main-${version}.css`],
		},
		"lazy-route.tsx": {
			file: `assets/js/lazy-route-${version}.js`,
			isDynamicEntry: true,
		},
	}), { headers: { "Content-Type": "application/json" } });
}

type CacheStores = Map<string, Map<string, MockResponse>>;

function createServiceWorkerEnvironment(hostname = "localhost", existingStores?: CacheStores) {
	const listeners = new Map<string, Listener>();
	const stores = existingStores ?? new Map<string, Map<string, MockResponse>>();
	const deletedCaches: string[] = [];
	const operations: string[] = [];
	let putInterceptor: PutInterceptor | undefined;
	let deleteInterceptor: DeleteInterceptor | undefined;

	const openCache = (name: string) => {
		if (!stores.has(name)) stores.set(name, new Map());
		const store = stores.get(name)!;
		return {
			match: vi.fn(async (request: string | MockRequest) => store.get(cacheKey(request))),
			put: vi.fn(async (request: string | MockRequest, response: MockResponse) => {
				const key = cacheKey(request);
				await putInterceptor?.(name, key);
				store.set(key, response.clone());
			}),
			keys: vi.fn(async () => Array.from(store.keys(), (key) => new MockRequest(key))),
			delete: vi.fn(async (request: string | MockRequest) => store.delete(cacheKey(request))),
		};
	};

	const caches = {
		open: vi.fn(async (name: string) => openCache(name)),
		keys: vi.fn(async () => Array.from(stores.keys())),
		delete: vi.fn(async (name: string) => {
			deletedCaches.push(name);
			operations.push(`delete:${name}`);
			await deleteInterceptor?.(name);
			return stores.delete(name);
		}),
	};

	const defaultFetch = vi.fn(async (input: string | MockRequest) => {
		const key = cacheKey(input);
		if (key === "/index.html" || key === "/") return htmlResponse("v1");
		if (key === "/asset-manifest.json") return manifestResponse("v1");
		return new MockResponse(`resource:${key}`, {
			headers: { "Content-Type": key.endsWith(".js") ? "application/javascript" : "image/png" },
		});
	});

	const self = {
		location: {
			origin: hostname === "localhost" ? ORIGIN : `https://${hostname}`,
			hostname,
		},
		addEventListener: vi.fn((type: string, listener: Listener) => listeners.set(type, listener)),
		skipWaiting: vi.fn(async () => undefined),
		clients: {
			claim: vi.fn(async () => {
				operations.push("claim");
			}),
			matchAll: vi.fn(async () => []),
		},
		registration: { showNotification: vi.fn(async () => undefined) },
	};

	vi.stubGlobal("self", self);
	vi.stubGlobal("clients", self.clients);
	vi.stubGlobal("caches", caches);
	vi.stubGlobal("fetch", defaultFetch);
	vi.stubGlobal("Response", MockResponse);
	vi.stubGlobal("Request", MockRequest);

	const swCode = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");
	new Function("self", "clients", "caches", "fetch", "Response", "Request", "URL", swCode)(
		self,
		self.clients,
		caches,
		defaultFetch,
		MockResponse,
		MockRequest,
		URL,
	);

	return {
		listeners,
		stores,
		caches,
		deletedCaches,
		operations,
		fetch: defaultFetch,
		self,
		setPutInterceptor: (interceptor?: PutInterceptor) => {
			putInterceptor = interceptor;
		},
		setDeleteInterceptor: (interceptor?: DeleteInterceptor) => {
			deleteInterceptor = interceptor;
		},
	};
}

type ServiceWorkerEnvironment = ReturnType<typeof createServiceWorkerEnvironment>;

function metadataPointer(environment: ServiceWorkerEnvironment, pointer: string) {
	return environment.stores.get(METADATA_CACHE)?.get(pointer)?.body ?? null;
}

function activeCacheName(environment: ServiceWorkerEnvironment) {
	const name = metadataPointer(environment, ACTIVE_POINTER);
	if (!name) throw new Error("Active generation pointer is missing");
	return name;
}

function activeCache(environment: ServiceWorkerEnvironment) {
	return environment.stores.get(activeCacheName(environment))!;
}

function generationCacheNames(environment: ServiceWorkerEnvironment) {
	return Array.from(environment.stores.keys()).filter((name) => name.startsWith(GENERATION_PREFIX));
}

async function installAndActivate(environment: ServiceWorkerEnvironment) {
	const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
	await waitForInstall();
	const waitForActivate = dispatchExtendableEvent(environment.listeners.get("activate")!);
	await waitForActivate();
}

function dispatchExtendableEvent(listener: Listener, data: Record<string, unknown> = {}) {
	let lifetime = Promise.resolve();
	listener({
		...data,
		waitUntil: (promise: Promise<unknown>) => {
			lifetime = promise.then(() => undefined);
		},
	});
	return () => lifetime;
}

describe("public service worker", () => {
	let environment: ServiceWorkerEnvironment;

	beforeEach(() => {
		environment = createServiceWorkerEnvironment();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("fails installation and retains the previous shell when a core resource is missing", async () => {
		environment.stores.set(CURRENT_CACHE, new Map([["/index.html", htmlResponse("old")]]));
		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			if (cacheKey(input) === "/favicon.ico") return new MockResponse("missing", { status: 404 });
			if (cacheKey(input) === "/index.html") return htmlResponse("v1");
			if (cacheKey(input) === "/asset-manifest.json") return manifestResponse("v1");
			return new MockResponse("resource");
		});

		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);

		await expect(waitForInstall()).rejects.toThrow("Required app-shell resource failed");
		expect(environment.stores.get(CURRENT_CACHE)?.has("/index.html")).toBe(true);
		expect(generationCacheNames(environment)).toEqual([]);
		expect(environment.self.skipWaiting).not.toHaveBeenCalled();
	});

	it("allows the bounded localhost SPA fallback when the build manifest request returns HTML", async () => {
		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/index.html" || key === "/asset-manifest.json") return htmlResponse("dev", "/src/main.tsx");
			return new MockResponse(`resource:${key}`);
		});

		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
		await expect(waitForInstall()).resolves.toBeUndefined();

		const pendingName = metadataPointer(environment, PENDING_POINTER);
		expect(pendingName).toMatch(new RegExp(`^${GENERATION_PREFIX}`));
		expect(environment.stores.has(pendingName!)).toBe(true);
		expect(environment.self.skipWaiting).toHaveBeenCalledOnce();
	});

	it("fails closed when a production build manifest is malformed", async () => {
		environment = createServiceWorkerEnvironment("cmms.leonix.net.ar");
		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/index.html") return htmlResponse("v1");
			if (key === "/asset-manifest.json") {
				return new MockResponse("not-json", { headers: { "Content-Type": "application/json" } });
			}
			return new MockResponse(`resource:${key}`);
		});

		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
		await expect(waitForInstall()).rejects.toThrow("Required build manifest is malformed");

		expect(generationCacheNames(environment)).toEqual([]);
		expect(metadataPointer(environment, PENDING_POINTER)).toBeNull();
		expect(environment.self.skipWaiting).not.toHaveBeenCalled();
	});

	it("cleanup retains the selected generation and removes stale/private caches", async () => {
		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
		await waitForInstall();
		const pendingName = metadataPointer(environment, PENDING_POINTER)!;
		const staleGeneration = `${GENERATION_PREFIX}stale`;
		environment.stores.set(staleGeneration, new Map([["/partial", new MockResponse("partial")]]));
		environment.stores.set("leonix-private-tenant-a", new Map([["/secret", new MockResponse("secret")]]));

		const waitForActivate = dispatchExtendableEvent(environment.listeners.get("activate")!);
		await waitForActivate();

		expect(metadataPointer(environment, ACTIVE_POINTER)).toBe(pendingName);
		expect(environment.stores.has(pendingName)).toBe(true);
		expect(environment.stores.has(METADATA_CACHE)).toBe(true);
		expect(environment.stores.has(staleGeneration)).toBe(false);
		expect(environment.stores.has("leonix-private-tenant-a")).toBe(false);
		expect(environment.self.clients.claim).toHaveBeenCalledOnce();
	});

	it("persistent put failure while preparing a generation leaves the prior generation unchanged", async () => {
		await installAndActivate(environment);
		const previousName = activeCacheName(environment);
		const previousCache = activeCache(environment);
		const previousBodies = new Map(Array.from(previousCache, ([key, response]) => [key, response.body]));

		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/index.html") return htmlResponse("v2");
			if (key === "/asset-manifest.json") return manifestResponse("v2");
			return new MockResponse(`resource-v2:${key}`);
		});
		environment.setPutInterceptor((cacheName, key) => {
			if (cacheName.startsWith(GENERATION_PREFIX) && cacheName !== previousName && key === "/site.webmanifest") {
				throw new Error("persistent generation put failure");
			}
		});
		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
		await expect(waitForInstall()).rejects.toThrow("persistent generation put failure");
		environment.setPutInterceptor();

		expect(metadataPointer(environment, ACTIVE_POINTER)).toBe(previousName);
		expect(metadataPointer(environment, PENDING_POINTER)).toBeNull();
		expect(generationCacheNames(environment)).toEqual([previousName]);
		for (const [key, body] of previousBodies) {
			expect(previousCache.get(key)?.body).toBe(body);
		}
	});

	it("an interruption before pointer commit keeps selecting the prior generation", async () => {
		await installAndActivate(environment);
		const previousName = activeCacheName(environment);
		const previousIndex = activeCache(environment).get("/index.html")!.body;
		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/index.html") return htmlResponse("v2");
			if (key === "/asset-manifest.json") return manifestResponse("v2");
			return new MockResponse(`resource-v2:${key}`);
		});
		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
		await waitForInstall();
		const pendingName = metadataPointer(environment, PENDING_POINTER)!;
		expect(pendingName).not.toBe(previousName);

		environment = createServiceWorkerEnvironment("localhost", environment.stores);
		environment.fetch.mockRejectedValue(new Error("offline"));
		const fetchEvent = createFetchEvent(new MockRequest("/deep-route", { mode: "navigate" }));
		environment.listeners.get("fetch")!(fetchEvent.event);
		const response = await fetchEvent.response();

		expect(await response.text()).toBe(previousIndex);
		expect(metadataPointer(environment, ACTIVE_POINTER)).toBe(previousName);
		expect(metadataPointer(environment, PENDING_POINTER)).toBe(pendingName);
	});

	it("a successful pointer commit switches HTML and assets as one generation", async () => {
		await installAndActivate(environment);
		const previousName = activeCacheName(environment);
		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/index.html") return htmlResponse("v2");
			if (key === "/asset-manifest.json") return manifestResponse("v2");
			return new MockResponse(`resource-v2:${key}`);
		});
		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
		await waitForInstall();
		const pendingName = metadataPointer(environment, PENDING_POINTER)!;
		const waitForActivate = dispatchExtendableEvent(environment.listeners.get("activate")!);
		await waitForActivate();

		const selectedCache = activeCache(environment);
		const selectedUrls = JSON.parse(selectedCache.get("/__leonix_shell_assets__")!.body) as string[];
		expect(activeCacheName(environment)).toBe(pendingName);
		expect(selectedCache.get("/index.html")?.body).toContain("main-v2.js");
		expect(selectedUrls).toContain("/assets/js/main-v2.js");
		expect(selectedCache.has("/assets/js/main-v2.js")).toBe(true);
		expect(metadataPointer(environment, PREVIOUS_POINTER)).toBe(previousName);
		expect(environment.stores.has(previousName)).toBe(true);
	});

	it("claims clients before best-effort cleanup and retains selected plus previous on delete failure", async () => {
		await installAndActivate(environment);
		const previousName = activeCacheName(environment);
		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/index.html") return htmlResponse("v2");
			if (key === "/asset-manifest.json") return manifestResponse("v2");
			return new MockResponse(`resource-v2:${key}`);
		});
		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
		await waitForInstall();
		const selectedName = metadataPointer(environment, PENDING_POINTER)!;
		const staleGeneration = `${GENERATION_PREFIX}stale-delete-failure`;
		environment.stores.set(staleGeneration, new Map([["/partial", new MockResponse("partial")]]));
		environment.stores.set("leonix-private-delete-failure", new Map([["/secret", new MockResponse("secret")]]));

		environment.operations.length = 0;
		environment.self.clients.claim.mockClear();
		environment.setDeleteInterceptor(() => {
			throw new Error("persistent cache delete failure");
		});
		const waitForActivate = dispatchExtendableEvent(environment.listeners.get("activate")!);
		await expect(waitForActivate()).resolves.toBeUndefined();
		environment.setDeleteInterceptor();

		expect(environment.self.clients.claim).toHaveBeenCalledOnce();
		expect(environment.operations[0]).toBe("claim");
		expect(environment.operations.slice(1).every((operation) => operation.startsWith("delete:"))).toBe(true);
		expect(activeCacheName(environment)).toBe(selectedName);
		expect(metadataPointer(environment, PREVIOUS_POINTER)).toBe(previousName);
		expect(environment.stores.has(selectedName)).toBe(true);
		expect(environment.stores.has(previousName)).toBe(true);
		expect(environment.stores.has(staleGeneration)).toBe(true);
		expect(environment.stores.has("leonix-private-delete-failure")).toBe(true);
	});

	it("updates the canonical shell online and serves it for a direct deep route offline", async () => {
		await installAndActivate(environment);

		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/index.html" || key === "/ordenes-trabajo/pendientes") return htmlResponse("v2");
			if (key === "/asset-manifest.json") {
				return new MockResponse(JSON.stringify({
					"src/main.tsx": { file: "assets/js/main-v2.js" },
					"pending-route.tsx": { file: "assets/js/pending-route-v2.js", isDynamicEntry: true },
				}), { headers: { "Content-Type": "application/json" } });
			}
			return new MockResponse(`resource:${key}`);
		});

		const onlineEvent = createFetchEvent(new MockRequest("/ordenes-trabajo/pendientes", { mode: "navigate" }));
		environment.listeners.get("fetch")!(onlineEvent.event);
		await onlineEvent.response();
		await onlineEvent.lifetime();

		environment.fetch.mockRejectedValue(new Error("offline"));
		const offlineEvent = createFetchEvent(new MockRequest("/ordenes-trabajo/pendientes", { mode: "navigate" }));
		environment.listeners.get("fetch")!(offlineEvent.event);
		const response = await offlineEvent.response();

		expect(await response.text()).toContain("main-v2.js");
		expect(response.status).toBe(200);
		expect(activeCache(environment).has("/assets/js/pending-route-v2.js")).toBe(true);
	});

	it("serializes concurrent navigation refreshes without mixing generations", async () => {
		await installAndActivate(environment);
		let indexFetchCount = 0;
		let manifestFetchCount = 0;
		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/refresh-a") return htmlResponse("nav-a");
			if (key === "/refresh-b") return htmlResponse("nav-b");
			if (key === "/index.html") {
				indexFetchCount += 1;
				return htmlResponse(indexFetchCount === 1 ? "v2" : "v3");
			}
			if (key === "/asset-manifest.json") {
				manifestFetchCount += 1;
				return manifestResponse(manifestFetchCount === 1 ? "v2" : "v3");
			}
			return new MockResponse(`resource:${key}`);
		});

		let releaseFirstCommit!: () => void;
		let signalFirstCommitBlocked!: () => void;
		const firstCommitGate = new Promise<void>((resolve) => {
			releaseFirstCommit = resolve;
		});
		const firstCommitBlocked = new Promise<void>((resolve) => {
			signalFirstCommitBlocked = resolve;
		});
		environment.setPutInterceptor(async (cacheName, key) => {
			if (cacheName !== METADATA_CACHE || key !== ACTIVE_POINTER) return;
			signalFirstCommitBlocked();
			await firstCommitGate;
		});

		const firstEvent = createFetchEvent(new MockRequest("/refresh-a", { mode: "navigate" }));
		environment.listeners.get("fetch")!(firstEvent.event);
		await firstEvent.response();
		await firstCommitBlocked;

		const secondEvent = createFetchEvent(new MockRequest("/refresh-b", { mode: "navigate" }));
		environment.listeners.get("fetch")!(secondEvent.event);
		await secondEvent.response();
		await Promise.resolve();
		expect(indexFetchCount).toBe(1);

		releaseFirstCommit();
		await Promise.all([firstEvent.lifetime(), secondEvent.lifetime()]);
		environment.setPutInterceptor();

		const selectedCache = activeCache(environment);
		const finalMetadata = JSON.parse(selectedCache.get("/__leonix_shell_assets__")!.body) as string[];
		expect(selectedCache.get("/index.html")?.body).toContain("main-v3.js");
		expect(finalMetadata).toContain("/assets/js/main-v3.js");
		expect(finalMetadata).not.toContain("/assets/js/main-v2.js");
	});

	it("does not cache an unknown same-origin script response", async () => {
		await installAndActivate(environment);
		const unknownUrl = "/private/tenant-bootstrap.js";
		environment.fetch.mockResolvedValue(new MockResponse("private", {
			headers: { "Content-Type": "application/javascript" },
		}));
		const fetchEvent = createFetchEvent(new MockRequest(unknownUrl, { destination: "script" }));

		environment.listeners.get("fetch")!(fetchEvent.event);
		const response = await fetchEvent.response();

		expect(response.status).toBe(200);
		expect(activeCache(environment).has(unknownUrl)).toBe(false);
	});

	it("serves a known public build asset from the validated shell while offline", async () => {
		await installAndActivate(environment);
		environment.fetch.mockRejectedValue(new Error("offline"));
		const knownAssetUrl = "/assets/js/main-v1.js";
		const fetchEvent = createFetchEvent(new MockRequest(knownAssetUrl, { destination: "script" }));

		environment.listeners.get("fetch")!(fetchEvent.event);
		const response = await fetchEvent.response();

		expect(response.status).toBe(200);
		expect(await response.text()).toBe(`resource:${knownAssetUrl}`);
	});

	it("returns the network response for malformed percent encoding without rejecting", async () => {
		await installAndActivate(environment);
		const malformedUrl = `${ORIGIN}/private/%E0%A4%A.js`;
		environment.fetch.mockResolvedValue(new MockResponse("network-safe"));
		const fetchEvent = createFetchEvent(new MockRequest(malformedUrl, { destination: "script" }));

		environment.listeners.get("fetch")!(fetchEvent.event);
		const response = await fetchEvent.response();

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("network-safe");
		expect(activeCache(environment).has("/private/%E0%A4%A.js")).toBe(false);

		environment.fetch.mockRejectedValue(new Error("offline"));
		const offlineEvent = createFetchEvent(new MockRequest(malformedUrl, { destination: "script" }));
		environment.listeners.get("fetch")!(offlineEvent.event);
		expect((await offlineEvent.response()).status).toBe(503);
	});

	it("always returns a Response when no offline navigation shell exists", async () => {
		environment.stores.set(CURRENT_CACHE, new Map());
		environment.fetch.mockRejectedValue(new Error("offline"));
		const fetchEvent = createFetchEvent(new MockRequest("/inicio", { mode: "navigate" }));

		environment.listeners.get("fetch")!(fetchEvent.event);
		const response = await fetchEvent.response();

		expect(response).toBeInstanceOf(MockResponse);
		expect(response.status).toBe(503);
	});

	it("retains only validated public shell content on logout", async () => {
		await installAndActivate(environment);
		const firstGeneration = activeCacheName(environment);
		environment.fetch.mockImplementation(async (input: string | MockRequest) => {
			const key = cacheKey(input);
			if (key === "/index.html") return htmlResponse("v2");
			if (key === "/asset-manifest.json") return manifestResponse("v2");
			return new MockResponse(`resource-v2:${key}`);
		});
		const waitForInstall = dispatchExtendableEvent(environment.listeners.get("install")!);
		await waitForInstall();
		const waitForActivate = dispatchExtendableEvent(environment.listeners.get("activate")!);
		await waitForActivate();
		const selectedName = activeCacheName(environment);
		activeCache(environment).set("/private/tenant-bootstrap.js", new MockResponse("private"));
		environment.stores.get(firstGeneration)?.set("/private/previous-tenant.js", new MockResponse("private"));
		environment.stores.set("leonix-shell-v5", new Map([["/index.html", htmlResponse("old")]]));
		environment.stores.set("leonix-private-tenant-a", new Map([["/secret", new MockResponse("secret")]]));

		const waitForMessage = dispatchExtendableEvent(environment.listeners.get("message")!, {
			data: { type: "LOGOUT" },
		});
		await waitForMessage();

		expect(environment.stores.has(selectedName)).toBe(true);
		expect(environment.stores.has(firstGeneration)).toBe(true);
		expect(activeCache(environment).has("/index.html")).toBe(true);
		expect(activeCache(environment).has("/private/tenant-bootstrap.js")).toBe(false);
		expect(environment.stores.get(firstGeneration)?.has("/private/previous-tenant.js")).toBe(false);
		expect(environment.stores.has("leonix-shell-v5")).toBe(false);
		expect(environment.stores.has("leonix-private-tenant-a")).toBe(false);
	});

	it("keeps authenticated API responses network-only", async () => {
		environment.fetch.mockRejectedValue(new Error("offline"));
		const fetchEvent = createFetchEvent(new MockRequest("/api/ordenes-trabajo"));

		environment.listeners.get("fetch")!(fetchEvent.event);
		const response = await fetchEvent.response();

		expect(response.status).toBe(503);
		expect(environment.stores.size).toBe(0);
	});
});

function createFetchEvent(request: MockRequest) {
	let responsePromise: Promise<MockResponse> | undefined;
	let lifetimePromise = Promise.resolve();
	const event = {
		request,
		respondWith: (response: Promise<MockResponse>) => {
			responsePromise = response;
		},
		waitUntil: (promise: Promise<unknown>) => {
			lifetimePromise = promise.then(() => undefined);
		},
	};

	return {
		event,
		response: () => {
			if (!responsePromise) throw new Error("Fetch listener did not respond");
			return responsePromise;
		},
		lifetime: () => lifetimePromise,
	};
}
