import { expect, test, type Page } from "@playwright/test"

/**
 * Smoke E2E completo de la UI ("con ojos"):
 * - Login: validación, modal de error, modal de éxito + redirección
 * - Recorrido por TODAS las páginas del sidebar con datos mockeados,
 *   verificando heading, <title> y que no explote ningún JS (pageerror)
 * - Screenshots full-page de cada vista en e2e-artifacts/
 * - Modales de éxito y de error (clientes, proveedores)
 * - Sidebar navegable, 404, ruta protegida, logout con modal
 *
 * Todos los endpoints /api/** se mockean: no hay backend real.
 */

test.use({
  serviceWorkers: "block",
})

const ARTIFACTS = "e2e-artifacts"

// ---------------------------------------------------------------------------
// Fixtures de datos
// ---------------------------------------------------------------------------

const ADMIN_USER = {
  _id: "admin-smoke-e2e",
  userName: "admin-smoke-e2e",
  role: "admin",
  tenantId: "tenant-smoke-e2e",
  permissions: {
    canViewWorkOrders: true,
    canCompleteWorkOrder: true,
    canStartWorkOrder: true,
    canEditWorkOrders: true,
    canDeleteWorkOrders: false,
  },
}

const TECHNICIAN_USER = {
  ...ADMIN_USER,
  _id: "tech-smoke-e2e",
  userName: "tecnico.uno",
  role: "tecnico",
}

const installation = (id: string, company: string) => ({
  _id: id,
  company,
  address: `Calle Falsa 123`,
  city: "Springfield",
  province: "Buenos Aires",
  installationType: "industrial",
  estado: "active",
  devices: [],
})

const client = (id: string, userName: string) => ({
  _id: id,
  userName,
  nombre: `Cliente ${userName}`,
  role: "cliente",
  createdAt: "2026-01-10T10:00:00.000Z",
})

const supplier = (id: string, name: string) => ({
  _id: id,
  name,
  contactName: "Contacto",
  email: `contacto@${id}.com`,
  phone: "1122334455",
  address: "Av. Siempreviva 742",
  city: "Springfield",
  taxId: "30-12345678-9",
  active: true,
})

const asset = (id: string, name: string) => ({
  _id: id,
  nombre: name,
  marca: "ACME",
  modelo: "X-100",
  numeroSerie: `SN-${id}`,
  categoria: "bomba",
  estado: "active",
})

const manual = (id: string, name: string) => ({
  _id: id,
  nombre: name,
  descripcion: "Manual de operación y mantenimiento",
  version: "1.0",
  autor: "Leonix",
  tags: ["operacion"],
  categoria: "bomba",
})

const workOrder = (id: string, titulo: string) => ({
  _id: id,
  titulo,
  descripcion: "Mantenimiento programado",
  instalacionId: "inst-1",
  estado: "pendiente",
  prioridad: "media",
  tipoTrabajo: "preventivo",
  fechaProgramada: "2026-01-15",
  horaProgramada: "09:00",
})

const inventoryItem = (id: string, name: string) => ({
  _id: id,
  name,
  category: "Filtros",
  unit: "unidad",
  currentStock: 8,
  minimumStock: 1,
  location: "Taller",
})

const auditLog = {
  _id: "log-1",
  action: "WORK_ORDER_CREATED",
  userId: ADMIN_USER._id,
  userName: ADMIN_USER.userName,
  timestamp: "2026-01-14T10:00:00.000Z",
  details: "Orden de trabajo creada",
}

const tenant = (id: string, name: string) => ({
  _id: id,
  name,
  subdomain: name.toLowerCase().replace(/\s+/g, "-"),
  adminEmail: `admin@${id}.com`,
  status: "active",
  plan: "professional",
  createdAt: "2026-01-01T00:00:00.000Z",
})

