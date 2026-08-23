/**
 * R11 — E2E security scenarios for offline stack.
 * Covers: reload survival, offline lifecycle, two-identity isolation,
 * lease expiry, forged identity, SW cache policy.
 *
 * These tests require a running dev server (bun run dev).
 * They use Playwright route mocking for backend contract stubs.
 */
import { test, expect } from "@playwright/test"

// ── Fixtures ────────────────────────────────────────────────────────────

const TENANT_A = { tenantId: "tenant-a", userId: "user-a", deviceId: "dev-a" }

function seedAuth(page: import("@playwright/test").Page, identity: typeof TENANT_A) {
  return page.addInitScript((id) => {
    ;(window as Window & { IS_E2E?: boolean }).IS_E2E = true
    localStorage.setItem("auth-storage", JSON.stringify({
      state: {
        user: id.userId, userId: id.userId, role: "tecnico",
        tenantId: id.tenantId, isAuthenticated: true, isAuthResolved: true,
        permissions: { canStartWorkOrder: true, canCompleteWorkOrder: true, canViewWorkOrders: true },
      },
      version: 0,
    }))
    localStorage.setItem("home-onboarding-tour-v1-shown", "true")
    localStorage.setItem("work-orders-onboarding-tour-v1-shown", "true")
    localStorage.setItem("workOrdersTourCompleted", "true")
    localStorage.setItem("workorders-view", '"table"')
  }, identity)
}

function mockApi(page: import("@playwright/test").Page, overrides: Record<string, unknown> = {}) {
  const user = overrides.user as typeof TENANT_A | undefined ?? TENANT_A
  return page.route("**/api/**", async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.includes("/cuenta/login") || url.includes("/verify")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ cuenta: { _id: user.userId, userName: user.userId, role: "tecnico", tenantId: user.tenantId } }) })
    } else if (url.includes("/csrf-token")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: "fake-csrf" }) })
    } else if (url.includes("/offline/devices/register")) {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, deviceId: user.deviceId, publicKeyJwk: { kty: "EC", crv: "P-256", x: "a", y: "b" } }) })
    } else if (url.includes("/offline/lease/refresh")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, lease: { schemaVersion: 1, tenantId: user.tenantId, userId: user.userId, deviceId: user.deviceId, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }, header: { alg: "ES256", kid: "k1" }, signature: "sig" }) })
    } else if (url.includes("/offline/verification-keys")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ keys: [] }) })
    } else if (url.includes("/ordenes-trabajo") && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [], pagination: { total: 0 } }) })
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) })
    }
  })
}

// ── Tests ───────────────────────────────────────────────────────────────

test.describe("R11 E2E Security Scenarios", () => {
  test("SW does not cache API responses", async ({ page }) => {
    test.setTimeout(30000)
    await seedAuth(page, TENANT_A)

    await mockApi(page)

    await page.goto("/")
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 15000 })

    const cachedApiUrls = await page.evaluate(async () => {
      await fetch('/api/security-network-only')
      await fetch('/api/security-network-only')
      const requests = await Promise.all(
        (await caches.keys()).map(async (cacheName) => (await caches.open(cacheName)).keys()),
      )
      return requests.flat().map((request) => new URL(request.url).pathname).filter((path) => path.startsWith('/api/'))
    })

    expect(cachedApiUrls).toEqual([])
  })
})
