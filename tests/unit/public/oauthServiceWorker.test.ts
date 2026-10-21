import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

// The OAuth hand-off is a live, cookie-bearing transaction. A service worker
// that caches it, answers it from a shell generation, or falls back to one when
// the network is down would let a stale or offline document pretend a login
// happened. These tests pin /auth/callback and /api/auth/oauth/* to the network.

const ORIGIN = "http://localhost:5173";
const CURRENT_CACHE = "leonix-shell-v6";
const METADATA_CACHE = `${CURRENT_CACHE}-metadata`;
const ACTIVE_POINTER = "/__leonix_active_generation__";

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
    return new MockResponse(this.body, { status: this.status, statusText: this.statusText, headers: this.headers });
  }

  async text() {
    return this.body;
  }

  async json() {
    return JSON.parse(this.body) as unknown;
  }
}

class MockRequest {
  readonly url: string;
  readonly method: string;
  readonly mode: string;
  readonly destination: string;

  constructor(url: string, init: { method?: string; mode?: string; destination?: string } = {}) {
    this.url = new URL(url, ORIGIN).href;
    this.method = init.method ?? "GET";
    this.mode = init.mode ?? "cors";
    this.destination = init.destination ?? "";
  }
}

type Listener = (event: Record<string, unknown>) => void;

const cacheKey = (input: string | MockRequest) => {
  const value = typeof input === "string" ? input : input.url;
  const url = new URL(value, ORIGIN);
  return `${url.pathname}${url.search}`;
};