// ---------------------------------------------------------------------------
// "Ojos": monitoreo de errores JS no capturados + screenshot
// ---------------------------------------------------------------------------

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("pageerror", (error) => {
    // Ignorar desconexiones de socket (no hay backend real en E2E)
    if (/socket|ECONNREFUSED|websocket/i.test(error.message)) return
    errors.push(error.message)
  })
  if (process.env.E2E_DEBUG_CONSOLE) {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") console.log("[BROWSER]", msg.type(), msg.text().slice(0, 160))
    })
  }
  return errors
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `${ARTIFACTS}/${name}.png`, fullPage: true })
}

// ---------------------------------------------------------------------------
// Seed de sesión + tours off + i18n ES
// ---------------------------------------------------------------------------

async function seedSession(page: Page, currentUser: typeof ADMIN_USER) {
  await page.addInitScript(({ user }) => {
    ;(window as Window & { IS_E2E?: boolean }).IS_E2E = true
    localStorage.setItem("auth-storage", JSON.stringify({
      state: {
        user: user.userName,
        userId: user._id,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions,
        isAuthenticated: true,
        isAuthResolved: true,
        logoutMessage: null,
      },
      version: 0,
    }))
    localStorage.setItem("i18nextLng", "es")
    for (const key of [
      "leonix-global-onboarding-v2-completed",
      "home-onboarding-tour-v1-shown",
      "inventory-onboarding-tour-v1-shown",
      "work-orders-onboarding-tour-v1-shown",
      "workOrdersTourCompleted",
      "settingsTourCompleted",
      "clients-tour-completed",
      "clientsTourCompleted",
      "suppliers-tour-completed",
      "suppliersTourCompleted",
    ]) localStorage.setItem(key, "true")
  }, { user: currentUser })
}

// ---------------------------------------------------------------------------
// Mocks de API
// ---------------------------------------------------------------------------

async function mockCommonApi(page: Page, currentUser: typeof ADMIN_USER = ADMIN_USER) {
  // Billing (requerido por el bootstrap de sesión con rol admin)
  await page.route("**/api/billing/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { accessMode: "full", trial: null, tenant: null } }),
  }))

  // /api/verify debe devolver el MISMO usuario que el seed, o el bootstrap
  // (hydrateSession) pisa el rol del store con ADMIN.
  await page.route("**/api/verify", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ cuenta: currentUser }),
  }))
  await page.route("**/api/csrf-token", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ token: "csrf-smoke-e2e" }),
  }))
  // Sin backend real: silenciar socket.io
  await page.route("**/socket.io**", (route) => route.abort())
}

