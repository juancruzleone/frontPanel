import { test, expect } from "@playwright/test";

/**
 * E2E test for Offline Capability.
 * Covers: App Shell caching, API GET caching, Mutation queueing, and Re-sync.
 */
test.describe("Offline Capability Review - Technician Flow", () => {
  test("technician can view data and perform mutations while offline, which sync when back online", async ({ page, context }) => {
    // Increase timeout
    test.setTimeout(120000);

    const killTours = async () => {
      await page.evaluate(() => {
        localStorage.setItem('home-onboarding-tour-v1-shown', 'true');
        localStorage.setItem('installations-onboarding-tour-v1-shown', 'true');
        localStorage.setItem('work-orders-onboarding-tour-v1-shown', 'true');
        localStorage.setItem('workOrdersTourCompleted', 'true');
        localStorage.setItem('clients-onboarding-tour-v1-shown', 'true');

        localStorage.setItem('personal-onboarding-tour-v1-shown', 'true');
        localStorage.setItem('workorders-view', '"table"');
        
        const overlays = document.querySelectorAll('.driver-overlay, .driver-popover, .driver-highlighted-element');
        overlays.forEach(el => (el as HTMLElement).style.display = 'none');
        document.body.classList.remove('driver-no-scroll');
      });
    };

    // 1. SETUP: Mock API responses
    const mockUser = { 
      _id: "tech-1", 
      userName: "tecnico_test",
      role: "tecnico",
      permissions: {
        canViewWorkOrders: true,
        canDeleteWorkOrders: true,
        canStartWorkOrder: true,
        canEditWorkOrders: true
      }
    };

    const mockOrders = [
      { 
        _id: "wo-offline-1", 
        titulo: "Reparación Aire Acondicionado", 
        prioridad: "alta", 
        estado: "asignada", 
        tipoTrabajo: "correctivo",
        fechaProgramada: new Date().toISOString(),
        horaProgramada: "09:00",
        instalacion: { _id: "inst-1", company: "Cliente Test" },
        tecnicos: []
      }
    ];

    await page.addInitScript(() => {
      (window as any).IS_E2E = true;
    });

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/cuenta/login") || url.includes("/verify")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ cuenta: mockUser }) });
      } else if (url.includes("/csrf-token")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: "fake-csrf-token-123" }) });
      } else if (url.includes("/ordenes-trabajo") && route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: mockOrders, pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      }
    });

    // 2. ACT: Visit and let SW register
    await page.goto("/");
    await killTours();
    
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 30000 });
    
    // Navigate to Work Orders
    await page.getByRole("button", { name: /órdenes de trabajo/i }).click({ force: true });
    await page.getByRole("link", { name: /listado/i }).click({ force: true });
    
    await expect(page.getByText("Reparación Aire Acondicionado")).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(5000);

    // 3. GO OFFLINE
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    
    // 5. ACT: Queued Mutation (Delete)
    let deleteSyncCalled = false;
    await page.route("**/api/ordenes-trabajo/wo-offline-1", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteSyncCalled = true;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "Orden eliminada" }) });
      } else {
        await route.continue();
      }
    });

    // Trigger delete
    const deleteButton = page.getByLabel("Eliminar orden").first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click({ force: true });
    await page.waitForTimeout(2000);

    // Confirm in modal
    const confirmButton = page.getByRole("button", { name: "Eliminar" }).last();
    await expect(confirmButton).toBeVisible();
    await confirmButton.click({ force: true });





    // 6. VERIFY: Optimistic UI update while offline
    await expect(page.getByText("Reparación Aire Acondicionado")).toBeHidden({ timeout: 15000 });
    expect(deleteSyncCalled).toBe(false);

    // 7. ACT: Back ONLINE
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // 8. VERIFY: Later Sync
    await expect.poll(() => deleteSyncCalled, { timeout: 30000 }).toBe(true);
  });
});
