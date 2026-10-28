import { expect, test, type Page } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

const ADMIN_USER = {
  _id: 'usr-admin-1',
  userName: 'admin@e2e.test',
  role: 'admin',
  tenantId: 'tenant-e2e',
  permissions: ['*'],
}

async function seedSession(page: Page) {
  await page.addInitScript(({ user }) => {
    ;(window as Window & { IS_E2E?: boolean }).IS_E2E = true
    localStorage.setItem('auth-storage', JSON.stringify({
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
    localStorage.setItem('i18nextLng', 'es')
  }, { user: ADMIN_USER })

  await page.route('**/api/billing/**', route => route.fulfill({
    json: { success: true, data: { accessMode: 'full', trial: null, tenant: null } },
  }))

  await page.route('**/api/verify', route => route.fulfill({
    json: { cuenta: ADMIN_USER },
  }))

  await page.route('**/socket.io/**', route => route.abort())
}

test.describe('Server-driven pagination across Clientes, Personal and Abonos', () => {
  test('Clientes: requests page and search from backend, navigates pages, and renders footer at bottom', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await seedSession(page)

    const clientRequests: string[] = []

    await page.route('**/api/clientes-usuarios**', route => {
      const url = new URL(route.request().url())
      clientRequests.push(url.search)
      const pageNum = Number(url.searchParams.get('page') || '1')
      const search = url.searchParams.get('search') || ''

      const total = search ? 1 : 25
      const totalPages = Math.ceil(total / 10)
      const clientName = search ? `Cliente Filtrado: ${search}` : `Cliente Página ${pageNum}`

      return route.fulfill({
        json: {
          success: true,
          data: [
            {
              _id: `cli-${pageNum}-1`,
              userName: clientName,
              name: 'Cliente',
              lastName: 'Prueba',
              createdAt: '2026-01-01T00:00:00.000Z',
              instalaciones: [],
            },
          ],
          pagination: {
            page: pageNum,
            limit: 10,
            total,
            totalPages,
          },
        },
      })
    })

    await page.route('**/api/installations**', route => route.fulfill({ json: [] }))

    await page.goto('/clientes')
    await expect(page.getByText('Cliente Página 1')).toBeVisible()

    // Assert initial request parameters
    expect(clientRequests[0]).toContain('page=1')
    expect(clientRequests[0]).toContain('limit=10')

    // Navigate to page 2
    const pagination = page.locator('nav[class*="_pagination_"]')
    await expect(pagination).toBeVisible()
    await pagination.getByRole('button', { name: 'Siguiente' }).click()

    await expect(page.getByText('Cliente Página 2')).toBeVisible()
    expect(clientRequests.some(q => q.includes('page=2'))).toBe(true)

    // Search triggers server search at page 1
    const searchInput = page.getByPlaceholder('Buscar por nombre de usuario...')
    await searchInput.fill('Alfa')
    await expect(page.getByText('Cliente Filtrado: Alfa')).toBeVisible()
    expect(clientRequests.some(q => q.includes('search=Alfa') && q.includes('page=1'))).toBe(true)

    // Layout check: pagination stays above or at page bottom without overlap
    const geometry = await page.evaluate(() => {
      const pag = document.querySelector('nav[class*="_pagination_"]')!.getBoundingClientRect()
      const main = document.querySelector('main')!.getBoundingClientRect()
      return { pagBottom: pag.bottom, mainBottom: main.bottom }
    })
    expect(geometry.pagBottom).toBeLessThanOrEqual(geometry.mainBottom + 2)
  })

  test('Personal: requests page and search from backend, navigates pages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await seedSession(page)

    const techRequests: string[] = []

    await page.route('**/api/cuentas/tecnicos**', route => {
      const url = new URL(route.request().url())
      techRequests.push(url.search)
      const pageNum = Number(url.searchParams.get('page') || '1')
      const search = url.searchParams.get('search') || ''

      const total = search ? 1 : 15
      const totalPages = Math.ceil(total / 10)
      const techName = search ? `Técnico ${search}` : `Técnico Página ${pageNum}`

      return route.fulfill({
        json: {
          success: true,
          message: 'Técnicos obtenidos exitosamente',
          data: [
            {
              _id: `tech-${pageNum}-1`,
              userName: techName,
              fullName: techName,
              email: 'tech@test.com',
              role: 'técnico',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          tecnicos: [
            {
              _id: `tech-${pageNum}-1`,
              userName: techName,
              fullName: techName,
              email: 'tech@test.com',
              role: 'técnico',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          pagination: {
            page: pageNum,
            limit: 10,
            total,
            totalPages,
          },
        },
      })
    })

    await page.goto('/personal')
    await expect(page.getByText('Técnico Página 1')).toBeVisible()

    expect(techRequests[0]).toContain('page=1')
    expect(techRequests[0]).toContain('limit=10')

    const pagination = page.locator('nav[class*="_pagination_"]')
    await expect(pagination).toBeVisible()
    await pagination.getByRole('button', { name: 'Siguiente' }).click()

    await expect(page.getByText('Técnico Página 2')).toBeVisible()
    expect(techRequests.some(q => q.includes('page=2'))).toBe(true)

    const searchInput = page.getByPlaceholder('Buscar por nombre de usuario...')
    await searchInput.fill('Carlos')
    await expect(page.getByText('Técnico Carlos')).toBeVisible()
    expect(techRequests.some(q => q.includes('search=Carlos') && q.includes('page=1'))).toBe(true)
  })

  test('Abonos (Maintenance Plan): queries installations in maintenancePlan mode with statusCounts', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await seedSession(page)

    const planRequests: string[] = []

    await page.route('**/api/config/subscriptions', route => route.fulfill({
      json: {
        success: true,
        data: {
          frequencies: [
            { id: 'monthly', value: 'mensual' },
            { id: 'quarterly', value: 'trimestral' },
            { id: 'semiannual', value: 'semestral' },
            { id: 'annual', value: 'anual' },
          ],
        },
      },
    }))

    await page.route('**/api/installations**', route => {
      const url = new URL(route.request().url())
      planRequests.push(url.search)
      const pageNum = Number(url.searchParams.get('page') || '1')
      const status = url.searchParams.get('maintenanceStatus') || ''

      const total = status ? 5 : 12
      const totalPages = Math.ceil(total / 5)

      return route.fulfill({
        json: {
          success: true,
          data: [
            {
              _id: `inst-${pageNum}-1`,
              company: `Empresa Abono P${pageNum}`,
              address: 'Av. Siempreviva 742',
              city: 'Springfield',
              province: 'Buenos Aires',
              installationType: 'industrial',
              frecuencia: 'Mensual',
              mesesFrecuencia: ['Enero', 'Febrero'],
              estado: status === 'inactive' ? 'Inactivo' : 'Activo',
            },
          ],
          statusCounts: {
            all: 12,
            active: 7,
            inactive: 5,
            pending: 0,
          },
          pagination: {
            page: pageNum,
            limit: 5,
            total,
            totalPages,
          },
        },
      })
    })

    await page.goto('/abonos-vigentes')
    await expect(page.getByText('Empresa Abono P1')).toBeVisible()

    // Assert maintenancePlan mode in query
    expect(planRequests[0]).toContain('maintenancePlan=true')
    expect(planRequests[0]).toContain('page=1')
    expect(planRequests[0]).toContain('limit=5')

    // Tab badges reflect statusCounts
    const main = page.locator('main')
    await expect(main.getByRole('button', { name: /Todas/ })).toContainText('12')
    await expect(main.getByRole('button', { name: /Activo/ })).toContainText('7')
    await expect(main.getByRole('button', { name: /Inactivo/ })).toContainText('5')

    // Navigate to next page while on "Todas" (total: 12, limit: 5 -> 3 pages)
    const pagination = page.locator('nav[class*="_pagination_"]')
    await expect(pagination).toBeVisible()
    await pagination.getByRole('button', { name: 'Siguiente' }).click()
    expect(planRequests.some(q => q.includes('page=2'))).toBe(true)

    // Switch to Inactivos tab
    await main.getByRole('button', { name: /Inactivo/ }).click()
    expect(planRequests.some(q => q.includes('maintenanceStatus=inactive') && q.includes('page=1'))).toBe(true)
  })
})