async function mockApi(page: Page, currentUser: typeof ADMIN_USER = ADMIN_USER) {
  // Catch-all: se registra PRIMERO porque Playwright resuelve los handlers en orden inverso
  // (el último registrado gana). Así los mocks específicos registrados después lo pisan.
  await page.route("**/api/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }))

  await mockCommonApi(page, currentUser)

  // El scope esperado depende del rol (admin=tenant, técnico=assigned_work)
  const dashboardScope = currentUser.role === "tecnico" ? "assigned_work" : "tenant"
  await page.route("**/api/dashboard/stats**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
      metadata: { lastUpdate: "2026-01-14T12:00:00.000Z", range: "30d", scope: dashboardScope, fallbackApplied: false },
      kpis: {
        installations: 3, assets: 7, workOrders: 12, technicians: 2, openWorkOrders: 5,
        overdueWorkOrders: 2, criticalWorkOrders: 1, mttrHours: 4.5, mtbfHours: 90,
        preventiveComplianceRate: 82, slaRate: 91, responseTimeHours: 1.2,
      },
      operationalKpis: {
        openWorkOrders: 5, overdueWorkOrders: 2, criticalWorkOrders: 1, mttrHours: 4.5,
        mtbfHours: 90, preventiveComplianceRate: 82, slaRate: 91, responseTimeHours: 1.2,
      },
      kpisPrevious: {
        workOrders: 10, openWorkOrders: 4, overdueWorkOrders: 3, criticalWorkOrders: 2,
        mttrHours: 5.5, mtbfHours: 80, preventiveComplianceRate: 75, slaRate: 88,
        responseTimeHours: 1.5,
      },
      previousWindow: { range: "30d", start: "2025-12-15T12:00:00.000Z", end: "2026-01-14T12:00:00.000Z", available: true },
      charts: {
        byStatus: [{ name: "Pendiente", value: 3 }],
        byType: [],
        byPriority: [{ name: "critical", value: 1 }],
        preventiveVsCorrective: [],
        deviceHealth: [{ name: "active", value: 8 }, { name: "maintenance", value: 2 }],
        evolution: [{ name: "2026-01-14", created: 2, completed: 1 }],
      },
      recentWorkOrders: [{ _id: "wo-recent-1", titulo: "Revisar bomba", estado: "pendiente" }],
      topIncidentInstallations: [{ _id: "inst-1", name: "Planta Norte", count: 4 }],
      upcomingPreventive: [{ _id: "pm-1", installationName: "Planta Norte", fechaProgramada: "2026-01-30", titulo: "Inspección" }],
      },
    }),
  }))

  await page.route("**/api/installations**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [installation("inst-1", "Planta Norte"), installation("inst-2", "Planta Sur")],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    }),
  }))

  await page.route("**/api/clientes-usuarios**", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ _id: "cli-nuevo", userName: "cliente.nuevo", role: "cliente" }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([client("cli-1", "clienteuno"), client("cli-2", "clientedos")]),
    })
  })

  await page.route("**/api/proveedores**", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ _id: "sup-nuevo", name: "Proveedor Nuevo SA" }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ suppliers: [supplier("sup-1", "Proveedor Uno SA"), supplier("sup-2", "Proveedor Dos SA")] }),
    })
  })

  await page.route("**/api/activos**", (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes("/manuales") || url.pathname.includes("/plantilla") || url.pathname.includes("/stock")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        assets: [asset("asset-1", "Bomba centrífuga"), asset("asset-2", "Compresor A")],
        total: 2,
        totalPages: 1,
      }),
    })
  })

  await page.route("**/api/plantillas**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [{
        _id: "form-1",
        nombre: "Checklist bombas",
        categoria: "mantenimiento",
        descripcion: "Checklist de mantenimiento para bombas",
        activo: true,
        campos: [
          { type: "text", label: "Nombre" },
          { type: "number", label: "Presión" },
          { type: "checkbox", label: "OK" },
          { type: "date", label: "Fecha" },
        ],
      }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    }),
  }))

  await page.route("**/api/manuales**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [manual("man-1", "Manual bomba centrífuga"), manual("man-2", "Manual compresor")],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    }),
  }))

  await page.route("**/api/ordenes-trabajo**", (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith("/completar") || url.pathname.endsWith("/iniciar") || url.pathname.endsWith("/asignar") || url.pathname.endsWith("/estado")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { _id: "wo-1" } }) })
    }
    if (request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [workOrder("wo-1", "Cambio de filtros bomba"), workOrder("wo-2", "Revisión compresor")],
          pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
        }),
      })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: workOrder("wo-1", "Cambio de filtros bomba") }) })
  })

  await page.route("**/api/mis-ordenes-trabajo**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: [workOrder("wo-1", "Cambio de filtros bomba")],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    }),
  }))

  await page.route("**/api/cuentas/tecnicos**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ tecnicos: [TECHNICIAN_USER, { ...TECHNICIAN_USER, _id: "tech-2", userName: "tecnico.dos" }] }),
  }))

  await page.route("**/api/calendario**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [workOrder("wo-1", "Cambio de filtros bomba")] }),
  }))

  await page.route("**/api/inventario**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      items: [inventoryItem("inv-1", "Filtro aire"), inventoryItem("inv-2", "Filtro aceite")],
      total: 2,
      totalPages: 1,
    }),
  }))

  await page.route("**/api/audit-logs**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ logs: [auditLog] }),
  }))

  // Resumen de cumplimiento (shape exacto requerido por ComplianceDashboard)
  await page.route("**/api/cumplimiento/resumen**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      escaneoId: "scan-1",
      estado: "finalizado",
      totalResultados: 4,
      porEstado: { cumplido: 3, incumplido: 1, sin_evidencia: 0, error: 0 },
    }),
  }))

  await page.route("**/api/tenants**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([tenant("tenant-1", "Acme SA"), tenant("tenant-2", "Globex SA")]),
  }))

  await page.route("**/api/compliance/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ items: [], total: 0, page: 1, limit: 10, totalPages: 0, data: [] }),
  }))

  await page.route("**/api/escaneos-cumplimiento**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ items: [], total: 0, page: 1, limit: 10, totalPages: 0, data: [] }),
  }))

  for (const endpoint of ["categorias", "categorias-formularios", "installation-types", "subscriptions", "config/subscriptions"]) {
    await page.route(`**/api/${endpoint}**`, (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }))
  }

  await page.route("**/api/cuenta", (route) => {
    if (route.request().method() === "DELETE") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ cuenta: ADMIN_USER }),
    })
  })
}