const htmlResponse = (body = "shell") => new MockResponse(
  `<!doctype html><html><body><div id="root"></div><script src="/assets/js/${body}.js"></script></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8" } },
);

const manifestResponse = () => new MockResponse(JSON.stringify({
  "src/main.tsx": { file: "assets/js/main-v1.js" },
}), { headers: { "Content-Type": "application/json" } });

function createServiceWorkerEnvironment() {
  const listeners = new Map<string, Listener>();
  const stores = new Map<string, Map<string, MockResponse>>();

  const openCache = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      match: vi.fn(async (request: string | MockRequest) => store.get(cacheKey(request))),
      put: vi.fn(async (request: string | MockRequest, response: MockResponse) => {
        store.set(cacheKey(request), response.clone());
      }),
      keys: vi.fn(async () => Array.from(store.keys(), (key) => new MockRequest(key))),
      delete: vi.fn(async (request: string | MockRequest) => store.delete(cacheKey(request))),
    };
  };

  const caches = {
    open: vi.fn(async (name: string) => openCache(name)),
    keys: vi.fn(async () => Array.from(stores.keys())),
    delete: vi.fn(async (name: string) => stores.delete(name)),
  };

  const defaultFetch = vi.fn(async (input: string | MockRequest) => {
    const key = cacheKey(input);
    if (key === "/index.html" || key === "/") return htmlResponse("main-v1");
    if (key === "/asset-manifest.json") return manifestResponse();
    return new MockResponse(`resource:${key}`, {
      headers: { "Content-Type": key.endsWith(".js") ? "application/javascript" : "image/png" },
    });
  });

  const self = {
    location: { origin: ORIGIN, hostname: "localhost" },
    addEventListener: vi.fn((type: string, listener: Listener) => listeners.set(type, listener)),
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined), matchAll: vi.fn(async () => []) },
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
    self, self.clients, caches, defaultFetch, MockResponse, MockRequest, URL,
  );

  return { listeners, stores, caches, fetch: defaultFetch, self };
}

type Environment = ReturnType<typeof createServiceWorkerEnvironment>;

function dispatch(listener: Listener, data: Record<string, unknown> = {}) {
  let lifetime = Promise.resolve();
  listener({
    ...data,
    waitUntil: (promise: Promise<unknown>) => {
      lifetime = promise.then(() => undefined);
    },
  });
  return () => lifetime;
}

function createFetchEvent(request: MockRequest) {
  let responsePromise: Promise<MockResponse> | undefined;
  const event = {
    request,
    respondWith: (response: Promise<MockResponse>) => {
      responsePromise = response;
    },
    waitUntil: (promise: Promise<unknown>) => promise,
  };

  return {
    event,
    response: () => {
      if (!responsePromise) throw new Error("Fetch listener did not respond");
      return responsePromise;
    },
  };
}

async function installAndActivate(environment: Environment) {
  await dispatch(environment.listeners.get("install")!)();
  await dispatch(environment.listeners.get("activate")!)();
}

const activeStore = (environment: Environment) => {
  const name = environment.stores.get(METADATA_CACHE)?.get(ACTIVE_POINTER)?.body;
  if (!name) throw new Error("Active generation pointer is missing");
  return environment.stores.get(name)!;
};

const serve = async (environment: Environment, url: string, mode = "navigate") => {
  const fetchEvent = createFetchEvent(new MockRequest(url, { mode }));
  environment.listeners.get("fetch")!(fetchEvent.event);
  const response = await fetchEvent.response();
  return { response, body: await response.text() };
};

let environment: Environment;

beforeEach(async () => {
  environment = createServiceWorkerEnvironment();
  await installAndActivate(environment);
  environment.fetch.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("service worker OAuth flow exclusion", () => {
  const flowUrls = [
    "/auth/callback",
    "/auth/callback?returnTo=%2Finicio",
    "/auth/callback?oauth_error=OAUTH_TRANSACTION_EXPIRED",
    "/AUTH/CALLBACK?returnTo=%2Finicio",
    "/Auth/Callback?oauth_error=OAUTH_TRANSACTION_EXPIRED",
    "/API/AUTH/OAUTH/start?provider=google&returnTo=%2Finicio",
    "/api/auth/oauth/start?provider=google&returnTo=%2Finicio",
    "/api/auth/oauth/callback?code=auth-code&state=state-value",
  ];

  it.each(flowUrls)("takes %j straight to the network while online", async (url) => {
    const { response, body } = await serve(environment, url);

    expect(response.status).toBe(200);
    expect(body).toBe(`resource:${url}`);
    expect(environment.fetch).toHaveBeenCalledTimes(1);
    expect(activeStore(environment).has(cacheKey(url))).toBe(false);
  });

  it("never asks the shell generation for the callback document", async () => {
    await serve(environment, "/auth/callback?returnTo=%2Finicio");

    const requested = environment.fetch.mock.calls.map((call) => cacheKey(call[0] as MockRequest));
    expect(requested).toEqual(["/auth/callback?returnTo=%2Finicio"]);
    expect(requested).not.toContain("/index.html");
    expect(requested).not.toContain("/asset-manifest.json");
  });

  it("refuses to serve the callback document from the app shell while offline", async () => {
    environment.fetch.mockRejectedValue(new Error("offline"));

    const { response, body } = await serve(environment, "/auth/callback");

    expect(response.status).toBe(503);
    expect(body).not.toContain("id=\"root\"");
    expect(body).not.toMatch(/<html/i);
  });

  it("never serves a callback entry that leaked into a shell generation", async () => {
    activeStore(environment).set("/auth/callback", new MockResponse("stale callback document"));
    environment.fetch.mockRejectedValue(new Error("offline"));

    const { response, body } = await serve(environment, "/auth/callback");

    expect(response.status).toBe(503);
    expect(body).not.toContain("stale callback document");
  });

  it.each(flowUrls)("answers %j with an unavailable response while offline", async (url) => {
    environment.fetch.mockRejectedValue(new Error("offline"));

    const { response } = await serve(environment, url);

    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
  });

  it("writes nothing to any cache for the OAuth flow", async () => {
    environment.fetch.mockImplementation(async () => htmlResponse("callback-document"));

    for (const url of flowUrls) await serve(environment, url);

    const keys = new Set(Array.from(environment.stores.values())
      .flatMap((store) => Array.from(store.keys())));
    for (const url of flowUrls) expect(keys.has(cacheKey(url))).toBe(false);
  });

  it("still falls back to the app shell for an ordinary localized route", async () => {
    environment.fetch.mockRejectedValue(new Error("offline"));

    const { response, body } = await serve(environment, "/inicio");

    expect(response.status).toBe(200);
    expect(body).toContain("id=\"root\"");
  });
});
