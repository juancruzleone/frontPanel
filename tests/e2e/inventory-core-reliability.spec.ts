import { expect, test, type Page } from "@playwright/test"

const user = {
  _id: "technician-e2e",
  userName: "technician-e2e",
  role: "tecnico",
  tenantId: "tenant-inventory-e2e",
  permissions: {
    canViewWorkOrders: true,
    canCompleteWorkOrder: true,
    canStartWorkOrder: true,
    canEditWorkOrders: true,
    canDeleteWorkOrders: false,
  },
}

const inventory = (id: string, name: string) => ({
  _id: id,
  name,
  category: "Filters",
  unit: "unit",
  currentStock: 8,
  minimumStock: 1,
  location: "Workshop",
})

const workOrder = (id: string, item: ReturnType<typeof inventory>) => ({
  _id: id,
  titulo: "Replace filter",
  descripcion: "Scheduled maintenance",
  instalacionId: "installation-e2e",
  estado: "en_progreso",
  prioridad: "media",
  tipoTrabajo: "correctivo",
  fechaProgramada: new Date().toISOString(),
  horaProgramada: "09:00",
  inventoryRefs: [item],
})

async function seedAuthenticatedPage(page: Page) {
  await page.addInitScript(({ currentUser }) => {
    ;(window as Window & { IS_E2E?: boolean }).IS_E2E = true
    localStorage.setItem("auth-storage", JSON.stringify({
      state: {
        user: currentUser.userName,
        userId: currentUser._id,
        role: currentUser.role,
        tenantId: currentUser.tenantId,
        permissions: currentUser.permissions,
        isAuthenticated: true,
        isAuthResolved: true,
        logoutMessage: null,
      },
      version: 0,
    }))
    for (const key of [
      "home-onboarding-tour-v1-shown",
      "inventory-onboarding-tour-v1-shown",
      "work-orders-onboarding-tour-v1-shown",
      "workOrdersTourCompleted",
    ]) localStorage.setItem(key, "true")
  }, { currentUser: user })
}

async function mockCommonApi(page: Page) {
  await page.route("**/api/verify", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ cuenta: user }),
  }))
  await page.route("**/api/csrf-token", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ token: "csrf-e2e" }),
  }))
}

async function completeVisibleOrder(page: Page) {
  await page.getByRole("button", { name: /Completar orden/i }).click()
  await page.locator('textarea[name="trabajoRealizado"]').fill("Filter replaced")
  await page.locator('textarea[name="observaciones"]').fill("Completed during E2E verification")
  const canvas = page.locator("canvas").first()
  await canvas.hover({ position: { x: 10, y: 10 } })
  await page.mouse.down()
  await page.mouse.move(80, 40)
  await page.mouse.up()
  await page.getByRole("button", { name: "Completar Orden", exact: true }).click()
}

test.describe("inventory core reliability cross-repository contracts", () => {
  test("preserves paginated filters and exposes partial freshness errors", async ({ page }) => {
    await seedAuthenticatedPage(page)
    await mockCommonApi(page)
    let failFilteredRequest = false
    await page.route("**/api/inventario**", async (route) => {
      const url = new URL(route.request().url())
      if (failFilteredRequest && url.searchParams.get("name") === "missing") {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Inventory service unavailable" }) })
        return
      }
      const pageNumber = Number(url.searchParams.get("page") ?? "1")
      const name = url.searchParams.get("name") ?? ""
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [inventory(`filter-${pageNumber}`, name || `Filter page ${pageNumber}`)],
          total: 20,
          totalPages: 2,
        }),
      })
    })

    await page.goto("/inventario")
    await expect(page.getByRole("heading", { name: /inventario/i })).toBeVisible()
    await expect(page.getByText("Filter page 1")).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Inventory pagination" })).toContainText("Página 1 de 2")

    const filteredRequest = page.waitForRequest((request) =>
      request.url().includes("/api/inventario?") && new URL(request.url()).searchParams.get("name") === "needle",
    )
    await page.getByPlaceholder(/buscar/i).fill("needle")
    await filteredRequest

    const pageTwoRequest = page.waitForRequest((request) =>
      request.url().includes("/api/inventario?") &&
      new URL(request.url()).searchParams.get("page") === "2" &&
      new URL(request.url()).searchParams.get("name") === "needle",
    )
    await page.getByRole("navigation", { name: "Inventory pagination" }).getByRole("button", { name: "Siguiente" }).click()
    await pageTwoRequest
    await expect(page).toHaveURL(/inventario/)

    failFilteredRequest = true
    const failedRequest = page.waitForRequest((request) =>
      request.url().includes("/api/inventario?") && new URL(request.url()).searchParams.get("name") === "missing",
    )
    await page.getByPlaceholder(/buscar/i).fill("missing")
    await failedRequest
    await expect(page.getByRole("alert")).toBeVisible()
    await expect(page.getByRole("alert")).not.toHaveText("")
    await expect(page.getByRole("status", { name: "inventory freshness" })).toContainText(/caché|falló/i)
  })

  test("sends a stable online completion contract", async ({ page }) => {
    await seedAuthenticatedPage(page)
    await mockCommonApi(page)
    const item = inventory("507f1f77bcf86cd799439011", "Sealed filter")
    const order = workOrder("work-order-e2e", item)
    let completionRequests = 0
    let lastCompletionHeaders: Record<string, string> = {}
    await page.route("**/api/ordenes-trabajo**", async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.pathname.endsWith("/completar")) {
        completionRequests += 1
        lastCompletionHeaders = request.headers()
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { document: { status: "pending", retryable: true }, message: "completed" } }) })
        return
      }
      if (request.method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [order], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } }) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: order }) })
    })
    await page.route("**/api/inventario**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [item], total: 1, totalPages: 1 }) })
    })

    await page.goto("/ordenes-trabajo")
    await expect(page.getByText(order.titulo)).toBeVisible()
    await completeVisibleOrder(page)
    await expect.poll(() => completionRequests).toBe(1)
    expect(lastCompletionHeaders["x-idempotency-key"]).toBe(`completion-${order._id}`)
    await expect(page.getByText(/pendiente de reintento/i)).toBeVisible()

    expect(completionRequests).toBe(1)
  })

  test("uses only package-scoped inventory refs while offline", async ({ page, context }) => {
    await seedAuthenticatedPage(page)
    await mockCommonApi(page)
    const item = inventory("507f1f77bcf86cd799439011", "Sealed filter")
    const order = workOrder("work-order-offline-e2e", item)
    await page.route("**/api/ordenes-trabajo**", async (route) => {
      const request = route.request()
      if (request.method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [order], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } }) })
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: order }) })
    })
    await page.goto("/ordenes-trabajo")
    await expect(page.getByText(order.titulo)).toBeVisible()
    await context.setOffline(true)
    await page.getByRole("button", { name: /Completar orden/i }).click()
    await expect(page.locator("select").first().locator("option").nth(1)).toHaveText(/Sealed filter/)
    await expect(page.locator("select").first().locator("option").nth(1)).not.toHaveText(/Foreign filter/)
  })
})