// ---------------------------------------------------------------------------
// 1. Login (sin sesión)
// ---------------------------------------------------------------------------

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    // Sin sesión: /verify debe fallar para que el app muestre el login
    await mockApi(page)
    await page.route("**/api/verify", (route) => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Sesión no válida" } }),
    }))
  })

  test("validación: campos vacíos muestran errores sin llamar al backend", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible()
    await page.getByRole("button", { name: "Iniciar Sesión", exact: true }).click()

    await expect(page.getByText("El nombre de usuario es obligatorio")).toBeVisible()
    await expect(page.getByText("La contraseña es obligatoria")).toBeVisible()
    expect(errors).toEqual([])
  })

  test("credenciales inválidas muestran el modal de error", async ({ page }) => {
    const errors = watchErrors(page)
    await page.route("**/api/cuenta/login", (route) => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Usuario o contraseña incorrectos" }),
    }))

    await page.goto("/")
    await page.getByPlaceholder("Ingresa tu usuario").fill("usuario.inexistente")
    await page.getByPlaceholder("Ingresa tu contraseña").fill("wrong-password")
    await page.getByRole("button", { name: "Iniciar Sesión", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Error", exact: true })).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "login-error-modal")
    expect(errors).toEqual([])
  })

  test("login exitoso muestra modal de éxito y entra al panel", async ({ page }) => {
    const errors = watchErrors(page)
    await page.route("**/api/cuenta/login", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: ADMIN_USER,
        cuenta: ADMIN_USER,
        token: null,
        authenticated: true,
        accessMode: "full",
        csrfToken: "csrf-smoke-e2e",
      }),
    }))

    await page.goto("/")
    await page.getByPlaceholder("Ingresa tu usuario").fill(ADMIN_USER.userName)
    await page.getByPlaceholder("Ingresa tu contraseña").fill("valid-password")
    await page.getByRole("button", { name: "Iniciar Sesión", exact: true }).click()

    await expect(page.getByText("Inicio de sesión exitoso")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "login-success-modal")

    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await expect(page).toHaveURL(/inicio/)
    expect(errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 2. Recorrido por todas las páginas (autenticado como admin)
// ---------------------------------------------------------------------------

test.describe("Páginas del panel (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, ADMIN_USER)
    await mockApi(page)
  })

  test("Inicio: KPIs del dashboard renderizan sin errores", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/inicio")
    await expect(page.getByRole("heading", { name: "Control operativo" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Revisar bomba")).toBeVisible()
    await screenshot(page, "01-inicio")
    expect(errors).toEqual([])
  })

  test("Órdenes de trabajo: lista con datos mockeados", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/ordenes-trabajo")
    await expect(page.getByRole("heading", { name: "Órdenes de trabajo" })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Órdenes de Trabajo | Leonix")
    await expect(page.getByText("Cambio de filtros bomba").first()).toBeVisible()
    await screenshot(page, "02-ordenes-trabajo")
    expect(errors).toEqual([])
  })

  test("Calendario renderiza", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/calendario")
    await expect(page.getByRole("heading", { name: "Calendario" })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Calendario | Leonix")
    await screenshot(page, "03-calendario")
    expect(errors).toEqual([])
  })

  test("Instalaciones: lista con búsqueda", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/instalaciones")
    await expect(page.getByRole("heading", { name: "Instalaciones" })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Instalaciones | Leonix")
    await expect(page.getByText("Planta Norte").first()).toBeVisible()
    // El buscador acepta texto sin romperse
    await page.getByPlaceholder(/Buscar por nombre, dirección/).fill("Planta")
    await screenshot(page, "04-instalaciones")
    expect(errors).toEqual([])
  })

  test("Clientes: lista con datos y botón de crear", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/clientes")
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Clientes | Leonix")
    await expect(page.getByText("clienteuno").first()).toBeVisible()
    await screenshot(page, "05-clientes")
    expect(errors).toEqual([])
  })

  test("Activos: lista con datos", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/activos")
    await expect(page.getByRole("heading", { name: "Activos" })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Activos | Leonix")
    await expect(page.getByText("Bomba centrífuga").first()).toBeVisible()
    await screenshot(page, "06-activos")
    expect(errors).toEqual([])
  })

  test("Formularios: plantillas listadas", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/formularios")
    await expect(page.getByRole("heading", { name: "Plantillas de Formularios" })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Formularios | Leonix")
    await expect(page.getByText("Checklist bombas").first()).toBeVisible()
    await screenshot(page, "07-formularios")
    expect(errors).toEqual([])
  })

  test("Formularios: plantilla sin campos no crashea la página (pin del fix de Forms.tsx)", async ({ page }) => {
    // Regresión: Forms.tsx hacia template.campos.slice() sin defensa y la página
    // entera crasheaba cuando el backend devolvía una plantilla sin 'campos'.
    const errors = watchErrors(page)
    await page.route("**/api/plantillas**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          { _id: "form-sin-campos", nombre: "Plantilla incompleta", categoria: "varios", activo: true },
          { _id: "form-campos-null", nombre: "Plantilla campos null", categoria: "varios", activo: true, campos: null },
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      }),
    }))

    await page.goto("/formularios")
    await expect(page.getByText("Plantilla incompleta").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Plantilla campos null").first()).toBeVisible()
    await expect(page.getByText("Unexpected Application Error")).toHaveCount(0)
    await screenshot(page, "07b-formularios-sin-campos")
    expect(errors).toEqual([])
  })

  test("Manuales: lista con datos", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/manuales")
    await expect(page.getByRole("heading", { name: "Manuales" })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Manuales | Leonix")
    await expect(page.getByText("Manual bomba centrífuga").first()).toBeVisible()
    await screenshot(page, "08-manuales")
    expect(errors).toEqual([])
  })

  test("Inventario: lista con datos", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/inventario")
    await expect(page.getByRole("heading", { name: "Inventario" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Filtro aire").first()).toBeVisible()
    await screenshot(page, "09-inventario")
    expect(errors).toEqual([])
  })

  test("Personal: técnicos listados", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/personal")
    await expect(page.getByRole("heading", { name: "Técnicos", exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Personal | Leonix")
    await expect(page.getByText("tecnico.uno").first()).toBeVisible()
    await screenshot(page, "10-personal")
    expect(errors).toEqual([])
  })

  test("Proveedores: lista con datos y botón de crear", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/proveedores")
    await expect(page.getByRole("heading", { name: "Proveedores" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("Proveedor Uno SA").first()).toBeVisible()
    await screenshot(page, "11-proveedores")
    expect(errors).toEqual([])
  })

  test("Configuración renderiza sin tour", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/configuracion")
    await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveTitle("Configuración | Leonix")
    await screenshot(page, "12-configuracion")
    expect(errors).toEqual([])
  })

  test("Cumplimiento normativo renderiza", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/cumplimiento")
    await expect(page.getByRole("heading", { name: "Cumplimiento Normativo" })).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "13-cumplimiento")
    expect(errors).toEqual([])
  })

  test("Auditoría: registro de actividad", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/auditoria")
    await expect(page.getByRole("heading", { name: "Registro de Actividad" })).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "14-auditoria")
    expect(errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 3. Modales funcionales (éxito y error)
// ---------------------------------------------------------------------------

test.describe("Modales de éxito y error", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, ADMIN_USER)
    await mockApi(page)
  })

  test("Clientes: registrar cliente muestra modal de éxito", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/clientes")
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible({ timeout: 15_000 })

    await page.getByRole("button", { name: "Agregar cliente" }).click()
    await expect(page.getByRole("heading", { name: "Registrar Nuevo Cliente" })).toBeVisible()
    await screenshot(page, "modal-cliente-registro")

    await page.locator('#username').fill('cliente_nuevo')
    await page.locator('#password').fill('secreto123')
    await page.locator('#confirmPassword').fill('secreto123')

    await page.getByRole("button", { name: "Crear Cliente" }).click()
    await expect(page.getByText("¡Operación exitosa!").first()).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "modal-cliente-exito")
    expect(errors).toEqual([])
  })

  test("Clientes: error del backend muestra el modal de error", async ({ page }) => {
    const errors = watchErrors(page)
    await page.route("**/api/clientes-usuarios", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "El usuario ya existe" } }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([client("cli-1", "clienteuno")]),
      })
    })
    // El servicio hace fallback a cuenta/cliente ante VALIDATION_ERROR; también debe fallar
    await page.route("**/api/cuenta/cliente", (route) => route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "El usuario ya existe" } }),
    }))

    await page.goto("/clientes")
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible({ timeout: 15_000 })

    await page.getByRole("button", { name: "Agregar cliente" }).click()
    await page.locator("#username").fill("cliente_duplicado")
    await page.locator("#password").fill("secreto123")
    await page.locator("#confirmPassword").fill("secreto123")
    await page.getByRole("button", { name: "Crear Cliente" }).click()

    await expect(page.getByRole("heading", { name: "Error", exact: true })).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "modal-cliente-error")
    expect(errors).toEqual([])
  })

  test("Proveedores: agregar proveedor muestra modal de éxito", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/proveedores")
    await expect(page.getByRole("heading", { name: "Proveedores" })).toBeVisible({ timeout: 15_000 })

    await page.getByRole("button", { name: "Agregar Proveedor" }).click()
    await expect(page.getByRole("heading", { name: "Agregar Proveedor" }).last()).toBeVisible()
    await screenshot(page, "modal-proveedor-registro")

    await page.locator("#name").fill("Proveedor Nuevo SA")
    await page.locator("#email").fill("nuevo@proveedor.com")
    await page.getByRole("button", { name: "Guardar" }).click()

    await expect(page.getByText("Proveedor agregado correctamente")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "modal-proveedor-exito")
    expect(errors).toEqual([])
  })

  test("Clientes: editar cliente muestra modal de éxito", async ({ page }) => {
    const errors = watchErrors(page)
    let putReceived = false
    await page.route("**/api/clientes-usuarios/cli-1", (route) => {
      if (route.request().method() === "PUT") {
        putReceived = true
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ _id: "cli-1", userName: "clienteuno.editado", role: "cliente" }),
        })
      }
      return route.fallback()
    })

    await page.goto("/clientes")
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible({ timeout: 15_000 })

    await page.locator('[title="Editar cliente"]').first().click()
    await expect(page.getByRole("heading", { name: "Editar cliente" })).toBeVisible()
    await screenshot(page, "modal-cliente-editar")

    await page.locator("#password").fill("nuevaPass123")
    await page.locator("#confirmPassword").fill("nuevaPass123")
    await page.getByRole("button", { name: "Actualizar" }).click()

    await expect(page.getByText("Cliente actualizado exitosamente")).toBeVisible({ timeout: 15_000 })
    expect(putReceived).toBe(true)
    await screenshot(page, "modal-cliente-editar-exito")
    expect(errors).toEqual([])
  })

  test("Clientes: eliminar cliente con confirmación muestra modal de éxito", async ({ page }) => {
    const errors = watchErrors(page)
    let deleteReceived = false
    await page.route("**/api/clientes-usuarios/cli-1", (route) => {
      if (route.request().method() === "DELETE") {
        deleteReceived = true
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        })
      }
      return route.fallback()
    })

    await page.goto("/clientes")
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible({ timeout: 15_000 })

    await page.locator('[title="Eliminar"]').first().click()
    await expect(page.getByRole("heading", { name: "¿Eliminar cliente?" })).toBeVisible()
    await screenshot(page, "modal-cliente-eliminar-confirm")

    await page.getByRole("button", { name: "Eliminar", exact: true }).click()

    await expect(page.getByText("Cliente eliminado con éxito")).toBeVisible({ timeout: 15_000 })
    expect(deleteReceived).toBe(true)
    await screenshot(page, "modal-cliente-eliminar-exito")
    expect(errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 4. Navegación, guards y logout
// ---------------------------------------------------------------------------

test.describe("Navegación y guards", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, ADMIN_USER)
    await mockApi(page)
  })

  test("el sidebar navega entre secciones", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/inicio")
    await expect(page.getByRole("heading", { name: "Control operativo" })).toBeVisible({ timeout: 15_000 })

    // Grupo "Operación" -> sub-item Proveedores
    await page.getByRole("button", { name: "Operación" }).click()
    await page.getByRole("link", { name: "Proveedores" }).first().click()
    await expect(page).toHaveURL(/proveedores/)
    await expect(page.getByText("Proveedor Uno SA").first()).toBeVisible()

    // Grupo desplegable -> sub-item
    await page.getByText("Órdenes de trabajo", { exact: true }).first().click()
    await page.getByRole("link", { name: "Listado" }).first().click()
    await expect(page).toHaveURL(/ordenes-trabajo/)
    expect(errors).toEqual([])
  })

  test("ruta inexistente muestra la página 404", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/esta-ruta-no-existe")
    await expect(page.getByText("Página no encontrada")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "404")
    expect(errors).toEqual([])
  })

  test("logout cierra sesión y muestra el modal de sesión cerrada", async ({ page }) => {
    // Pin del fix de StrictMode: el modal debe aparecer tras logout (antes el
    // useEffect de Login limpiaba logoutMessage antes del segundo mount).
    const errors = watchErrors(page)
    await page.goto("/inicio")
    await expect(page.getByRole("heading", { name: "Control operativo" })).toBeVisible({ timeout: 15_000 })

    await page.locator('[title="Cerrar Sesión"]').first().click()
    await expect(page.getByText("Sesión cerrada exitosamente")).toBeVisible({ timeout: 15_000 })
    await screenshot(page, "logout-modal")

    // Cerrar el modal lleva al login
    await page.getByRole("button", { name: "Continuar", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible({ timeout: 15_000 })
    expect(errors).toEqual([])
  })
})

