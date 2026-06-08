
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs"
import path from "path"

// Mock the Service Worker Global Scope
const makeSwEnv = () => {
  const listeners: Record<string, ((...args: any[]) => any)[]> = {}
  const cacheMap = new Map<string, any>()
  
  const mockCache = {
    match: vi.fn(async (req) => {
      const url = typeof req === 'string' ? req : req.url
      return cacheMap.get(url)
    }),
    put: vi.fn(async (req, res) => {
      const url = typeof req === 'string' ? req : req.url
      cacheMap.set(url, res)
    }),
    delete: vi.fn(async (req) => {
      const url = typeof req === 'string' ? req : req.url
      return cacheMap.delete(url)
    })
  }

  const mockCaches = {
    open: vi.fn(async () => mockCache),
    match: vi.fn(async (req) => mockCache.match(req)),
    keys: vi.fn(async () => Array.from(cacheMap.keys())),
    delete: vi.fn(async () => true)
  }

  return {
    self: {
      addEventListener: vi.fn((event, cb) => {
        listeners[event] = listeners[event] || []
        listeners[event].push(cb)
      }),
      location: { origin: "http://localhost:5173" },
      registration: {
        showNotification: vi.fn()
      },
      clients: {
        claim: vi.fn(),
        matchAll: vi.fn(async () => [])
      },
      skipWaiting: vi.fn()
    },
    caches: mockCaches,
    cacheMap,
    mockCache,
    listeners,
    fetch: vi.fn()
  }
}

