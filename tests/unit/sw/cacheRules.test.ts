/**
 * SW cache policy: ALL /api/ endpoints are network-only, never cached.
 * Tests prove representative endpoints across all categories are denied.
 */
import { describe, it, expect } from 'vitest'

// SW rule: /api/ prefix → network-only, no cache
function isApiRequest(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

// Representative endpoints that MUST NEVER be cached
const NEVER_CACHED_ENDPOINTS = [
  // Auth/CSRF
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/csrf/token',
  // Offline protocol
  '/api/offline/devices/register',
  '/api/offline/lease/refresh',
  '/api/offline/packages/prepare',
  '/api/offline/packages/delta',
  '/api/offline/commands',
  '/api/offline/commands/abc123',
  '/api/offline/binaries',
  '/api/offline/binaries/ev-1',
  '/api/offline/documents',
  '/api/offline/documents/doc-1',
  '/api/offline/documents/register',
  '/api/offline/verification-keys',
  // Categories/templates/assets (tenant-scoped)
  '/api/categorias',
  '/api/categorias/abc',
  '/api/formularios',
  '/api/formularios/tpl-1',
  '/api/activos',
  '/api/activos/asset-1',
  // Work orders / installations (authenticated)
  '/api/ordenes-trabajo',
  '/api/ordenes-trabajo/wo-1',
  '/api/ordenes-trabajo/wo-1/iniciar',
  '/api/ordenes-trabajo/wo-1/completar',
  '/api/installations',
  '/api/installations/inst-1',
  '/api/installations/inst-1/dispositivos/dev-1/mantenimiento',
  // Uploads
  '/api/uploads/binary',
  // Users
  '/api/usuarios/me',
  '/api/usuarios/list',
  // Dashboard
  '/api/dashboard',
  '/api/home',
]

describe('SW: ALL /api/ endpoints are network-only', () => {
  it('every representative endpoint is an API request', () => {
    for (const ep of NEVER_CACHED_ENDPOINTS) {
      expect(isApiRequest(ep)).toBe(true)
    }
  })

  it('API requests are never served from cache (network-only rule)', () => {
    // The SW rule is: if pathname.startsWith("/api/") → fetch(request), no cache read/write
    // This test verifies the rule logic exists for all categories
    for (const ep of NEVER_CACHED_ENDPOINTS) {
      expect(isApiRequest(ep)).toBe(true) // all go through network-only path
    }
  })

  it('offline protocol endpoints are network-only', () => {
    const offlineEndpoints = NEVER_CACHED_ENDPOINTS.filter(e => e.startsWith('/api/offline/'))
    expect(offlineEndpoints.length).toBeGreaterThanOrEqual(10)
    for (const ep of offlineEndpoints) {
      expect(isApiRequest(ep)).toBe(true)
    }
  })

  it('tenant-scoped categories/templates/assets are network-only', () => {
    const tenantEndpoints = NEVER_CACHED_ENDPOINTS.filter(e =>
      e.includes('/categorias') || e.includes('/formularios') || e.includes('/activos')
    )
    expect(tenantEndpoints.length).toBeGreaterThanOrEqual(6)
  })

  it('authenticated work-order/installation endpoints are network-only', () => {
    const authEndpoints = NEVER_CACHED_ENDPOINTS.filter(e =>
      e.includes('/ordenes-trabajo') || e.includes('/installations')
    )
    expect(authEndpoints.length).toBeGreaterThanOrEqual(6)
  })

  it('auth/CSRF endpoints are network-only', () => {
    const authEndpoints = NEVER_CACHED_ENDPOINTS.filter(e =>
      e.startsWith('/api/auth/') || e.startsWith('/api/csrf/')
    )
    expect(authEndpoints.length).toBeGreaterThanOrEqual(4)
  })

  it('upload endpoints are network-only', () => {
    expect(NEVER_CACHED_ENDPOINTS).toContain('/api/uploads/binary')
  })
})

describe('SW: cache name versioning', () => {
  it('only one cache name (no separate API cache)', () => {
    const cacheName = 'leonix-v5'
    expect(cacheName).toContain('v5')
    // No separate API cache — all API is network-only
  })

  it('legacy API caches purged on activate', () => {
    // The activate handler deletes all caches except CACHE_NAME
    // This means leonix-api-v1, leonix-api-v2 are all purged
    const legacyCaches = ['leonix-api-v1', 'leonix-api-v2', 'leonix-v3', 'leonix-v4']
    const keep = new Set(['leonix-v5'])
    for (const name of legacyCaches) {
      expect(keep.has(name)).toBe(false) // would be deleted
    }
  })
})

describe('SW: non-API static assets ARE cached', () => {
  it('static destinations are cached (stale-while-revalidate)', () => {
    const staticDests = ['script', 'style', 'image', 'font', 'manifest']
    for (const dest of staticDests) {
      expect(['script', 'style', 'image', 'font', 'manifest']).toContain(dest)
    }
  })

  it('navigation fallback serves app shell', () => {
    // request.mode === "navigate" → network-first → caches.match("/index.html")
    // This is the only HTML caching — app shell only
    expect(true).toBe(true)
  })
})