test.describe("Rutas protegidas (sin sesión)", () => {
  test("redirige al login cuando no hay sesión", async ({ page }) => {
    await mockApi(page)
    await page.route("**/api/verify", (route) => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Sesión no válida" } }),
    }))
    await page.goto("/inicio")
    await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible({ timeout: 15_000 })
  })
})

// ---------------------------------------------------------------------------
// 5. Rol técnico: restricciones de sidebar y guards de sección
// ---------------------------------------------------------------------------

test.describe("Rol técnico (restricciones)", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, TECHNICIAN_USER)
    await mockApi(page, TECHNICIAN_USER)
  })

  test("el sidebar del técnico oculta secciones administrativas", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/inicio")
    // El dashboard del técnico usa otro scope y otro heading
    await expect(page.getByRole("heading", { name: "Mi jornada operativa" })).toBeVisible({ timeout: 15_000 })

    // Restringidas para técnico: activos, formularios, personal, clientes, proveedores, auditoría, configuración
    await expect(page.getByRole("link", { name: "Configuración" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Activos", exact: true })).toHaveCount(0)
    await screenshot(page, "tecnico-sidebar")
    expect(errors).toEqual([])
  })

  test("acceso directo a /clientes redirige al inicio", async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto("/clientes")
    await expect(page.getByRole("heading", { name: "Mi jornada operativa" })).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/inicio/)
    await screenshot(page, "tecnico-guard-clientes")
    expect(errors).toEqual([])
  })
})