describe("Service Worker API Cache", () => {
  let swEnv: ReturnType<typeof makeSwEnv>
  
  beforeEach(() => {
    swEnv = makeSwEnv()
    vi.stubGlobal("self", swEnv.self)
    vi.stubGlobal("caches", swEnv.caches)
    vi.stubGlobal("fetch", swEnv.fetch)
    vi.stubGlobal("Response", class {
      status: number
      body: any
      headers: any
      statusText: string
      constructor(body: any, init: any = {}) {
        this.body = body
        this.status = init.status || 200
        this.statusText = init.statusText || ""
        this.headers = new Headers(init.headers || {})
      }
      static json(data: any, init: any = {}) {
        return new (global as any).Response(JSON.stringify(data), {
          ...init,
          headers: { ...init.headers, 'Content-Type': 'application/json' }
        })
      }
      clone() { 
        return new (this.constructor as any)(this.body, { 
          status: this.status, 
          statusText: this.statusText,
          headers: Object.fromEntries((this.headers as any).entries()) 
        }) 
      }
      async json() { return JSON.parse(this.body) }
      async text() { return this.body }
      async blob() { return this.body }
      get ok() { return this.status >= 200 && this.status < 300 }
    })
    vi.stubGlobal("Headers", class {
      map: Map<string, string>
      constructor(init: any = {}) {
        this.map = new Map()
        if (init) {
          Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), v as string))
        }
      }
      get(name: string) { return this.map.get(name.toLowerCase()) || null }
      set(name: string, value: string) { this.map.set(name.toLowerCase(), value) }
      append(name: string, value: string) { this.map.set(name.toLowerCase(), value) }
      entries() { return this.map.entries() }
      [Symbol.iterator]() { return this.map.entries() }
    })
    vi.stubGlobal("Request", class {
      url: string
      method: string
      constructor(url: string, init: any = {}) {
        this.url = url
        this.method = init.method || "GET"
      }
    })
    vi.stubGlobal("URL", URL)

    // Load the SW script
    const swPath = path.resolve(process.cwd(), "public/sw.js")
    const swCode = fs.readFileSync(swPath, "utf-8")
    
    // Execute sw code in global scope
    try {
      const swFunction = new Function("self", "caches", "fetch", "Response", "Request", "URL", swCode)
      swFunction(swEnv.self, swEnv.caches, swEnv.fetch, (global as any).Response, (global as any).Request, URL)
    } catch (e) {
      console.error("Error loading SW:", e)
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("3.1 RED: should serve cached API data when offline", async () => {
    const fetchListener = swEnv.listeners["fetch"][0]
    const request = new (global as any).Request("http://localhost:5173/api/ordenes-trabajo")
    
    // GIVEN we are offline (fetch fails)
    swEnv.fetch.mockRejectedValue(new Error("Offline"))
    
    // AND we have a cached response
    const cachedData = { data: "cached work orders" }
    const cachedResponse = (global as any).Response.json(cachedData)
    // Add TTL metadata simulation (Design says cloned with X-SW-Cached-At)
    cachedResponse.headers.set('X-SW-Cached-At', Date.now().toString())
    swEnv.cacheMap.set("http://localhost:5173/api/ordenes-trabajo", cachedResponse)

    // WHEN intercepting the fetch
    const event = {
      request,
      respondWith: vi.fn()
    }
    fetchListener(event)
    
    // THEN it should respond with cached data
    const response = await event.respondWith.mock.calls[0][0]
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual(cachedData)
  })

  it("3.1 RED: should return 503 when offline and no cache is found", async () => {
    const fetchListener = swEnv.listeners["fetch"][0]
    const request = new (global as any).Request("http://localhost:5173/api/ordenes-trabajo")
    
    // GIVEN we are offline
    swEnv.fetch.mockRejectedValue(new Error("Offline"))
    
    // AND no cache exists
    swEnv.cacheMap.delete("http://localhost:5173/api/ordenes-trabajo")

    // WHEN intercepting
    const event = {
      request,
      respondWith: vi.fn()
    }
    fetchListener(event)
    
    // THEN it should return 503
    const response = await event.respondWith.mock.calls[0][0]
    expect(response.status).toBe(503)
    const json = await response.json()
    expect(json.message).toContain("no disponibles")
  })

  it("3.1 RED: should respect TTL and fetch fresh data if expired", async () => {
    const fetchListener = swEnv.listeners["fetch"][0]
    const request = new (global as any).Request("http://localhost:5173/api/ordenes-trabajo")
    
    // GIVEN we are online
    const freshData = { data: "fresh data" }
    swEnv.fetch.mockResolvedValue((global as any).Response.json(freshData))
    
    // AND we have an EXPIRED cached response (TTL for lists is 5m according to design)
    const oldResponse = (global as any).Response.json({ data: "old data" })
    oldResponse.headers.set('X-SW-Cached-At', (Date.now() - 10 * 60 * 1000).toString()) // 10m ago
    swEnv.cacheMap.set("http://localhost:5173/api/ordenes-trabajo", oldResponse)

    // WHEN intercepting
    const event = {
      request,
      respondWith: vi.fn()
    }
    fetchListener(event)
    
    // THEN it should fetch fresh data because it's expired
    const response = await event.respondWith.mock.calls[0][0]
    const json = await response.json()
    expect(json).toEqual(freshData)
    expect(swEnv.fetch).toHaveBeenCalled()
  })

  it("3.2 TRIANGULATE: should cache list with 5m TTL", async () => {
    const fetchListener = swEnv.listeners["fetch"][0]
    const request = new (global as any).Request("http://localhost:5173/api/ordenes-trabajo")
    
    // GIVEN we are online
    swEnv.fetch.mockResolvedValue((global as any).Response.json({ data: "list" }))

    // WHEN intercepting
    const event = { request, respondWith: vi.fn() }
    fetchListener(event)
    
    // THEN it should cache and respond
    const response = await event.respondWith.mock.calls[0][0]
    expect(response.headers.get("X-SW-Cached-At")).toBeDefined()
    expect(swEnv.cacheMap.has("http://localhost:5173/api/ordenes-trabajo")).toBe(true)
    const storedResponse = swEnv.cacheMap.get("http://localhost:5173/api/ordenes-trabajo")
    expect(storedResponse.headers.get("X-SW-Cached-At")).toBeDefined()
  })

  it("3.2 TRIANGULATE: should cache detail with 1h TTL", async () => {
    const fetchListener = swEnv.listeners["fetch"][0]
    const request = new (global as any).Request("http://localhost:5173/api/ordenes-trabajo/123")
    
    // GIVEN online and cached 30m ago (still fresh for 1h)
    const cachedResponse = (global as any).Response.json({ data: "detail" })
    cachedResponse.headers.set("X-SW-Cached-At", (Date.now() - 30 * 60 * 1000).toString())
    swEnv.cacheMap.set("http://localhost:5173/api/ordenes-trabajo/123", cachedResponse)

    // WHEN intercepting
    const event = { request, respondWith: vi.fn() }
    fetchListener(event)
    
    // THEN it should return cached (fresh)
    const response = await event.respondWith.mock.calls[0][0]
    expect(swEnv.fetch).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({ data: "detail" })
  })

  it("3.2 TRIANGULATE: should NOT cache non-allowlisted API routes", async () => {
    const fetchListener = swEnv.listeners["fetch"][0]
    
    // Test one-segment non-allowlisted
    const req1 = new (global as any).Request("http://localhost:5173/api/sensitive-admin-data")
    swEnv.fetch.mockResolvedValue((global as any).Response.json({ data: "secret" }))
    const event1 = { request: req1, respondWith: vi.fn() }
    fetchListener(event1)
    await event1.respondWith.mock.calls[0][0]
    expect(swEnv.cacheMap.has("http://localhost:5173/api/sensitive-admin-data")).toBe(false)

    // Test two-segment non-allowlisted (should NOT be cached according to narrowed rule)
    const req2 = new (global as any).Request("http://localhost:5173/api/users/profile")
    swEnv.fetch.mockResolvedValue((global as any).Response.json({ data: "user-profile" }))
    const event2 = { request: req2, respondWith: vi.fn() }
    fetchListener(event2)
    await event2.respondWith.mock.calls[0][0]
    expect(swEnv.cacheMap.has("http://localhost:5173/api/users/profile")).toBe(false)
  })

  it("3.2 TRIANGULATE: should clear cache on LOGOUT or SESSION_INVALIDATED message", async () => {
    const messageListener = swEnv.listeners["message"][0]
    
    // GIVEN some cached data
    swEnv.cacheMap.set("http://localhost:5173/api/any", "some data")
    
    // WHEN receiving LOGOUT message
    const event1 = {
      data: { type: "LOGOUT" },
      waitUntil: vi.fn(async (p) => await p)
    }
    await messageListener(event1)
    expect(swEnv.caches.delete).toHaveBeenCalledWith("leonix-api-v1")
    vi.mocked(swEnv.caches.delete).mockClear()

    // GIVEN data again
    swEnv.cacheMap.set("http://localhost:5173/api/any", "some data")
    
    // WHEN receiving SESSION_INVALIDATED message
    const event2 = {
      data: { type: "SESSION_INVALIDATED" },
      waitUntil: vi.fn(async (p) => await p)
    }
    await messageListener(event2)
    expect(swEnv.caches.delete).toHaveBeenCalledWith("leonix-api-v1")
  })

  it("3.2 TRIANGULATE: should clear cache on LOGOUT message", async () => {
    const messageListener = swEnv.listeners["message"][0]
    
    // GIVEN some cached data
    swEnv.cacheMap.set("http://localhost:5173/api/any", "some data")
    
    // WHEN receiving LOGOUT message
    const event = {
      data: { type: "LOGOUT" },
      waitUntil: vi.fn(async (p) => await p)
    }
    await messageListener(event)
    
    // THEN caches.delete should be called
    expect(swEnv.caches.delete).toHaveBeenCalledWith("leonix-api-v1")
  })
})
